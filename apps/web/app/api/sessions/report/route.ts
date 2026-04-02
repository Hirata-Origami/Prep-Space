import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

const REPORT_PROMPT = `You are an expert technical interview evaluator. Analyze this interview transcript and generate a detailed performance report as valid JSON.

Return ONLY valid JSON with this exact shape:
{
  "overall_score": number (0-100),
  "recommendation": "Strong Hire" | "Hire" | "Borderline" | "No Hire",
  "summary": "string — 2-3 sentence executive summary",
  "scores": {
    "technical_depth": number,
    "communication": number,
    "problem_solving": number,
    "conciseness": number,
    "confidence": number
  },
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"],
  "sample_answers": [
    {
      "question": "string",
      "user_answer": "string (excerpt)",
      "ideal_answer": "string",
      "score": number
    }
  ],
  "next_focus_areas": ["string", "string"],
  "audio_markers": [
    {
      "start_time": "string (e.g. '01:23')",
      "end_time": "string",
      "type": "strong" | "partial" | "missed",
      "annotation": "string"
    }
  ],
  "metrics": {
    "wpm": number,
    "filler_words_count": number
  },
  "session_pacing": "string — e.g. 'Session ended too quickly — candidate may not have given complete answers' or 'Optimal pacing' or 'Session ran long — evaluate time management'"
}`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { session_id, transcript, role, interview_type, audio_url, session_time, tab_switches, cheating_flags } = body;

  if (!session_id || !transcript) {
    return NextResponse.json({ error: 'session_id and transcript are required' }, { status: 400 });
  }

  // Get user's Gemini key
  const { data: profiles } = await supabase
    .from('users')
    .select('gemini_api_key')
    .eq('supabase_uid', user.id);
    
  const profile = profiles?.[0];

  let model;
  try {
    model = getModel(profile?.gemini_api_key, 'FLASH_LITE');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No Gemini API key';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const durationInMins = session_time ? (session_time / 60).toFixed(1) : undefined;
  
  const pacingContext = durationInMins 
    ? `\nThe interview lasted for ${durationInMins} minutes. Evaluate if this was too short (< 5 min), optimal (10-25 min), or too long (> 30 min) and reflect this in your summary and session_pacing.`
    : '';

  const prompt = `Role: ${role || 'General'}\nInterview Type: ${interview_type || 'General'}${pacingContext}\n\n--- TRANSCRIPT ---\n${transcript}\n--- END TRANSCRIPT ---\n\nGenerate a detailed evaluation report.`;

  try {
    const result = await withRetry(() => model.generateContent([
      { text: REPORT_PROMPT },
      { text: prompt },
    ]));

    const text = result.response.text();
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const reportData = JSON.parse(jsonStr);

    // Fetch integer ID for foreign keys
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', user.id)
      .single();
      
    if (!dbUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    // Proctoring deductions
    let finalScore = reportData.overall_score;
    let finalRecommendation = reportData.recommendation;

    if (tab_switches && typeof tab_switches === 'number' && tab_switches > 0) {
      // Deduct 5 points per tab switch, up to 30 points
      const deduction = Math.min(tab_switches * 5, 30);
      finalScore = Math.max(0, finalScore - deduction);
      
      // Auto downgrade recommendation if high cheating
      if (tab_switches >= 3 && finalRecommendation !== 'No Hire') {
        finalRecommendation = finalRecommendation === 'Strong Hire' ? 'Hire' : 'No Hire';
      }
      
      reportData.proctoring_flags = {
        tab_switches,
        cheating_flags: cheating_flags || [],
        penalty_applied: deduction
      };
      reportData.summary += ` [Penalty: ${deduction} points deducted due to ${tab_switches} tab switches detected]`;
    }

    // Save report to Supabase
    let insertData: any = {
      session_id,
      user_id: dbUser.id,
      overall_score: finalScore,
      hire_recommendation: finalRecommendation,
      duration_seconds: session_time || null,
      analysis: {
        ...reportData,
        audio_url: audio_url || null
      },
    };

    let { data: savedReportData, error: saveError } = await supabase
      .from('interview_reports')
      .insert(insertData)
      .select();

    // If the 'analysis' column is missing, try inserting without it
    if (saveError && (saveError as any).code === 'PGRST204') {
      console.warn("[POST /api/sessions/report] 'analysis' column missing, retrying without it...");
      delete insertData.analysis;
      const secondAttempt = await supabase
        .from('interview_reports')
        .insert(insertData)
        .select();
      savedReportData = secondAttempt.data;
      saveError = secondAttempt.error;
    }

    if (saveError) {
      console.error("[POST /api/sessions/report] Supabase error:", saveError);
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    const report = savedReportData?.[0];

    // Update session state
    await supabase
      .from('interview_sessions')
      .update({
        state: 'COMPLETE',
      })
      .eq('id', session_id);

    // Award XP to user safely
    try {
      await supabase.rpc('increment_xp', { user_id: dbUser.id, amount: 50 });
    } catch (xpErr) {
      console.warn("[POST /api/sessions/report] Failed to increment XP", xpErr);
    }

    // Invalidate sessions list cache
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        await redis.del(`api_sessions_${dbUser.id}`);
        console.log(`[POST /api/sessions/report] Invalidated sessions cache for user ${dbUser.id}`);
      }
    } catch (redisErr) {
      console.warn("[POST /api/sessions/report] Redis invalidation failed:", redisErr);
    }

    return NextResponse.json({ report });
  } catch (e: unknown) {
    console.error('Report generation error:', e);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}


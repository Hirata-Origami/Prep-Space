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
  "next_focus_areas": ["string", "string"]
}`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { session_id, transcript, role, interview_type } = body;

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

  const prompt = `Role: ${role || 'General'}\nInterview Type: ${interview_type || 'General'}\n\n--- TRANSCRIPT ---\n${transcript}\n--- END TRANSCRIPT ---\n\nGenerate a detailed evaluation report.`;

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

    // Save report to Supabase
    const { data: savedReportData, error: saveError } = await supabase
      .from('reports')
      .insert({
        session_id,
        user_id: dbUser.id,
        overall_score: reportData.overall_score,
        recommendation: reportData.recommendation,
        analysis: reportData,
      })
      .select();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    const report = savedReportData?.[0];

    // Update session state + score
    await supabase
      .from('interview_sessions')
      .update({
        state: 'COMPLETE',
        overall_score: reportData.overall_score,
      })
      .eq('id', session_id);

    // Award XP to user
    await supabase.rpc('increment_xp', { user_id: dbUser.id, amount: 50 });

    return NextResponse.json({ report });
  } catch (e: unknown) {
    console.error('Report generation error:', e);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}


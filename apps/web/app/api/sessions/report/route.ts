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
    const msg = e instanceof Error ? (e instanceof Error ? e.message : "Unknown error") : 'No Gemini API key';
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
    const insertData: Record<string, unknown> = {
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
    if (saveError && (saveError as { code?: string }).code === 'PGRST204') {
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

    // 5. Send automated report email via SMTP
    if (report && user.email) {
      try {
        const { sendEmail } = await import('@/lib/email');
        const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reports/${report.id}`;
        
        await sendEmail({
          to: user.email,
          subject: `Interview Report Ready: ${role || 'Assessment'}`,
          html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7f9fc; border-radius: 16px; overflow: hidden; border: 1px solid #e1e3e5;">
              <div style="background-color: #ffffff; padding: 40px 32px; text-align: center; border-bottom: 1px solid #e1e3e5;">
                <h1 style="color: #080C14; font-size: 24px; font-weight: 700; margin: 0;">You finished! 🎉</h1>
                <p style="color: #4A5568; font-size: 16px; margin-top: 12px; margin-bottom: 0;">We've prepared your comprehensive feedback report.</p>
              </div>

              <div style="padding: 40px 32px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="font-size: 13px; color: #6B7A99; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 8px;">Overall Performance</div>
                  <div style="font-size: 56px; font-weight: 800; color: #4DFFA0; line-height: 1;">${finalScore}<span style="font-size: 24px;">%</span></div>
                  <div style="font-size: 16px; font-weight: 600; color: #080C14; margin-top: 12px; background-color: #f7f9fc; display: inline-block; padding: 6px 16px; border-radius: 100px;">Recommendation: ${finalRecommendation}</div>
                </div>

                <div style="border-top: 1px solid #e1e3e5; padding-top: 32px; margin-bottom: 40px;">
                  <h3 style="color: #080C14; font-size: 18px; margin: 0 0 16px 0;">Executive Summary</h3>
                  <p style="color: #4A5568; line-height: 1.6; margin: 0; font-size: 15px;">${reportData.summary}</p>
                </div>

                <div style="text-align: center;">
                  <a href="${reportUrl}" 
                     style="display: inline-block; background-color: #080C14; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    View Detailed Feedback
                  </a>
                </div>
              </div>

              <div style="background-color: #f7f9fc; padding: 24px 32px; text-align: center; border-top: 1px solid #e1e3e5;">
                <p style="color: #6B7A99; font-size: 13px; margin: 0;">We're rooting for you!<br/><strong>PrepSpace Team</strong></p>
              </div>
            </div>
          `
        });
        console.log(`[POST /api/sessions/report] Automated report email sent to ${user.email}`);
      } catch (emailErr) {
        console.error("[POST /api/sessions/report] Failed to send report email:", emailErr);
      }
    }

    return NextResponse.json({ report });
  } catch (e: unknown) {
    console.error('Report generation error:', e);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}


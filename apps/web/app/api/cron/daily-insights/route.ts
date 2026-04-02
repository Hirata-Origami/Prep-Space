import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  // Simple cron auth to prevent direct malicious hits if exposed
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Unauthorized cron hit");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role for cron jobs to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Generate the Daily AI Tip using a general system prompt
    // Since this is a system cron, we use a default api key or the service owner key.
    // In this app, users provide their own keys, but for global crons, we need a service level key.
    // Assuming the user running this has their key in NEXT_PUBLIC_GEMINI_API_KEY or we just use one from an admin user.
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No AI key available for system cron' }, { status: 500 });
    }

    const model = getModel(process.env.GEMINI_API_KEY, 'FLASH_LITE');
    const prompt = `You are an expert tech recruiter and engineering manager. Write exactly one highly engaging, bite-sized "Interview Tip of the Day" and one "Company Spotlight" (focusing on their interview culture).
    
    Format the output strictly as a JSON object:
    {
      "tip_title": "String",
      "tip_content": "String (1 paragraph)",
      "company_name": "String",
      "company_insight": "String (1 paragraph)",
      "quote": "Short motivational quote"
    }`;

    const aiRes = await model.generateContent(prompt);
    const resultText = aiRes.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const insights = JSON.parse(resultText);

    // 2. Fetch Active Users (who have logged in or done a session recently)
    // For now we will fetch all users who have an email to keep it simple and fulfill the requirement.
    // In production, we'd chunk this or use Resend audiences.
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('email, full_name')
      .not('email', 'is', null)
      .limit(50); // Keep batch size small for free tier
      
    if (usersErr) throw new Error(usersErr.message);

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' });
    }

    // 3. Compile HTML
    const getHtml = (name: string) => `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #080C14; color: #F0F4FF; padding: 32px; border-radius: 16px; border: 1px solid rgba(77,255,160,0.2);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #4DFFA0; margin: 0; font-size: 24px;">PrepSpace Daily Insights</h1>
          <p style="color: #6B7A99; font-size: 14px; margin-top: 8px;">Your edge in tech interviews</p>
        </div>

        <p style="font-size: 16px; color: #B8C4E0;">Hello ${name},</p>
        
        <div style="background: rgba(123,97,255,0.1); border-left: 4px solid #7B61FF; padding: 20px; border-radius: 4px; margin: 24px 0;">
          <h3 style="color: #7B61FF; margin-top: 0;">💡 ${insights.tip_title}</h3>
          <p style="margin-bottom: 0; line-height: 1.6;">${insights.tip_content}</p>
        </div>

        <div style="background: rgba(77,255,160,0.05); border: 1px solid rgba(77,255,160,0.2); padding: 20px; border-radius: 12px; margin: 24px 0;">
          <h3 style="color: #4DFFA0; margin-top: 0; display: flex; align-items: center; gap: 8px;">
            🏢 Spotlight: ${insights.company_name}
          </h3>
          <p style="margin-bottom: 0; line-height: 1.6; color: #B8C4E0;">${insights.company_insight}</p>
        </div>

        <div style="text-align: center; margin: 32px 0; font-style: italic; color: #FFB547;">
          "${insights.quote}"
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://prep-space.vercel.app'}/dashboard" style="background: #4DFFA0; color: #080C14; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Start a Practice Session
          </a>
        </div>
      </div>
    `;

    // 4. Batch Send via Resend
    // Resend allows batch sending max 100 at a time
    const emailBatch = users.map(u => ({
      from: 'PrepSpace Insights <noreply@prepspace.io>',
      to: u.email,
      subject: `PrepSpace: ${insights.tip_title}`,
      html: getHtml(u.full_name || 'Candidate')
    }));

    await resend.batch.send(emailBatch);

    return NextResponse.json({ success: true, sent_count: emailBatch.length });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const rawText = aiRes.response.text();
    // Robust extraction of JSON from markdown blocks if they exist
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const resultText = jsonMatch ? jsonMatch[0] : rawText.trim();
    const insights = JSON.parse(resultText);

    // 2. Fetch Active Users (who have logged in or done a session recently)
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('test_email');

    let users;
    if (testEmail) {
      users = [{ email: testEmail, full_name: 'Test Admin' }];
    } else {
      const { data, error: usersErr } = await supabase
        .from('users')
        .select('email, full_name')
        .not('email', 'is', null)
        .limit(50);
      if (usersErr) throw new Error(usersErr.message);
      users = data;
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' });
    }

    // 3. Compile HTML
    const getHtml = (name: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: #05070A; font-family: 'Inter', -apple-system, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #080C14; border: 1px solid rgba(77,255,160,0.15); border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px;">
          <!-- Header -->
          <div style="padding: 40px 32px; text-align: center; background: linear-gradient(135deg, rgba(77,255,160,0.1) 0%, rgba(123,97,255,0.1) 100%);">
            <div style="font-size: 12px; font-weight: 800; color: #4DFFA0; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 12px;">Exclusive Daily Insight</div>
            <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">PrepSpace Intelligence</h1>
          </div>

          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #B8C4E0; margin-bottom: 32px;">Hello ${name},</p>
            
            <!-- Tip Section -->
            <div style="background: rgba(123,97,255,0.08); border-left: 4px solid #7B61FF; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
              <h3 style="color: #7B61FF; margin: 0 0 12px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                💡 ${insights.tip_title}
              </h3>
              <p style="margin: 0; line-height: 1.7; color: #F0F4FF; font-size: 15px;">${insights.tip_content}</p>
            </div>

            <!-- Company Section -->
            <div style="background: rgba(77,255,160,0.05); border: 1px solid rgba(77,255,160,0.15); padding: 24px; border-radius: 12px; margin-bottom: 32px;">
              <h3 style="color: #4DFFA0; margin: 0 0 12px 0; font-size: 18px;">🏢 Spotlight: ${insights.company_name}</h3>
              <p style="margin: 0; line-height: 1.7; color: #D1D9E6; font-size: 14px;">${insights.company_insight}</p>
            </div>

            <!-- Quote -->
            <div style="text-align: center; margin: 40px 0; padding: 24px; border-top: 1px solid rgba(255,181,71,0.1);">
              <div style="font-size: 32px; color: rgba(255,181,71,0.3); margin-bottom: 8px;">&ldquo;</div>
              <div style="font-style: italic; color: #FFB547; font-size: 17px; line-height: 1.6;">${insights.quote}</div>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin-top: 48px;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://prep-space.vercel.app'}/dashboard" 
                 style="background: #4DFFA0; color: #080C14; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; transition: transform 0.2s;">
                Open My Dashboard
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 32px; background: rgba(0,0,0,0.2); text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
            <p style="color: #6B7A99; font-size: 12px; margin: 0;">&copy; 2026 PrepSpace Intelligence. All rights reserved.</p>
            <p style="color: #6B7A99; font-size: 11px; margin-top: 8px;">You are receiving this because you are an active candidate on our platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Batch Send via Resend
    // Resend allows batch sending max 100 at a time
    const emailBatch = users.map(u => ({
      from: 'PrepSpace <onboarding@resend.dev>',
      to: [u.email],
      subject: `PrepSpace: ${insights.tip_title}`,
      html: getHtml(u.full_name || 'Candidate')
    }));

    const { data, error: sendError } = await resend.batch.send(emailBatch);
    
    if (sendError) {
      console.error('[Resend Batch Error]:', sendError);
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    console.log('[Resend Batch Success]:', data);

    return NextResponse.json({ success: true, sent_count: emailBatch.length });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

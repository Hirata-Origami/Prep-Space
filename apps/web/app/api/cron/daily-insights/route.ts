import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { dailyInsightEmail } from '@/lib/email/messages';
import { getModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Simple cron auth to prevent direct malicious hits if exposed
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No AI key available for system cron' }, { status: 500 });
    }

    const model = getModel(process.env.GEMINI_API_KEY, 'FLASH_LITE');
    const prompt = `You are an expert, empathetic technical career coach. Write exactly one highly engaging, bite-sized "Interview Tip of the Day" and one "Company Spotlight" (focusing on their interview culture).
    IMPORTANT: Write in a warm, sweet, and highly professional human tone. Do NOT use cliches, robotic phrasing, or corporate jargon (e.g., avoid "in today's fast-paced world", "navigating the complexities", "delve into"). Use friendly, concise, and uplifting language.
    
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

    // 2. Fetch users who have not turned email off (the column exists after migration 005)
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('test_email');

    let users: { email: string; full_name: string | null }[] | null;
    if (testEmail) {
      users = [{ email: testEmail, full_name: 'Test' }];
    } else {
      let res = await supabase.from('users').select('email, full_name').not('email', 'is', null).neq('email_updates', false).limit(500);
      if (res.error && /email_updates/.test(res.error.message)) {
        res = await supabase.from('users').select('email, full_name').not('email', 'is', null).limit(500);
      }
      if (res.error) throw new Error(res.error.message);
      users = res.data;
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' });
    }

    // 3. Send
    let sentCount = 0;
    for (const u of users) {
      try {
        const mail = dailyInsightEmail({
          name: u.full_name,
          tipTitle: String(insights.tip_title ?? 'Interview tip'),
          tipContent: String(insights.tip_content ?? ''),
          companyName: String(insights.company_name ?? 'Company spotlight'),
          companyInsight: String(insights.company_insight ?? ''),
          quote: String(insights.quote ?? ''),
        });
        await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text });
        sentCount++;
      } catch (err: unknown) {
        console.error(`Failed to send email to ${u.email}:`, err);
      }
    }

    return NextResponse.json({ success: true, sent_count: sentCount });
  } catch (error: unknown) {
    const msg = error instanceof Error ? (error instanceof Error ? error.message : "Unknown error") : 'Unknown cron error';
    console.error('Cron Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

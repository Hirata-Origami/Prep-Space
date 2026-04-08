import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, text, emails, pipeline_id, pipeline_role } = body;

  if (action === 'parse') {
    // 1. Natural language parse (e.g. "22pw01@... to 22pw40@...")
    if (!text) return NextResponse.json({ error: 'Text or data required' }, { status: 400 });

    try {
      const model = getModel(dbUser.gemini_api_key, 'FLASH');
      const prompt = `Extract or generate ALL email addresses from the following text. 
If it's a range like "user01@domain.com to user10@domain.com", generate the full list from 01 to 10.
Return ONLY a valid JSON array of strings containing the email addresses, and absolutely nothing else.

TEXT:
${text}`;

      const result = await withRetry(() => model.generateContent(prompt));
      const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
      const parsedEmails = JSON.parse(responseText);

      if (!Array.isArray(parsedEmails)) throw new Error('Not an array');

      return NextResponse.json({ emails: parsedEmails });
    } catch (e: unknown) {
      console.error('Email parse error:', e);
      return NextResponse.json({ error: 'Failed to parse emails from text: ' + (e instanceof Error ? e.message : "Unknown error") }, { status: 500 });
    }
  } else if (action === 'send') {
    // 2. Send Invites
    if (!emails || !Array.isArray(emails) || emails.length === 0 || !pipeline_id) {
      return NextResponse.json({ error: 'Emails array and pipeline_id are required' }, { status: 400 });
    }

    try {
      // Create candidates in DB
      const candidatesToInsert = emails.map(email => ({
        pipeline_id,
        email,
        stage: 'invited',
      }));

      const { data: inserted, error } = await supabase
        .from('pipeline_candidates')
        .insert(candidatesToInsert)
        .select('id, email');

      if (error) {
        // May fail if candidate already exists in pipeline (uniq constraint)
        return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 400 });
      }

      // Send emails using SMTP
      for (const candidate of (inserted || [])) {
        try {
          await sendEmail({
            to: candidate.email,
            subject: `Interview Invitation: ${pipeline_role || 'PrepSpace Assessment'}`,
            html: `
              <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #f7f9fc; padding: 32px; text-align: center; border-bottom: 1px solid #E1E3E5;">
                  <h1 style="margin: 0; font-size: 24px; color: #080C14; font-weight: 700;">You're Invited! 🎉</h1>
                </div>
                <div style="padding: 40px 32px;">
                  <p style="font-size: 16px; margin-top: 0;">Hi there,</p>
                  <p style="font-size: 16px;">We're thrilled to invite you to the next step of the interview process for the <strong>${pipeline_role || 'open position'}</strong>.</p>
                  <p style="font-size: 16px; color: #4A5568;">Your background really stood out to us, and we'd love for you to complete a brief technical assessment. This is your chance to showcase your skills in a comfortable environment.</p>
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/interview/invite/${candidate.id}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #080C14; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      Start Your Assessment
                    </a>
                  </div>
                  <p style="font-size: 16px; color: #4A5568;">We wish you the best of luck!</p>
                  <p style="font-size: 15px; margin-bottom: 0; font-weight: 600; color: #080C14;">Warmly,</p>
                  <p style="font-size: 14px; margin-top: 4px; color: #6B7A99;">The Hiring Team</p>
                </div>
                <div style="background-color: #f7f9fc; padding: 20px 32px; border-top: 1px solid #E1E3E5;">
                  <p style="font-size: 13px; color: #888; margin: 0; text-align: center;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="color: #4A5568;">${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/interview/invite/${candidate.id}</span></p>
                </div>
              </div>
            `
          });
          console.log('Invite sent to', candidate.email);
        } catch (sendError) {
          console.error('Email send error for', candidate.email, sendError);
        }
      }

      return NextResponse.json({ success: true, count: inserted?.length || 0 });
    } catch (e: unknown) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : "Unknown error") }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

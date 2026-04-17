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
            subject: `Action Required: Assessment for ${pipeline_role || 'Technical Position'}`,
            html: `
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background-color: #080C14; padding: 40px 32px; text-align: center;">
                  <div style="color: #4DFFA0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px;">PrepSpace Talent Portal</div>
                  <h1 style="margin: 0; font-size: 26px; color: #ffffff; font-weight: 700; letter-spacing: -0.02em;">Technical Assessment Invitation</h1>
                </div>
                <div style="padding: 48px 40px;">
                  <p style="font-size: 16px; margin-top: 0; color: #1A1C1E;">Dear Candidate,</p>
                  <p style="font-size: 16px; color: #4A5568;">We are pleased to invite you to the next stage of our selection process for the <strong>${pipeline_role || 'open position'}</strong>. At this stage, we use PrepSpace to facilitate an AI-driven technical conversation that helps us better understand your expertise and approach to problem-solving.</p>
                  
                  <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 32px 0;">
                    <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #64748B; letter-spacing: 0.05em;">Assessment Details</h3>
                    <ul style="margin: 0; padding: 0; list-style: none;">
                      <li style="margin-bottom: 10px; display: flex; align-items: center; font-size: 14px; color: #334155;">
                        <span style="color: #4DFFA0; margin-right: 10px;">•</span> <strong>Role:</strong> ${pipeline_role || 'Technical Staff'}
                      </li>
                      <li style="margin-bottom: 10px; display: flex; align-items: center; font-size: 14px; color: #334155;">
                        <span style="color: #4DFFA0; margin-right: 10px;">•</span> <strong>Format:</strong> Interactive Voice & Video Interview
                      </li>
                      <li style="margin-bottom: 10px; display: flex; align-items: center; font-size: 14px; color: #334155;">
                        <span style="color: #4DFFA0; margin-right: 10px;">•</span> <strong>Platform:</strong> PrepSpace Portal
                      </li>
                    </ul>
                  </div>

                  <p style="font-size: 15px; color: #4A5568; margin-bottom: 24px;">Please ensure you are in a quiet environment with a stable internet connection before beginning. The assessment will require camera and microphone access.</p>

                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://prep-space.vercel.app'}/interview/invite/${candidate.id}" 
                       style="display: inline-block; padding: 16px 40px; background-color: #080C14; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 10px;">
                      Access Interview Portal
                    </a>
                  </div>
                  
                  <p style="font-size: 15px; color: #4A5568;">This session is your opportunity to demonstrate your technical depth in a comfortable environment. We look forward to reviewing your performance report.</p>
                  
                  <div style="margin-top: 48px; border-top: 1px solid #E2E8F0; padding-top: 24px;">
                    <p style="font-size: 14px; margin-bottom: 4px; font-weight: 700; color: #080C14;">Best Regards,</p>
                    <p style="font-size: 14px; margin-top: 0; color: #64748B;">Hiring Excellence Team</p>
                  </div>
                </div>
                <div style="background-color: #F8FAFC; padding: 24px 40px; border-top: 1px solid #E1E3E5; text-align: center;">
                  <p style="font-size: 12px; color: #94A3B8; margin: 0;">If you experience technical difficulties, please copy and paste the following link into your browser:<br/><span style="color: #64748B; word-break: break-all;">${process.env.NEXT_PUBLIC_SITE_URL || 'https://prep-space.vercel.app'}/interview/invite/${candidate.id}</span></p>
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

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { candidate_id, stage, pipeline_name, candidate_name, candidate_email } = body;

  if (!candidate_id || !stage) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('pipeline_candidates')
    .update({ stage })
    .eq('id', candidate_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send an email for key status changes
  if (['shortlisted', 'rejected', 'interviewing'].includes(stage)) {
    try {
      let subject = '';
      let html = '';

      const name = candidate_name || 'Candidate';

      if (stage === 'shortlisted') {
        subject = `Update on your application for ${pipeline_name} - Shortlisted!`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #f7f9fc; padding: 32px; text-align: center; border-bottom: 1px solid #E1E3E5;">
              <h1 style="margin: 0; color: #080C14; font-size: 26px; font-weight: 700;">Amazing news! </h1>
            </div>
            <div style="padding: 40px 32px;">
              <h2 style="color: #080C14; margin-top: 0; font-size: 20px;">Hi ${name},</h2>
              <p style="font-size: 16px;">We really enjoyed reviewing your profile and test results. We are thrilled to let you know that you have been <strong>shortlisted</strong> for the <strong>${pipeline_name}</strong> position.</p>
              <p style="font-size: 16px; color: #4A5568;">Your technical approach stood out, and we'd love to chat more. One of our recruiters will be in touch with you very shortly to outline the next steps.</p>
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E1E3E5;">
                <p style="font-size: 15px; margin-bottom: 0; font-weight: 600; color: #080C14;">Best regards,</p>
                <p style="font-size: 14px; margin-top: 4px; color: #6B7A99;">The Hiring Team</p>
              </div>
            </div>
          </div>
        `;
      } else if (stage === 'interviewing') {
        subject = `Invitation to Interview: ${pipeline_name}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #f7f9fc; padding: 32px; text-align: center; border-bottom: 1px solid #E1E3E5;">
              <h1 style="margin: 0; color: #080C14; font-size: 24px; font-weight: 700;">Next Step: Interview ️</h1>
            </div>
            <div style="padding: 40px 32px;">
              <h2 style="color: #080C14; margin-top: 0; font-size: 20px;">Hi ${name},</h2>
              <p style="font-size: 16px;">We would love to formally invite you to the <strong>Technical Interview</strong> stage for the <strong>${pipeline_name}</strong> role.</p>
              <p style="font-size: 16px; color: #4A5568;">This live session is an opportunity for us to get to know you better. Please refer to your personal dashboard to see your upcoming schedule and review your prepared materials.</p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #080C14; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
              </div>
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E1E3E5;">
                <p style="font-size: 15px; margin-bottom: 0; font-weight: 600; color: #080C14;">Warmly,</p>
                <p style="font-size: 14px; margin-top: 4px; color: #6B7A99;">The Hiring Team</p>
              </div>
            </div>
          </div>
        `;
      } else {
        subject = `Update on your application for ${pipeline_name}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="padding: 40px 32px;">
              <h2 style="color: #080C14; margin-top: 0; font-size: 20px;">Hi ${name},</h2>
              <p style="font-size: 16px;">Thank you for taking the time to share your background with us and complete the assessment for the <strong>${pipeline_name}</strong> position.</p>
              <p style="font-size: 16px; color: #4A5568;">We had a very competitive group of candidates and while your skills are impressive, we have made the difficult decision to move forward with other candidates whose experience more closely matches the current needs of our team.</p>
              <p style="font-size: 16px; color: #4A5568;">We sincerely appreciate the time you invested in this process. We encourage you to keep an eye on our career page and hope our paths cross again in the future.</p>
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #E1E3E5;">
                <p style="font-size: 15px; margin-bottom: 0; font-weight: 600; color: #080C14;">Wishing you all the best,</p>
                <p style="font-size: 14px; margin-top: 4px; color: #6B7A99;">The Hiring Team</p>
              </div>
            </div>
          </div>
        `;
      }

      await sendEmail({
        to: candidate_email,
        subject,
        html,
      });
      console.log(`[Email Success]: Sent ${stage} email to ${candidate_email}`);
    } catch (emailErr) {
      console.warn('[Email Error] Failed to send status email:', emailErr);
    }
  }

  return NextResponse.json({ success: true, stage });
}

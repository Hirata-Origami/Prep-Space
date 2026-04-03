import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
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

  // Send an email via Resend for key status changes
  if (['shortlisted', 'rejected', 'interviewing'].includes(stage)) {
    try {
      let subject = '';
      let html = '';

      const name = candidate_name || 'Candidate';

      if (stage === 'shortlisted') {
        subject = `Update on your application for ${pipeline_name} - Shortlisted!`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 12px; overflow: hidden;">
            <div style="background: #4DFFA0; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #080C14; font-size: 28px;">Congratulations!</h1>
            </div>
            <div style="padding: 32px; background: white;">
              <h2 style="color: #080C14; margin-top: 0;">Excellent News, ${name}</h2>
              <p>We are thrilled to inform you that you have been <strong>shortlisted</strong> for the <strong>${pipeline_name}</strong> position after successfully passing your AI-evaluated interview rounds on PrepSpace.</p>
              <p>Your technical performance and soft skills were outstanding. Our recruiting team will be in touch with you shortly regarding the final interview steps.</p>
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #F0F2F4;">
                <p style="margin-bottom: 0; font-weight: bold; color: #080C14;">The Talent Acquisition Team</p>
                <p style="margin-top: 4px; color: #6B7A99; font-size: 14px;">Powered by PrepSpace</p>
              </div>
            </div>
          </div>
        `;
      } else if (stage === 'interviewing') {
        subject = `Technical Round Invitation: ${pipeline_name}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 12px; overflow: hidden;">
            <div style="background: #7B61FF; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 26px;">Next Step: Interview</h1>
            </div>
            <div style="padding: 32px; background: white;">
              <h2 style="color: #080C14; margin-top: 0;">Hello ${name},</h2>
              <p>Your profile is moving forward to the <strong>Technical Interview</strong> stage for the <strong>${pipeline_name}</strong> role.</p>
              <p>Please ensure your PrepSpace profile is fully updated with your latest projects and GitHub metrics, as our technical leads will review it before the call.</p>
              <div style="margin-top: 24px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="display: inline-block; background: #7B61FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View My Dashboard</a>
              </div>
            </div>
          </div>
        `;
      } else {
        subject = `Update on your application for ${pipeline_name}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1C1E; line-height: 1.6; border: 1px solid #E1E3E5; border-radius: 12px; overflow: hidden;">
            <div style="padding: 32px; background: white;">
              <h2>Hello ${name},</h2>
              <p>Thank you for taking the time to interview for the <strong>${pipeline_name}</strong> position on PrepSpace.</p>
              <p>After careful consideration of your AI-evaluated scores, we have decided to move forward with other candidates at this time.</p>
              <p>We encourage you to continue using PrepSpace to hone your skills, build your public profile, and apply to future roles.</p>
              <p>Best regards,</p>
              <p><strong>The Talent Acquisition Team</strong></p>
            </div>
          </div>
        `;
      }

      const { data, error: sendError } = await resend.emails.send({
        from: 'PrepSpace <onboarding@resend.dev>',
        to: [candidate_email],
        subject,
        html,
      });

      if (sendError) {
        console.warn('[Resend Error]: Failed to send status email:', sendError);
      } else {
        console.log(`[Resend Success]: Sent ${stage} email to ${candidate_email}`, data);
      }
    } catch (emailErr) {
      console.warn('[Resend] Failed to send email:', emailErr);
    }
  }

  return NextResponse.json({ success: true, stage });
}

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

  // Send an email via Resend if moving to shortlisted or rejected
  if (stage === 'shortlisted' || stage === 'rejected') {
    try {
      let subject = '';
      let html = '';

      const name = candidate_name || 'Candidate';

      if (stage === 'shortlisted') {
        subject = `Update on your application for ${pipeline_name} - Shortlisted!`;
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #4DFFA0;">Congratulations, ${name}!</h2>
            <p>We are thrilled to inform you that you have been <strong>shortlisted</strong> for the <strong>${pipeline_name}</strong> position after successfully passing your AI-evaluated interview rounds on PrepSpace.</p>
            <p>Your performance was outstanding, and our recruiting team will be in touch with you shortly regarding the next steps.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The Talent Acquisition Team</strong></p>
          </div>
        `;
      } else {
        subject = `Update on your application for ${pipeline_name}`;
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Hello ${name},</h2>
            <p>Thank you for taking the time to interview for the <strong>${pipeline_name}</strong> position on PrepSpace.</p>
            <p>After careful consideration of your AI-evaluated scores, we have decided to move forward with other candidates at this time.</p>
            <p>We encourage you to continue using PrepSpace to hone your skills, build your public profile, and apply to future roles.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The Talent Acquisition Team</strong></p>
          </div>
        `;
      }

      await resend.emails.send({
        from: 'PrepSpace Recruiting <noreply@prepspace.io>',
        to: candidate_email,
        subject,
        html,
      });

      console.log(`[Resend] Successfully sent ${stage} email to ${candidate_email}`);
    } catch (emailErr) {
      console.warn('[Resend] Failed to send email:', emailErr);
    }
  }

  return NextResponse.json({ success: true, stage });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
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
  } catch (e) {
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
    } catch (e: any) {
      console.error('Email parse error:', e);
      return NextResponse.json({ error: 'Failed to parse emails from text: ' + e.message }, { status: 500 });
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
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // If Resend is configured, send emails
      if (resend) {
        for (const candidate of (inserted || [])) {
          await resend.emails.send({
            from: 'PrepSpace <invites@prepspace.io>', // Update with your verified domain
            to: candidate.email,
            subject: `Interview Invitation: ${pipeline_role || 'PrepSpace Assessment'}`,
            html: `
              <h2>You have been invited to an interview</h2>
              <p>Please click the link below to start your assessment for ${pipeline_role || 'the role'}:</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/interview/invite/${candidate.id}" style="display:inline-block;padding:12px 24px;background:#4DFFA0;color:#080C14;text-decoration:none;font-weight:bold;border-radius:8px;">Start Assessment</a>
            `
          }).catch((e: any) => console.error('Resend error for', candidate.email, e));
        }
      } else {
        console.log(`[Mock Send] Resend API key missing. Would have sent invites to:`, emails);
      }

      return NextResponse.json({ success: true, count: inserted?.length || 0 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

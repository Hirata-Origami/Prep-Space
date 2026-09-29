import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { weeklyDigestEmail } from '@/lib/email/messages';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface Recipient {
  id: string;
  email: string;
  full_name: string | null;
}

/**
 * GET /api/cron/weekly-digest
 * Runs every Monday. Sends each opted-in user their week: interviews, flashcards, coding practice, stories,
 * cards due now and application steps coming up. Requires the CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  // Fail closed: without a configured secret nobody may trigger a mass email
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  // users who turned email off are skipped; the column may not exist until migration 005 has run
  let recipients: Recipient[] = [];
  const optedIn = await supabase.from('users').select('id, email, full_name').not('email', 'is', null).neq('email_updates', false).limit(500);
  if (optedIn.error && /email_updates/.test(optedIn.error.message)) {
    const all = await supabase.from('users').select('id, email, full_name').not('email', 'is', null).limit(500);
    recipients = (all.data ?? []) as Recipient[];
  } else if (optedIn.error) {
    return NextResponse.json({ error: optedIn.error.message }, { status: 500 });
  } else {
    recipients = (optedIn.data ?? []) as Recipient[];
  }

  const testEmail = new URL(request.url).searchParams.get('test_email');
  const targets = testEmail ? [{ id: recipients[0]?.id ?? 'test', email: testEmail, full_name: 'Test' }] : recipients;

  let sent = 0;
  let failed = 0;
  for (const u of targets) {
    try {
      const [interviews, reviewed, due, coding, stories, apps] = await Promise.all([
        supabase.from('interview_sessions').select('id', { count: 'exact', head: true }).eq('user_id', u.id).gte('created_at', since),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', u.id).gte('last_reviewed_at', since),
        supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', u.id).lte('due_date', today),
        supabase.from('coding_submissions').select('status').eq('user_id', u.id).gte('created_at', since),
        supabase.from('star_stories').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
        supabase
          .from('applications')
          .select('company, role, next_step, next_step_at')
          .eq('user_id', u.id)
          .not('next_step_at', 'is', null)
          .gte('next_step_at', today)
          .lte('next_step_at', nextWeek)
          .order('next_step_at', { ascending: true })
          .limit(3),
      ]);

      const attempts = coding.data ?? [];
      const mail = weeklyDigestEmail({
        name: u.full_name,
        interviews: interviews.count ?? 0,
        flashcardsReviewed: reviewed.count ?? 0,
        flashcardsDue: due.count ?? 0,
        codingAttempts: attempts.length,
        codingPassed: attempts.filter(a => a.status === 'passed').length,
        stories: stories.count ?? 0,
        upcoming: (apps.data ?? []).map(a => ({
          company: a.company,
          role: a.role,
          step: a.next_step || 'Next step',
          date: new Date(a.next_step_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })),
      });

      await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text });
      sent++;
    } catch (err) {
      failed++;
      console.error(`Weekly digest failed for ${u.email}:`, err);
    }
  }

  return NextResponse.json({ success: true, sent_count: sent, failed_count: failed });
}

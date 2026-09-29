import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/weekly-digest
 * Triggered every Monday at 08:00 UTC by pg_cron (or externally by the hosting provider).
 * Sends each active user a personalised weekly progress report that includes:
 *  - Interview sessions count & average score this week
 *  - Flashcards reviewed and streak
 *  - Coding problems solved
 *  - STAR stories in bank
 *  - A motivational nudge to keep the streak alive
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  // Fail closed: without a configured secret nobody may trigger a mass email
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prep-space.vercel.app';

  // Fetch active users (limit 200)
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, email, full_name')
    .not('email', 'is', null)
    .limit(200);

  if (usersErr || !users?.length) {
    return NextResponse.json({ message: 'No users or error', error: usersErr?.message });
  }

  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('test_email');
  const targetUsers = testEmail
    ? [{ id: users[0]?.id ?? 'test', email: testEmail, full_name: 'Test User' }]
    : users;

  let sent = 0;

  for (const u of targetUsers) {
    try {
      // Fetch per-user weekly stats in parallel
      const [interviewRes, flashRes, codingRes, starRes] = await Promise.all([
        supabase
          .from('interview_sessions')
          .select('id')
          .eq('user_id', u.id)
          .gte('created_at', since),
        supabase
          .from('flashcards')
          .select('id')
          .eq('user_id', u.id)
          .gte('last_reviewed_at', since),
        supabase
          .from('coding_submissions')
          .select('id, status')
          .eq('user_id', u.id)
          .gte('created_at', since),
        supabase
          .from('star_stories')
          .select('id')
          .eq('user_id', u.id),
      ]);

      const interviews = (interviewRes.data ?? []).length;
      const flashcardsReviewed = (flashRes.data ?? []).length;
      const codingAttempts = (codingRes.data ?? []).length;
      const codingPassed = (codingRes.data ?? []).filter(s => s.status === 'passed').length;
      const starCount = (starRes.data ?? []).length;

      const name = u.full_name || 'there';

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#05070A;font-family:'Inter',-apple-system,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#080C14;border:1px solid rgba(77,255,160,0.12);border-radius:18px;overflow:hidden;">

    <!-- Header -->
    <div style="padding:48px 32px 32px;text-align:center;background:linear-gradient(135deg,rgba(77,255,160,0.1) 0%,rgba(123,97,255,0.1) 100%);">
      <div style="font-size:11px;font-weight:800;color:#4DFFA0;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:10px;">Weekly Progress Report</div>
      <h1 style="color:#FFF;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">PrepSpace Digest</h1>
      <p style="color:#7B8DB0;margin:10px 0 0;font-size:14px;">Hey ${name}, here's how you're doing 🚀</p>
    </div>

    <!-- Stats -->
    <div style="padding:32px;display:grid;gap:16px;">
      <table style="width:100%;border-collapse:separate;border-spacing:0 10px;">
        <tbody>
          ${[
            { label: '🎤 AI Interviews', value: interviews, unit: 'session' + (interviews !== 1 ? 's' : '') },
            { label: '🧠 Flashcards', value: flashcardsReviewed, unit: 'reviewed' },
            { label: '💻 Coding Problems', value: codingAttempts, unit: `attempted · ${codingPassed} passed` },
            { label: '⭐ STAR Stories', value: starCount, unit: 'in bank' },
          ].map(stat => `
          <tr>
            <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 18px;">
              <span style="color:#B8C4E0;font-size:13px;">${stat.label}</span>
            </td>
            <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 18px;text-align:right;">
              <span style="color:#4DFFA0;font-size:20px;font-weight:800;">${stat.value}</span>
              <span style="color:#6B7A99;font-size:12px;margin-left:6px;">${stat.unit}</span>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>

      <!-- Nudge -->
      <div style="background:rgba(123,97,255,0.07);border:1px solid rgba(123,97,255,0.2);border-radius:12px;padding:22px;">
        <p style="margin:0;color:#C4B5FD;font-size:14px;line-height:1.7;">
          ${interviews === 0 && flashcardsReviewed === 0
            ? "Looks like a quieter week — no worries! Consistency beats perfection. Schedule a quick 10-minute practice session today to keep your streak alive. 🔥"
            : interviews > 0
              ? `You completed ${interviews} AI interview${interviews > 1 ? 's' : ''} this week — that's real dedication. Keep pushing, your next offer is one practice session closer. 💪`
              : `You reviewed ${flashcardsReviewed} flashcard${flashcardsReviewed > 1 ? 's' : ''} this week — great memory work! Add an AI interview session to round out your prep. 🎯`
          }
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;padding:12px 0 8px;">
        <a href="${siteUrl}/dashboard"
           style="background:#4DFFA0;color:#080C14;padding:14px 36px;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;">
          Open Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:24px 32px;background:rgba(0,0,0,0.2);text-align:center;border-top:1px solid rgba(255,255,255,0.04);">
      <p style="color:#4B5675;font-size:11px;margin:0;">© 2026 PrepSpace · You are receiving this because you signed up for weekly digests.</p>
    </div>
  </div>
</body>
</html>`;

      await sendEmail({
        to: u.email,
        subject: `Your PrepSpace Week in Review — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Weekly digest failed for ${u.email}:`, err);
    }
  }

  return NextResponse.json({ success: true, sent_count: sent });
}

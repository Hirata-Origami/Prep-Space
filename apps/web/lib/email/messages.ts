import { C, SITE_URL, bigNumber, callout, emailShell, esc, heading, paragraph, plainText, scoreBars, scoreColor, section, statTable } from './template';

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

const first = (name?: string | null) => (name?.trim().split(/\s+/)[0]) || 'there';

/** Sent when an interview report is ready. */
export function reportEmail(d: {
  name?: string | null;
  role?: string;
  score: number;
  recommendation: string;
  summary: string;
  scores: Record<string, number>;
  reportId: string;
}): EmailMessage {
  const url = `${SITE_URL()}/reports/${d.reportId}`;
  const role = d.role || 'your interview';
  return {
    subject: `Your ${role} report is ready: ${d.score}%`,
    text: plainText([
      `Hi ${first(d.name)},`,
      `Your report for ${role} is ready. Overall score: ${d.score}%. Recommendation: ${d.recommendation}.`,
      d.summary,
      `Read the full report: ${url}`,
    ]),
    html: emailShell({
      preheader: `${d.score}% overall. ${d.recommendation}.`,
      title: 'Your report is ready',
      lead: `Hi ${first(d.name)}, here is how ${role} went.`,
      rows: [
        section(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top" style="width:50%;">${bigNumber(`${d.score}%`, 'Overall score', scoreColor(d.score))}</td>
          <td valign="top" style="width:50%;">${bigNumber(d.recommendation, 'Recommendation')}</td>
        </tr></table>`.replace('font-size:44px', 'font-size:40px')),
        section(callout(d.summary)),
        Object.keys(d.scores).length ? section(`${heading('Skills')}${scoreBars(d.scores)}`) : '',
      ],
      cta: { href: url, label: 'Open the full report' },
      footer: 'This report was generated right after your session.',
    }),
  };
}

/** The Monday summary of the week. */
export function weeklyDigestEmail(d: {
  name?: string | null;
  interviews: number;
  flashcardsReviewed: number;
  flashcardsDue: number;
  codingAttempts: number;
  codingPassed: number;
  stories: number;
  upcoming: { company: string; role: string; step: string; date: string }[];
}): EmailMessage {
  const site = SITE_URL();
  const quiet = d.interviews + d.flashcardsReviewed + d.codingAttempts === 0;
  const nudge = quiet
    ? 'A quiet week. Ten minutes today is enough to get moving again: one flashcard round or one short answer out loud.'
    : d.interviews > 0
      ? `You finished ${d.interviews} ${d.interviews === 1 ? 'interview' : 'interviews'} this week. Read the reports and turn the weak spots into flashcards.`
      : 'You kept practising this week. Add a mock interview to see how it holds up out loud.';

  const next = d.flashcardsDue > 0
    ? { href: `${site}/flashcards`, label: `Review ${d.flashcardsDue} ${d.flashcardsDue === 1 ? 'card' : 'cards'}` }
    : { href: `${site}/interview`, label: 'Start a mock interview' };

  return {
    subject: 'Your PrepSpace week',
    text: plainText([
      `Hi ${first(d.name)}, here is your week.`,
      `Interviews: ${d.interviews}. Flashcards reviewed: ${d.flashcardsReviewed} (${d.flashcardsDue} due now). Coding attempts: ${d.codingAttempts}, passed ${d.codingPassed}. STAR stories: ${d.stories}.`,
      d.upcoming.length ? `Coming up: ${d.upcoming.map(u => `${u.step} at ${u.company} on ${u.date}`).join('; ')}.` : '',
      nudge,
      `${next.label}: ${next.href}`,
    ]),
    html: emailShell({
      preheader: quiet ? 'A quiet week. Here is a small next step.' : `${d.interviews} interviews, ${d.flashcardsReviewed} cards reviewed.`,
      title: 'Your week in practice',
      lead: `Hi ${first(d.name)}, here is what you did in the last seven days.`,
      rows: [
        section(statTable([
          { label: 'Mock interviews', value: d.interviews },
          { label: 'Flashcards reviewed', value: d.flashcardsReviewed, note: d.flashcardsDue ? `${d.flashcardsDue} due now` : undefined },
          { label: 'Coding problems attempted', value: d.codingAttempts, note: d.codingAttempts ? `${d.codingPassed} passed` : undefined },
          { label: 'STAR stories in your bank', value: d.stories },
        ])),
        d.upcoming.length
          ? section(`${heading('Coming up')}${statTable(d.upcoming.map(u => ({ label: `${u.step} at ${u.company}`, note: u.role, value: u.date })))}`)
          : '',
        section(callout(nudge)),
      ],
      cta: next,
      footer: 'You get this every Monday. You can turn it off in your settings.',
    }),
  };
}

/** The daily tip. `insights` comes from a model, so it is escaped like any other text. */
export function dailyInsightEmail(d: {
  name?: string | null;
  tipTitle: string;
  tipContent: string;
  companyName: string;
  companyInsight: string;
  quote: string;
}): EmailMessage {
  const site = SITE_URL();
  return {
    subject: d.tipTitle,
    text: plainText([`Hi ${first(d.name)},`, d.tipTitle, d.tipContent, `${d.companyName}: ${d.companyInsight}`, `"${d.quote}"`, `${site}/dashboard`]),
    html: emailShell({
      preheader: d.tipContent.slice(0, 110),
      title: d.tipTitle,
      lead: `Hi ${first(d.name)}, today's tip.`,
      rows: [
        section(paragraph(d.tipContent)),
        section(`${heading(`Interview culture: ${d.companyName}`)}${paragraph(d.companyInsight)}`),
        section(`<p style="margin:0;font-family:'Bricolage Grotesque','Geist',Arial,sans-serif;font-size:17px;line-height:1.6;color:${C.live};">&ldquo;${esc(d.quote)}&rdquo;</p>`),
      ],
      cta: { href: `${site}/dashboard`, label: 'Open your dashboard' },
      footer: 'You get one tip a day. You can turn these off in your settings.',
    }),
  };
}

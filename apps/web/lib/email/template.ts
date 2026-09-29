/**
 * Email layout that matches the app: ink background, periwinkle accent, a waveform in the header and one
 * clear action. Email clients ignore most modern CSS, so this uses tables and inline styles only, and every
 * piece of user or model text goes through esc().
 */

export const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://prep-space.vercel.app';

export const C = {
  page: '#0a0e1a',
  card: '#0f1526',
  raised: '#161d33',
  line: '#232c47',
  text: '#edf0fa',
  body: '#a9b1c9',
  muted: '#8089a6',
  signal: '#8b99ff',
  live: '#ffb020',
  good: '#3dd9a5',
  bad: '#f2546f',
  onSignal: '#0a0e1a',
};

const FONT = "'Geist','Helvetica Neue',Helvetica,Arial,sans-serif";
const DISPLAY = "'Bricolage Grotesque','Geist','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'Geist Mono',ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace";

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const scoreColor = (n: number) => (n >= 80 ? C.good : n >= 60 ? C.live : C.bad);

/** The PrepSpace waveform, drawn as table cells so it renders everywhere. */
function wave(): string {
  const heights = [10, 18, 28, 16, 34, 22, 12, 30, 20, 36, 14, 26, 18, 32, 12, 24, 30, 16, 22, 10];
  const cells = heights
    .map(h => `<td valign="middle" style="padding:0 2px;"><div style="width:4px;height:${h}px;background:${C.signal};border-radius:2px;line-height:${h}px;font-size:0;">&nbsp;</div></td>`)
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background:${C.signal};">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:${C.onSignal};text-decoration:none;border-radius:8px;">${esc(label)}</a>
  </td></tr></table>`;
}

export function heading(text: string): string {
  return `<h2 style="margin:0 0 12px 0;font-family:${DISPLAY};font-size:17px;font-weight:700;color:${C.text};">${esc(text)}</h2>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.body};">${esc(text)}</p>`;
}

/** A number with a label, for the top of a message. */
export function bigNumber(value: string | number, label: string, color = C.text): string {
  return `<div style="font-family:${MONO};font-size:44px;font-weight:600;line-height:1;color:${color};">${esc(value)}</div>
    <div style="margin-top:6px;font-family:${FONT};font-size:13px;color:${C.muted};">${esc(label)}</div>`;
}

/** Rows of "label ... value", used for weekly numbers. */
export function statTable(rows: { label: string; value: string | number; note?: string }[]): string {
  const body = rows
    .map(
      r => `<tr>
        <td style="padding:12px 0;border-top:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.body};">${esc(r.label)}${r.note ? `<div style="font-size:12px;color:${C.muted};margin-top:2px;">${esc(r.note)}</div>` : ''}</td>
        <td align="right" style="padding:12px 0;border-top:1px solid ${C.line};font-family:${MONO};font-size:18px;font-weight:600;color:${C.text};">${esc(r.value)}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>`;
}

/** A labelled 0 to 100 bar. */
export function scoreBars(scores: Record<string, number>): string {
  const rows = Object.entries(scores)
    .map(([key, raw]) => {
      const v = Math.max(0, Math.min(100, Math.round(Number(raw) || 0)));
      return `<tr>
        <td style="padding:7px 12px 7px 0;width:38%;font-family:${FONT};font-size:13px;color:${C.body};text-transform:capitalize;">${esc(key.replace(/_/g, ' '))}</td>
        <td style="padding:7px 0;">
          <div style="height:6px;background:${C.raised};border-radius:3px;"><div style="width:${v}%;height:6px;background:${scoreColor(v)};border-radius:3px;font-size:0;line-height:0;">&nbsp;</div></div>
        </td>
        <td align="right" style="padding:7px 0 7px 12px;width:36px;font-family:${MONO};font-size:13px;font-weight:600;color:${scoreColor(v)};">${v}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

export function callout(text: string, color = C.signal): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="border-left:3px solid ${color};background:${C.raised};padding:14px 16px;border-radius:0 8px 8px 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.body};">${esc(text)}</td>
  </tr></table>`;
}

export function section(inner: string): string {
  return `<tr><td style="padding:0 32px 28px 32px;">${inner}</td></tr>`;
}

interface ShellOptions {
  /** The grey preview line next to the subject in inboxes. */
  preheader: string;
  title: string;
  /** One line under the title. */
  lead?: string;
  /** Rows made with section(). */
  rows: string[];
  cta?: { href: string; label: string };
  footer?: string;
}

export function emailShell({ preheader, title, lead, rows, cta, footer }: ShellOptions): string {
  const site = SITE_URL();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:16px;">
    <tr><td style="padding:28px 32px 8px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${DISPLAY};font-size:18px;font-weight:700;color:${C.text};">PrepSpace</td>
        <td align="right">${wave()}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 32px 24px 32px;">
      <h1 style="margin:0;font-family:${DISPLAY};font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.01em;color:${C.text};">${esc(title)}</h1>
      ${lead ? `<p style="margin:10px 0 0 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.body};">${esc(lead)}</p>` : ''}
    </td></tr>
    ${rows.join('\n')}
    ${cta ? `<tr><td style="padding:4px 32px 32px 32px;">${button(cta.href, cta.label)}</td></tr>` : ''}
    <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid ${C.line};font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
      ${esc(footer ?? 'You are receiving this because you have a PrepSpace account.')}
      <br><a href="${esc(site)}/settings" style="color:${C.signal};text-decoration:underline;">Email settings</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text twin of an email, for clients and spam filters that want one. */
export function plainText(lines: string[]): string {
  return lines.filter(Boolean).join('\n\n');
}

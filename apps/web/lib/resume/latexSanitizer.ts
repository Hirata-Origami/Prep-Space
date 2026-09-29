/**
 * LaTeX Sanitizer & Formatter
 *
 * Turns raw resume text (plain text with light **bold** / *italic* markdown and
 * arbitrary unicode) into LaTeX that always compiles, and back again
 * (latexToPlain) so an exported .tex file can be re-imported losslessly.
 */

/** Characters that pdflatex (T1 + utf8) cannot typeset directly, mapped to safe LaTeX. */
const UNICODE_TO_LATEX: Record<string, string> = {
  '\u2013': ' \\textendash{} ',
  '\u2014': ' \\textemdash{} ',
  '\u2018': '`',
  '\u2019': "'",
  '\u201C': '``',
  '\u201D': "''",
  '\u2026': '\\ldots{}',
  '\u2022': '\\textbullet{}',
  '\u25CF': '\\textbullet{}',
  '\u25AA': '\\textbullet{}',
  '\u00D7': '\\ensuremath{\\times}',
  '\u2192': '\\ensuremath{\\rightarrow}',
  '\u2190': '\\ensuremath{\\leftarrow}',
  '\u21D2': '\\ensuremath{\\Rightarrow}',
  '\u2265': '\\ensuremath{\\geq}',
  '\u2264': '\\ensuremath{\\leq}',
  '\u2248': '\\ensuremath{\\approx}',
  '\u00B1': '\\ensuremath{\\pm}',
  '\u2260': '\\ensuremath{\\neq}',
  '\u00B0': '\\textdegree{}',
  '\u00B7': '\\textperiodcentered{}',
  '\u2122': '\\texttrademark{}',
  '\u00A9': '\\textcopyright{}',
  '\u00AE': '\\textregistered{}',
  '\u20AC': '\\texteuro{}',
  '\u20B9': 'INR ',
  '\u00A0': '~',
  '\u2009': ' ',
  '\u202F': ' ',
  '\u200B': '',
  '\uFEFF': '',
  '\u2212': '-',
};

/** Emoji and pictographs have no glyph in the resume fonts; drop them instead of failing the build. */
const UNSUPPORTED_SYMBOLS = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

/**
 * Escapes LaTeX special characters in raw text in a single pass, so nothing we
 * insert is escaped twice. Sequences the user already escaped (\& \% \$ \# \_ \{ \})
 * are kept as they are.
 */
export function escapeLatexSpecialChars(text: string): string {
  if (!text) return '';
  const src = text.replace(UNSUPPORTED_SYMBOLS, '');
  let out = '';

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (c === '\\') {
      const next = src[i + 1];
      if (next && '&%$#_{}'.includes(next)) {
        out += `\\${next}`;
        i++;
      } else {
        out += '\\textbackslash{}';
      }
      continue;
    }

    if (c === '-' && src[i + 1] === '-') {
      let j = i;
      while (src[j] === '-') j++;
      out += j - i >= 3 ? ' \\textemdash{} ' : ' \\textendash{} ';
      i = j - 1;
      continue;
    }

    switch (c) {
      case '&': out += '\\&'; break;
      case '%': out += '\\%'; break;
      case '$': out += '\\$'; break;
      case '#': out += '\\#'; break;
      case '_': out += '\\_'; break;
      case '{': out += '\\{'; break;
      case '}': out += '\\}'; break;
      case '~': out += '\\textasciitilde{}'; break;
      case '^': out += '\\textasciicircum{}'; break;
      case '<': out += '\\textless{}'; break;
      case '>': out += '\\textgreater{}'; break;
      case '|': out += '\\textbar{}'; break;
      default: out += UNICODE_TO_LATEX[c] ?? c;
    }
  }

  return out;
}

/**
 * Converts light markdown to LaTeX.
 * - **bold** -> \textbf{bold}
 * - *italic* -> \textit{italic}
 * - a leading bullet marker (*, -, bullet) is removed
 * Text is escaped first, so braces in the content can never break the markup.
 */
export function markdownToLatex(text: string): string {
  if (!text) return '';

  const stripped = text
    .trim()
    .split('\n')
    .map(line => line.trim().replace(/^[*\-\u2022]\s+/, ''))
    .filter(Boolean)
    .join('\n');

  let out = escapeLatexSpecialChars(stripped);
  out = out.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}');
  out = out.replace(/(?<!\\)\*([^*\n]+?)\*/g, '\\textit{$1}');
  return out.replace(/\s+/g, ' ').trim();
}

/** Sanitizes an array or newline-separated string of bullet points. */
export function sanitizeBullets(bullets: string | string[]): string[] {
  if (!bullets) return [];
  const list = Array.isArray(bullets) ? bullets : bullets.split('\n');

  return list
    .map(b => b.trim())
    .filter(b => b.length > 0)
    .map(b => markdownToLatex(b.replace(/^[*\-\u2022]\s+/, '')))
    .filter(b => b.length > 0);
}

/**
 * Splits a skill list on commas that are NOT inside parentheses.
 * "AWS (Lambda, Bedrock), Redis" -> ["AWS (Lambda, Bedrock)", "Redis"]
 */
export function splitSkillsSafely(skillStr: string): string[] {
  if (!skillStr) return [];
  const results: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of skillStr) {
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if ((char === ',' || char === '\n') && parenDepth === 0) {
      if (current.trim()) results.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) results.push(current.trim());
  return results;
}

/**
 * Skills may be entered as rows (one per line) to control how pills wrap;
 * each row is a comma-separated list. A single line is one row.
 */
export function splitSkillRows(skillStr: string): string[][] {
  if (!skillStr) return [];
  return skillStr
    .split('\n')
    .map(row => splitSkillsSafely(row))
    .filter(row => row.length > 0);
}

/** Cleans a URL and escapes the characters that break \url and \href inside macro arguments. */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  const md = cleaned.match(/\[(.*?)\]\((.*?)\)/);
  if (md) cleaned = md[2];
  cleaned = cleaned.replace(/[\s"'{}\\]/g, '');
  if (cleaned && !/^(https?:\/\/|mailto:)/i.test(cleaned)) cleaned = `https://${cleaned}`;
  // url.sty and hyperref only need % and # escaped inside macro arguments
  return cleaned.replace(/%/g, '\\%').replace(/#/g, '\\#');
}

/** The visible form of a profile URL: no scheme, no www, no trailing slash. */
export function displayUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/$/, '');
}

/** Wraps the first number of a score in bold: "CGPA: 8.31/10.00" -> "CGPA: \textbf{8.31}/10.00". */
export function boldScore(score: string): string {
  const m = score.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return escapeLatexSpecialChars(score);
  const [, before, num, after] = m;
  return `${escapeLatexSpecialChars(before)}\\textbf{${num}}${escapeLatexSpecialChars(after)}`;
}

/* ------------------------------------------------------------------ */
/* LaTeX -> plain text (used when re-importing a .tex file)            */
/* ------------------------------------------------------------------ */

// private-use placeholders keep literal characters safe while LaTeX commands are stripped
const LBRACE = '';
const RBRACE = '';
const BACKSLASH = '';
const TILDE = '';

const MATH_SYMBOLS: Record<string, string> = {
  times: '\u00D7',
  to: '\u2192',
  rightarrow: '\u2192',
  leftarrow: '\u2190',
  Rightarrow: '\u21D2',
  geq: '\u2265',
  ge: '\u2265',
  leq: '\u2264',
  le: '\u2264',
  approx: '\u2248',
  pm: '\u00B1',
  neq: '\u2260',
  cdot: '\u00B7',
  sim: '~',
};

/** Reads one balanced {...} group starting at `start` (which must point at "{"). */
export function readBraceGroup(src: string, start: number): { content: string; end: number } | null {
  if (src[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { content: src.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

function unwrapCommand(src: string, name: string, replace: (inner: string) => string): string {
  const needle = `\\${name}`;
  let out = '';
  let i = 0;
  while (i < src.length) {
    const at = src.indexOf(needle, i);
    if (at === -1) { out += src.slice(i); break; }
    const after = src[at + needle.length];
    if (after && /[a-zA-Z]/.test(after)) { out += src.slice(i, at + needle.length); i = at + needle.length; continue; }
    let p = at + needle.length;
    while (src[p] === ' ') p++;
    const group = readBraceGroup(src, p);
    if (!group) { out += src.slice(i, at + needle.length); i = at + needle.length; continue; }
    out += src.slice(i, at) + replace(unwrapCommand(group.content, name, replace));
    i = group.end;
  }
  return out;
}

export interface PlainOptions {
  /** Keep **bold** / *italic* markers so formatting survives a round trip. */
  markdown?: boolean;
}

/** Converts a LaTeX fragment back to the plain text (with optional light markdown) a user would type. */
export function latexToPlain(latex: string, opts: PlainOptions = {}): string {
  let s = latex;

  // drop comments (not \%)
  s = s.replace(/(^|[^\\])%.*$/gm, '$1');

  // links: keep the visible text, or the URL if the text is empty
  s = unwrapCommand(s, 'url', inner => inner.replace(/\\([%#&_])/g, '$1'));
  {
    let out = '';
    let i = 0;
    while (i < s.length) {
      const at = s.indexOf('\\href', i);
      if (at === -1) { out += s.slice(i); break; }
      const a = readBraceGroup(s, at + 5);
      const b = a ? readBraceGroup(s, a.end) : null;
      if (!a || !b) { out += s.slice(i, at + 5); i = at + 5; continue; }
      out += s.slice(i, at) + (b.content.trim() || a.content.replace(/\\([%#&_])/g, '$1'));
      i = b.end;
    }
    s = out;
  }

  // emphasis
  s = unwrapCommand(s, 'textbf', inner => (opts.markdown ? `**${inner}**` : inner));
  s = unwrapCommand(s, 'textit', inner => (opts.markdown ? `*${inner}*` : inner));
  s = unwrapCommand(s, 'emph', inner => (opts.markdown ? `*${inner}*` : inner));
  s = unwrapCommand(s, 'underline', inner => inner);
  s = unwrapCommand(s, 'textsc', inner => inner);

  // math and symbols
  s = s.replace(/\$\s*\\([a-zA-Z]+)\s*\$/g, (m, name: string) => MATH_SYMBOLS[name] ?? '');
  s = s.replace(/\\ensuremath\{\\([a-zA-Z]+)\}/g, (m, name: string) => MATH_SYMBOLS[name] ?? '');
  s = s.replace(/\\textendash(\{\})?/g, '\u2013').replace(/\\textemdash(\{\})?/g, '\u2014');
  s = s.replace(/\\textbullet(\{\})?/g, '\u2022').replace(/\\ldots(\{\})?/g, '\u2026');
  s = s.replace(/\\textperiodcentered(\{\})?/g, '\u00B7').replace(/\\textdegree(\{\})?/g, '\u00B0');
  s = s.replace(/\\texttrademark(\{\})?/g, '\u2122').replace(/\\texteuro(\{\})?/g, '\u20AC');
  s = s.replace(/\\textasciitilde(\{\})?/g, TILDE).replace(/\\textasciicircum(\{\})?/g, '^');
  s = s.replace(/\\textless(\{\})?/g, '<').replace(/\\textgreater(\{\})?/g, '>').replace(/\\textbar(\{\})?/g, '|');
  s = s.replace(/\\textbackslash(\{\})?/g, BACKSLASH);
  s = s.replace(/``/g, '\u201C').replace(/''/g, '\u201D');

  // escaped specials
  s = s.replace(/\\\{/g, LBRACE).replace(/\\\}/g, RBRACE).replace(/\\([&%$#_])/g, '$1');

  // layout commands that carry sizing arguments
  s = s.replace(/\\(?:fontsize|vspace\*?|hspace\*?|rule|setlength|color|textcolor)(\[[^\]]*\])?(\{[^{}]*\}){1,2}/g, '');
  s = s.replace(/\\\\(\[[^\]]*\])?/g, '\n');
  s = s.replace(/\\[ ,;:!]/g, ' ');
  s = s.replace(/~/g, ' ');

  // any command that is left has no text argument we care about; keep the text inside its braces
  s = s.replace(/\\[a-zA-Z]+\*?/g, '');
  s = s.replace(/[{}]/g, '');
  s = s.split(BACKSLASH).join('\\').split(LBRACE).join('{').split(RBRACE).join('}').split(TILDE).join('~');

  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

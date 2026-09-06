/**
 * LaTeX Sanitizer & Formatter
 * Converts markdown formatting (bold, italics, asterisks) and unescaped special characters
 * into clean, valid LaTeX markup, preventing compilation errors and syntax leakage.
 */

/**
 * Escapes LaTeX special characters while preserving already escaped commands.
 */
export function escapeLatexSpecialChars(text: string): string {
  if (!text) return '';

  return text
    // Replace double hyphen with en-dash
    .replace(/--/g, ' \\textendash{} ')
    // Replace unicode en-dash and em-dash
    .replace(/\u2013/g, ' \\textendash{} ')
    .replace(/\u2014/g, ' \\textemdash{} ')
    // Replace unescaped &
    .replace(/(?<!\\)&/g, '\\&')
    // Replace unescaped %
    .replace(/(?<!\\)%/g, '\\%')
    // Replace unescaped $
    .replace(/(?<!\\)\$/g, '\\$')
    // Replace unescaped #
    .replace(/(?<!\\)#/g, '\\#')
    // Replace unescaped _ (if not in LaTeX commands)
    .replace(/(?<!\\)_/g, '\\_');
}

/**
 * Converts markdown syntax to clean LaTeX markup.
 * - **bold** -> \textbf{bold}
 * - *italic* -> \textit{italic}
 * - Removes rogue markdown bullet asterisks (* bullet -> bullet)
 */
export function markdownToLatex(text: string): string {
  if (!text) return '';

  let sanitized = text.trim();

  // Strip leading bullet markers (*, -, •) from lines
  sanitized = sanitized
    .split('\n')
    .map(line => line.trim().replace(/^[\*\-\u2022]\s+/, ''))
    .filter(Boolean)
    .join('\n');

  // Convert markdown bold: **text** or __text__ -> \textbf{text}
  sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');

  // Convert markdown italic: *text* (when not preceded by \) -> \textit{text}
  sanitized = sanitized.replace(/(?<!\\)\*([^\*]+?)\*/g, '\\textit{$1}');

  // Escape any remaining LaTeX special characters
  sanitized = escapeLatexSpecialChars(sanitized);

  // Clean up any double spaces or broken backslashes
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Sanitizes an array or newline-separated string of bullet points.
 */
export function sanitizeBullets(bullets: string | string[]): string[] {
  if (!bullets) return [];

  const list = Array.isArray(bullets)
    ? bullets
    : bullets.split('\n');

  return list
    .map(b => b.trim())
    .filter(b => b.length > 0)
    .map(b => {
      // Strip leading bullet signs
      let cleaned = b.replace(/^[\*\-\u2022]\s+/, '').trim();
      return markdownToLatex(cleaned);
    })
    .filter(b => b.length > 0);
}

/**
 * Sanitizes URLs for use in \url{...} or \href{...}{...}
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Remove markdown link syntax [text](url) if present
  const match = cleaned.match(/\[(.*?)\]\((.*?)\)/);
  if (match) {
    cleaned = match[2];
  }
  return cleaned.replace(/[\s"']/g, '');
}

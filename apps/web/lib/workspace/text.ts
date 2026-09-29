import type { Diagram, LanguageId } from './types';

/** Plain-text description of a diagram, for models and for copying. */
export function diagramToText(d: Diagram): string {
  if (!d.nodes.length) return '';
  const label = new Map(d.nodes.map(n => [n.id, n.label]));
  const parts = [`Components: ${d.nodes.map(n => `${n.label} (${n.kind})`).join(', ')}.`];
  if (d.edges.length) {
    parts.push('Connections:');
    d.edges.forEach(e => parts.push(`- ${label.get(e.from)} -> ${label.get(e.to)}${e.label ? ` (${e.label})` : ''}`));
  }
  return parts.join('\n');
}

/** What the candidate wrote on the shared board, formatted as one message to the interviewer. */
export function boardToText(language: LanguageId, code: string, diagram: Diagram): string {
  const out = ['The candidate is sharing their board. Review it and respond briefly, as in a real interview.'];
  if (code.trim()) out.push(`Code (${language === 'markdown' ? 'notes' : language}):\n${code.trim().slice(0, 8000)}`);
  const dt = diagramToText(diagram);
  if (dt) out.push(`Diagram they drew:\n${dt}`);
  return out.join('\n\n');
}

import { Fragment } from 'react';

/** Renders the small markdown subset the coach replies with: paragraphs, lists, headings, code, bold and inline code. */

function inline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-raised px-1 py-0.5 font-mono text-[12px] text-fg">{p.slice(1, -1)}</code>;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-fg">{p.slice(2, -2)}</strong>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdownish({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key++} className="overflow-x-auto rounded-control border border-line bg-raised p-3 font-mono text-[12px] leading-relaxed text-fg-2">{code.join('\n')}</pre>);
    } else if (/^#{1,4}\s/.test(line)) {
      blocks.push(<h4 key={key++} className="mt-1 text-sm font-semibold text-fg">{inline(line.replace(/^#{1,4}\s/, ''))}</h4>);
      i++;
    } else if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, ''));
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={key++} className={ordered ? 'list-decimal space-y-1 pl-5' : 'list-disc space-y-1 pl-5'}>
          {items.map((it, n) => <li key={n}>{inline(it)}</li>)}
        </Tag>
      );
    } else if (!line.trim()) {
      i++;
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith('```') && !/^#{1,4}\s/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i])) para.push(lines[i++]);
      blocks.push(<p key={key++}>{inline(para.join(' '))}</p>);
    }
  }

  return <div className="space-y-2.5 text-[13px] leading-relaxed text-fg-2">{blocks}</div>;
}

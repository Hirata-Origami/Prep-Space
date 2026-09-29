'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, Copy, Network, SquareCode, Trash2 } from 'lucide-react';
import { Button, ButtonLink, EmptyState, Select, Skeleton } from '@/components/ui';
import { CodeEditor } from '@/components/workspace/CodeEditor';
import { DiagramCanvas } from '@/components/workspace/DiagramCanvas';
import { AiPanel } from '@/components/workspace/AiPanel';
import { EMPTY_DIAGRAM, LANGUAGES, type Diagram, type LanguageId, type WorkspaceDoc } from '@/lib/workspace/types';
import { cn } from '@/lib/cn';

type View = 'write' | 'draw';
type Save = 'saved' | 'saving' | 'dirty' | 'error';

export default function WorkspaceDocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<LanguageId>('markdown');
  const [content, setContent] = useState('');
  const [diagram, setDiagram] = useState<Diagram>(EMPTY_DIAGRAM);
  const [view, setView] = useState<View>('write');
  const [save, setSave] = useState<Save>('saved');

  const latest = useRef({ title, language, content, diagram });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);

  useEffect(() => {
    latest.current = { title, language, content, diagram };
  }, [title, language, content, diagram]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/workspace/${id}`)
      .then(async r => (r.ok ? ((await r.json()) as { doc: WorkspaceDoc }).doc : null))
      .then(doc => {
        if (!alive) return;
        if (!doc) return setLoaded('missing');
        setTitle(doc.title);
        setLanguage(doc.language);
        setContent(doc.content);
        setDiagram(doc.diagram);
        setView(doc.diagram.nodes.length && !doc.content.trim() ? 'draw' : 'write');
        setLoaded('ready');
      })
      .catch(() => alive && setLoaded('missing'));
    return () => {
      alive = false;
    };
  }, [id]);

  const flush = useCallback(
    async (keepalive = false) => {
      if (!dirty.current) return;
      dirty.current = false;
      setSave('saving');
      try {
        const res = await fetch(`/api/workspace/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(latest.current),
          keepalive,
        });
        if (!res.ok) throw new Error();
        setSave(dirty.current ? 'dirty' : 'saved');
      } catch {
        dirty.current = true;
        setSave('error');
      }
    },
    [id]
  );

  const touch = useCallback(() => {
    dirty.current = true;
    setSave('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), 1200);
  }, [flush]);

  // save what is pending when leaving the page
  useEffect(() => {
    const onHide = () => {
      clearTimeout(timer.current);
      flush(true);
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
  }, [flush]);

  const update = {
    title: (v: string) => { setTitle(v); latest.current.title = v; touch(); },
    language: (v: LanguageId) => { setLanguage(v); latest.current.language = v; touch(); },
    content: (v: string) => { setContent(v); latest.current.content = v; touch(); },
    diagram: (v: Diagram) => { setDiagram(v); latest.current.diagram = v; touch(); },
  };

  const remove = async () => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    dirty.current = false;
    const res = await fetch(`/api/workspace/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Document deleted');
      router.push('/workspace');
    } else toast.error('Could not delete the document');
  };

  if (loaded === 'loading') {
    return (
      <div className="page-container">
        <Skeleton className="mb-4 h-10 w-72" />
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }
  if (loaded === 'missing') {
    return (
      <div className="page-container">
        <EmptyState title="Document not found" description="It may have been deleted, or the link is wrong." action={<ButtonLink href="/workspace" variant="secondary">Back to workspace</ButtonLink>} />
      </div>
    );
  }

  const isNotes = language === 'markdown';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/workspace" aria-label="Back to workspace" className="rounded-control p-1.5 text-fg-3 transition-colors hover:bg-raised hover:text-fg">
          <ArrowLeft size={17} aria-hidden />
        </Link>
        <input
          value={title}
          onChange={e => update.title(e.target.value)}
          aria-label="Document title"
          maxLength={200}
          className="min-w-0 flex-1 basis-48 rounded-control bg-transparent px-2 py-1 text-lg font-semibold text-fg outline-none focus:bg-raised"
        />

        <div role="group" aria-label="View" className="flex rounded-control border border-line p-0.5">
          {([['write', isNotes ? 'Notes' : 'Code', SquareCode], ['draw', 'Diagram', Network]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn('flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm transition-colors', view === v ? 'bg-signal text-[var(--text-on-accent)]' : 'text-fg-2 hover:text-fg')}
            >
              <Icon size={14} aria-hidden /> {label}
            </button>
          ))}
        </div>

        <Select aria-label="Language" value={language} onChange={e => update.language(e.target.value as LanguageId)} className="w-auto">
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </Select>

        <span className="flex items-center gap-1.5 text-xs text-fg-3" role="status">
          {save === 'saved' && <><Check size={13} className="text-good" aria-hidden /> Saved</>}
          {save === 'saving' && 'Saving…'}
          {save === 'dirty' && 'Unsaved'}
          {save === 'error' && <button type="button" className="text-bad underline" onClick={() => { dirty.current = true; flush(); }}>Save failed. Retry</button>}
        </span>
        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(view === 'write' ? content : JSON.stringify(diagram, null, 2)); toast.success('Copied'); }} aria-label={view === 'write' ? 'Copy text' : 'Copy diagram data'}>
          <Copy size={14} aria-hidden />
        </Button>
        <Button size="sm" variant="ghost" onClick={remove} aria-label="Delete document"><Trash2 size={14} aria-hidden /></Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-h-[420px] min-w-0 lg:min-h-0">
          {view === 'write' ? (
            <CodeEditor
              value={content}
              language={language}
              onChange={update.content}
              placeholder={isNotes ? 'Write requirements, estimates and trade-offs…' : 'Write your code here'}
            />
          ) : (
            <DiagramCanvas diagram={diagram} onChange={update.diagram} />
          )}
        </div>
        <div className="min-h-[360px] lg:min-h-0">
          <AiPanel
            key={view}
            target={view === 'write' ? 'code' : 'diagram'}
            language={language}
            code={content}
            notes={content}
            diagram={diagram}
            docId={id}
            docTitle={title}
            onApplyCode={update.content}
            onDiagram={update.diagram}
            onInsertNotes={md => update.content(content.trim() ? `${content.trimEnd()}\n\n${md}\n` : `${md}\n`)}
          />
        </div>
      </div>
    </div>
  );
}

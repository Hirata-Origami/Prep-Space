'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, Columns2, Copy, Network, SquareCode, Trash2 } from 'lucide-react';
import { Button, ButtonLink, EmptyState, Select, Skeleton } from '@/components/ui';
import { CodeEditor } from '@/components/workspace/CodeEditor';
import { DiagramCanvas } from '@/components/workspace/DiagramCanvas';
import { CoachMenu } from '@/components/workspace/CoachMenu';
import { LiveDock } from '@/components/workspace/LiveDock';
import { useWorkspaceLive } from '@/lib/workspace/useLive';
import { EMPTY_DIAGRAM, LANGUAGES, type Diagram, type LanguageId, type WorkspaceDoc } from '@/lib/workspace/types';
import { cn } from '@/lib/cn';

type View = 'code' | 'diagram' | 'split';
type Save = 'saved' | 'saving' | 'dirty' | 'error';

export default function WorkspaceDocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<LanguageId>('markdown');
  const [content, setContent] = useState('');
  const [diagram, setDiagram] = useState<Diagram>(EMPTY_DIAGRAM);
  const [view, setView] = useState<View>('code');
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
        const hasDiagram = doc.diagram.nodes.length > 0;
        const hasText = doc.content.trim().length > 0;
        setView(hasDiagram && hasText ? 'split' : hasDiagram ? 'diagram' : doc.language === 'markdown' && !hasText ? 'split' : 'code');
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

  // Alex reads and writes the same state the editor and canvas use
  const live = useWorkspaceLive({
    getState: () => ({ title: latest.current.title, language: latest.current.language, code: latest.current.content, diagram: latest.current.diagram }),
    setCode: update.content,
    setDiagram: update.diagram,
    onAction: kind => setView(v => (v === 'split' ? v : kind === 'diagram' && v === 'code' ? 'split' : kind === 'code' && v === 'diagram' ? 'split' : v)),
  });

  const { syncContext } = live;
  useEffect(() => {
    syncContext();
  }, [content, diagram, language, syncContext]);

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
  const views = [
    { id: 'code' as const, label: isNotes ? 'Notes' : 'Code', icon: SquareCode },
    { id: 'split' as const, label: 'Both', icon: Columns2 },
    { id: 'diagram' as const, label: 'Diagram', icon: Network },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Link href="/workspace" aria-label="Back to workspace" className="rounded-control p-1.5 text-fg-3 transition-colors hover:bg-raised hover:text-fg">
          <ArrowLeft size={17} aria-hidden />
        </Link>
        <input
          value={title}
          onChange={e => update.title(e.target.value)}
          aria-label="Document title"
          maxLength={200}
          className="min-w-0 flex-1 basis-40 rounded-control bg-transparent px-2 py-1 text-lg font-semibold text-fg outline-none focus:bg-raised"
        />

        <div role="group" aria-label="View" className="flex rounded-control border border-line p-0.5">
          {views.map(({ id: v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn('flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-sm transition-colors', v === 'split' && 'hidden lg:flex', view === v ? 'bg-signal text-[var(--text-on-accent)]' : 'text-fg-2 hover:text-fg')}
            >
              <Icon size={14} aria-hidden /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <Select aria-label="Language" value={language} onChange={e => update.language(e.target.value as LanguageId)} className="h-9 w-auto">
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </Select>

        <CoachMenu
          target={view === 'diagram' ? 'diagram' : 'code'}
          language={language}
          code={content}
          diagram={diagram}
          docId={id}
          onApplyCode={update.content}
          onInsertNotes={(md: string) => update.content(content.trim() ? `${content.trimEnd()}\n\n${md}\n` : `${md}\n`)}
        />

        <span className="flex items-center gap-1.5 text-xs text-fg-3" role="status">
          {save === 'saved' && <><Check size={13} className="text-good" aria-hidden /> Saved</>}
          {save === 'saving' && 'Saving…'}
          {save === 'dirty' && 'Unsaved'}
          {save === 'error' && <button type="button" className="text-bad underline" onClick={() => { dirty.current = true; flush(); }}>Save failed. Retry</button>}
        </span>
        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(view === 'diagram' ? JSON.stringify(diagram, null, 2) : content); toast.success('Copied'); }} aria-label="Copy"><Copy size={15} aria-hidden /></Button>
        <Button size="icon" variant="ghost" onClick={remove} aria-label="Delete document"><Trash2 size={15} aria-hidden /></Button>
      </div>

      <div className={cn('grid min-h-[300px] min-w-0 flex-1 gap-3', view === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1')}>
        {view !== 'diagram' && (
          <div className="min-h-0 min-w-0">
            <CodeEditor value={content} language={language} onChange={update.content} placeholder={isNotes ? 'Write requirements, estimates and trade-offs…' : 'Write your code here'} />
          </div>
        )}
        {view !== 'code' && (
          <div className="min-h-0 min-w-0">
            <DiagramCanvas diagram={diagram} onChange={update.diagram} />
          </div>
        )}
      </div>

      <LiveDock
        status={live.status}
        error={live.error}
        entries={live.entries}
        speaking={live.speaking}
        muted={live.muted}
        micLevel={live.micLevel}
        view={view}
        onStart={live.start}
        onStop={live.stop}
        onToggleMute={live.toggleMute}
        onSend={live.sendText}
      />
    </div>
  );
}

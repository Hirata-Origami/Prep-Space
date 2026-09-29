'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Braces, Database, FileText, Network, Shapes } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { LANGUAGES, type LanguageId } from '@/lib/workspace/types';

interface DocRow {
  id: string;
  title: string;
  language: LanguageId;
  preview: string;
  nodeCount: number;
  updated_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TEMPLATES: { id: string; title: string; description: string; icon: typeof Database; body: { title: string; language: LanguageId; content: string } }[] = [
  {
    id: 'design',
    title: 'System design',
    description: 'Notes beside a diagram. Ask the AI to draw the architecture.',
    icon: Network,
    body: {
      title: 'System design',
      language: 'markdown',
      content: '# Requirements\n- Functional:\n- Non-functional (scale, latency, availability):\n\n# Estimates\n- Users, requests per second, storage:\n\n# API\n\n# Data model\n\n# Trade-offs\n',
    },
  },
  {
    id: 'sql',
    title: 'SQL practice',
    description: 'Write queries and get them reviewed, optimised or explained.',
    icon: Database,
    body: { title: 'SQL practice', language: 'sql', content: '-- Top 3 customers by revenue in the last 30 days\nSELECT c.name, SUM(o.total) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.created_at >= now() - interval \'30 days\'\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 3;\n' },
  },
  {
    id: 'code',
    title: 'Coding problem',
    description: 'Paste a problem, solve it, and have the coach check it.',
    icon: Braces,
    body: { title: 'Coding problem', language: 'python', content: '# Problem: given a list of intervals, merge all overlapping ones.\n\ndef merge(intervals):\n    pass\n' },
  },
  {
    id: 'blank',
    title: 'Blank page',
    description: 'A free canvas for notes and sketches.',
    icon: Shapes,
    body: { title: 'Untitled', language: 'markdown', content: '' },
  },
];

const langLabel = (id: string) => LANGUAGES.find(l => l.id === id)?.label ?? id;

export default function WorkspacePage() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<{ docs: DocRow[]; setupNeeded?: boolean; error?: string }>('/api/workspace', fetcher);
  const [creating, setCreating] = useState<string | null>(null);

  const create = async (t: (typeof TEMPLATES)[number]) => {
    setCreating(t.id);
    try {
      const res = await fetch('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/workspace/${json.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create the document');
      setCreating(null);
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Workspace" description="Write code and SQL, sketch architectures, and have the AI write or draw alongside you." />

      {data?.setupNeeded && (
        <Card className="mb-6 border-live/40 bg-live/5 text-sm text-fg-2">
          The workspace table does not exist yet. Open the Supabase SQL editor and run <code className="font-mono text-fg">supabase/migrations/003_workspace.sql</code>, then reload this page.
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold text-fg">Start with</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" disabled={!!creating || data?.setupNeeded} onClick={() => create(t)} className="group rounded-panel border border-line bg-panel p-4 text-left transition-colors hover:border-line-strong disabled:opacity-60">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-signal/12 text-signal"><Icon size={17} aria-hidden /></div>
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">{t.title}{creating === t.id && <span className="live-dot" aria-hidden />}</div>
              <p className="mt-1 text-[13px] leading-snug text-fg-3">{t.description}</p>
            </button>
          );
        })}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-fg">Your documents</h2>
      {isLoading && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>}
      {error && <ErrorState title="Could not load your documents" description="Check your connection and try again." />}
      {data && !data.setupNeeded && data.docs.length === 0 && (
        <EmptyState icon={<FileText size={20} aria-hidden />} title="Nothing here yet" description="Pick a starting point above. Everything saves automatically." />
      )}
      {data && data.docs.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.docs.map(d => (
            <li key={d.id}>
              <Link href={`/workspace/${d.id}`} className="block h-full rounded-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50">
                <Card className="h-full transition-colors hover:border-line-strong">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-fg">{d.title}</h3>
                    <Badge>{langLabel(d.language)}</Badge>
                  </div>
                  <p className="line-clamp-2 min-h-[2.5rem] font-mono text-xs leading-relaxed text-fg-3">{d.preview || 'Empty'}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-fg-3">
                    {d.nodeCount > 0 && <span className="inline-flex items-center gap-1"><Network size={12} aria-hidden /> {d.nodeCount} shapes</span>}
                    <span className="ml-auto">{new Date(d.updated_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

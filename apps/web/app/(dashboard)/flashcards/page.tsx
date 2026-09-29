'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { CheckCircle2, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Progress, Select, Skeleton, Textarea } from '@/components/ui';
import { calculateSM2, type ReviewRating } from '@/lib/flashcards/sm2';
import { cn } from '@/lib/cn';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: Difficulty;
  interval: number;
  repetition: number;
  ease_factor: number;
  due_date: string | null;
}

interface FlashcardsResponse {
  cards: Flashcard[];
  dueCards: Flashcard[];
  stats: { total: number; dueToday: number; mastered: number; learning: number };
  setupNeeded?: boolean;
  error?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Could not load flashcards');
  return json as FlashcardsResponse;
};

const RATINGS: { value: ReviewRating; label: string; tone: string }[] = [
  { value: 1, label: 'Again', tone: 'hover:border-bad/60 hover:bg-bad/5' },
  { value: 2, label: 'Hard', tone: 'hover:border-live/60 hover:bg-live/5' },
  { value: 3, label: 'Good', tone: 'hover:border-good/60 hover:bg-good/5' },
  { value: 4, label: 'Easy', tone: 'hover:border-signal/60 hover:bg-signal/5' },
];

const DIFFICULTY_TONE: Record<Difficulty, 'good' | 'live' | 'bad'> = { easy: 'good', medium: 'live', hard: 'bad' };

const today = () => new Date().toISOString().slice(0, 10);

/** "tomorrow", "in 6 days": what a rating will do, computed from the same SM-2 the server uses. */
function preview(card: Flashcard, rating: ReviewRating) {
  const { interval } = calculateSM2({ interval: card.interval || 1, repetition: card.repetition || 0, easeFactor: card.ease_factor || 2.5 }, rating);
  return interval <= 1 ? 'tomorrow' : interval < 30 ? `in ${interval} days` : `in ${Math.round(interval / 30)} mo`;
}

function dueLabel(due: string | null) {
  if (!due || due <= today()) return { text: 'Due', tone: 'signal' as const };
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  return { text: days <= 1 ? 'Tomorrow' : `In ${days} days`, tone: 'neutral' as const };
}

export default function FlashcardsPage() {
  const { data, error, mutate, isLoading } = useSWR('/api/flashcards', fetcher);

  const [queue, setQueue] = useState<string[] | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [total, setTotal] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const cards = useMemo(() => data?.cards ?? [], [data]);
  const byId = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);
  const dueIds = useMemo(() => (data?.dueCards ?? []).map(c => c.id), [data]);

  const current = queue?.length ? byId.get(queue[0]) : undefined;
  const inSession = queue !== null;

  const start = () => {
    setQueue(dueIds);
    setTotal(dueIds.length);
    setReviewed(0);
    setRevealed(false);
  };

  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (!current || !queue || busy) return;
      setBusy(true);
      try {
        const res = await fetch('/api/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'review', id: current.id, rating }),
        });
        if (!res.ok) throw new Error();
        // "Again" comes back at the end of this session
        setQueue(q => (q ? (rating === 1 ? [...q.slice(1), q[0]] : q.slice(1)) : q));
        if (rating !== 1) setReviewed(n => n + 1);
        setRevealed(false);
      } catch {
        toast.error('Could not save that answer. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [current, queue, busy]
  );

  // finished: refresh the deck so due counts are right
  const finished = inSession && queue.length === 0;
  useEffect(() => {
    if (finished) mutate();
  }, [finished, mutate]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [role="dialog"]')) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        rate(Number(e.key) as ReviewRating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, rate]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/flashcards/generate', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not create cards');
      toast.success(`Added ${json.count} ${json.count === 1 ? 'card' : 'cards'} from your recent reports`);
      setQueue(null);
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create cards');
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/flashcards?id=${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    if (res.ok) {
      toast.success('Card deleted');
      setQueue(q => (q ? q.filter(x => x !== id) : q));
      mutate();
    } else toast.error('Could not delete the card');
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(cards.map(c => c.category)))], [cards]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter(c => (filter === 'All' || c.category === filter) && (!q || `${c.question} ${c.answer}`.toLowerCase().includes(q)));
  }, [cards, filter, query]);

  const stats = data?.stats;

  return (
    <div className="page-container">
      <PageHeader
        title="Flashcards"
        description="Recall cards built from the questions you missed. Each answer you give sets when a card comes back."
        action={
          <>
            <Button variant="secondary" onClick={generate} loading={generating} disabled={data?.setupNeeded}>
              <Sparkles size={15} aria-hidden /> Make cards from my reports
            </Button>
            <Button onClick={() => setAdding(true)} disabled={data?.setupNeeded}>
              <Plus size={15} aria-hidden /> New card
            </Button>
          </>
        }
      />

      {data?.setupNeeded && (
        <Card className="mb-6 border-live/40 bg-live/5 text-sm text-fg-2">{data.error}</Card>
      )}
      {error && <ErrorState title="Could not load your flashcards" description={error.message} onRetry={() => mutate()} />}

      {isLoading && <Skeleton className="h-64" />}

      {data && !data.setupNeeded && (
        <>
          <Card className="mb-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-line">
            <Stat2 label="Due today" value={stats?.dueToday ?? 0} accent />
            <Stat2 label="Learning" value={stats?.learning ?? 0} />
            <Stat2 label="Mastered" value={stats?.mastered ?? 0} hint="Interval of 21 days or more" />
            <Stat2 label="In deck" value={stats?.total ?? 0} />
          </Card>

          {/* review */}
          <section aria-label="Review" className="mb-12">
            {!inSession && dueIds.length > 0 && (
              <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-fg">{dueIds.length} {dueIds.length === 1 ? 'card is' : 'cards are'} due</h2>
                  <p className="mt-1 text-sm text-fg-3">About {Math.max(1, Math.round(dueIds.length * 0.5))} {Math.max(1, Math.round(dueIds.length * 0.5)) === 1 ? 'minute' : 'minutes'}. Try to answer out loud before you reveal.</p>
                </div>
                <Button onClick={start} size="lg">Start review</Button>
              </Card>
            )}

            {!inSession && dueIds.length === 0 && (
              <EmptyState
                icon={<CheckCircle2 size={20} aria-hidden />}
                title={cards.length ? 'Nothing due right now' : 'No cards yet'}
                description={cards.length ? 'Come back tomorrow, or add more cards from your latest interview.' : 'Finish an interview and PrepSpace will turn the questions you missed into cards. You can also write your own.'}
                action={<Button onClick={generate} loading={generating}><Sparkles size={15} aria-hidden /> Make cards from my reports</Button>}
              />
            )}

            {current && (
              <div className="mx-auto max-w-2xl">
                <div className="mb-3 flex items-center gap-3">
                  <Progress value={total ? Math.round((reviewed / total) * 100) : 0} className="flex-1" />
                  <span className="font-mono text-xs text-fg-3">{reviewed}/{total}</span>
                </div>
                <Card padded={false} className="overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-line px-5 py-3">
                    <Badge>{current.category}</Badge>
                    <Badge tone={DIFFICULTY_TONE[current.difficulty] ?? 'neutral'}>{current.difficulty}</Badge>
                    <span className="ml-auto text-xs text-fg-3">{revealed ? 'Answer' : 'Question'}</span>
                  </div>
                  <div className="min-h-[220px] px-6 py-7" aria-live="polite">
                    <p className="text-lg font-medium leading-relaxed text-fg">{current.question}</p>
                    {revealed && <p className="mt-6 border-t border-line pt-6 text-[15px] leading-relaxed text-fg-2">{current.answer}</p>}
                  </div>
                </Card>

                {!revealed ? (
                  <Button className="mt-4 w-full" size="lg" variant="secondary" onClick={() => setRevealed(true)}>
                    Show answer <kbd className="ml-2 rounded border border-line px-1.5 font-mono text-[11px] text-fg-3">Space</kbd>
                  </Button>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {RATINGS.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        disabled={busy}
                        onClick={() => rate(r.value)}
                        className={cn('rounded-panel border border-line bg-panel px-3 py-3 text-center transition-colors disabled:opacity-50', r.tone)}
                      >
                        <span className="block text-sm font-semibold text-fg">{r.label}</span>
                        <span className="mt-0.5 block text-xs text-fg-3">{preview(current, r.value)}</span>
                        <kbd className="mt-1 inline-block font-mono text-[10px] text-fg-3">{r.value}</kbd>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {finished && (
              <EmptyState
                icon={<CheckCircle2 size={20} aria-hidden />}
                title="Review finished"
                description={`You went through ${total} ${total === 1 ? 'card' : 'cards'}. They will come back when they are due.`}
                action={<Button variant="secondary" onClick={() => setQueue(null)}>Done</Button>}
              />
            )}
          </section>

          {/* deck */}
          {cards.length > 0 && (
            <section aria-label="Deck">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="mr-auto text-base font-semibold text-fg">Deck</h2>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden />
                  <Input aria-label="Search cards" placeholder="Search cards" value={query} onChange={e => setQuery(e.target.value)} className="h-9 w-52 pl-8" />
                </div>
                {categories.length > 2 && (
                  <Select aria-label="Category" value={filter} onChange={e => setFilter(e.target.value)} className="h-9 w-auto">
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </Select>
                )}
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
                {shown.map(c => {
                  const due = dueLabel(c.due_date);
                  return (
                    <li key={c.id} className="flex items-start gap-4 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg">{c.question}</p>
                        <details className="group mt-1">
                          <summary className="cursor-pointer text-[13px] text-fg-3 hover:text-fg-2">Show answer</summary>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">{c.answer}</p>
                        </details>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge>{c.category}</Badge>
                          <Badge tone={due.tone}>{due.text}</Badge>
                        </div>
                      </div>
                      {confirmDelete === c.id ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button size="sm" variant="danger" onClick={() => remove(c.id)}>Delete</Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Keep</Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" aria-label={`Delete card: ${c.question}`} onClick={() => setConfirmDelete(c.id)}>
                          <Trash2 size={15} aria-hidden />
                        </Button>
                      )}
                    </li>
                  );
                })}
                {shown.length === 0 && <li className="px-4 py-8 text-center text-sm text-fg-3">No cards match.</li>}
              </ul>
            </section>
          )}
        </>
      )}

      <NewCardModal open={adding} onOpenChange={setAdding} onSaved={() => { setQueue(null); mutate(); }} />
    </div>
  );
}

function Stat2({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div className="min-w-0 sm:pl-6 sm:first:pl-0">
      <div className="text-[13px] text-fg-3">{label}</div>
      <div className={cn('font-mono text-[28px] font-semibold leading-tight', accent && value > 0 ? 'text-signal' : 'text-fg')}>{value}</div>
      {hint && <div className="text-xs text-fg-3">{hint}</div>}
    </div>
  );
}

function NewCardModal({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', question, answer, category: category || 'Custom', difficulty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Card added');
      setQuestion('');
      setAnswer('');
      setCategory('');
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not add the card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New card"
      description="One idea per card. The question should be answerable in a few sentences."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!question.trim() || !answer.trim()}>Add card</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question">{a => <Textarea {...a} rows={2} value={question} onChange={e => setQuestion(e.target.value)} placeholder="What does write-ahead logging protect against?" />}</Field>
        <Field label="Answer">{a => <Textarea {...a} rows={3} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Changes reach a sequential log before data files, so a crash can be replayed." />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">{a => <Input {...a} value={category} onChange={e => setCategory(e.target.value)} placeholder="Databases" />}</Field>
          <Field label="Difficulty">
            {a => (
              <Select {...a} value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            )}
          </Field>
        </div>
      </div>
    </Modal>
  );
}

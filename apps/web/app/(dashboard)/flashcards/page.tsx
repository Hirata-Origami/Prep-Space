'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  interval: number;
  repetition: number;
  ease_factor: number;
  due_date: string;
}

interface FlashcardsResponse {
  cards: Flashcard[];
  dueCards: Flashcard[];
  stats: {
    total: number;
    dueToday: number;
    mastered: number;
    learning: number;
  };
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function FlashcardsPage() {
  const { data, mutate, isLoading } = useSWR<FlashcardsResponse>('/api/flashcards', fetcher);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [savingCard, setSavingCard] = useState(false);

  const dueCards = data?.dueCards ?? [];
  const currentCard = dueCards[currentIndex];

  const handleReview = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard || reviewing) return;
    setReviewing(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', id: currentCard.id, rating }),
      });
      if (!res.ok) throw new Error();

      setIsFlipped(false);
      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success("Awesome! You've reviewed all cards due today.");
        mutate();
      }
    } catch {
      toast.error('Failed to save review');
    } finally {
      setReviewing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/flashcards/generate', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate cards');
      toast.success(`Generated ${json.count} flashcards from your interview weak spots!`);
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setSavingCard(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          question: newQuestion,
          answer: newAnswer,
          category: newCategory || 'Custom',
          difficulty: newDifficulty,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Card added');
      setNewQuestion('');
      setNewAnswer('');
      setNewCategory('');
      setShowAddModal(false);
      mutate();
    } catch {
      toast.error('Failed to create card');
    } finally {
      setSavingCard(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    try {
      const res = await fetch(`/api/flashcards?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Card deleted');
        mutate();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="page-container space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Spaced-Repetition Flashcards"
          description="Master high-frequency concepts and weak spots identified in your AI interviews using the SM-2 spaced repetition algorithm."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={generating}
            onClick={handleGenerate}
            className="flex items-center gap-2"
          >
            <Sparkles size={15} className="text-signal" />
            {generating ? 'Analyzing weak areas…' : 'Generate from Weak Areas'}
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5">
            <Plus size={16} /> New Card
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-signal/10 text-signal">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-fg">{data?.stats.dueToday ?? 0}</div>
            <div className="text-xs text-fg-3">Cards Due Today</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-fg">{data?.stats.mastered ?? 0}</div>
            <div className="text-xs text-fg-3">Mastered (21d+ interval)</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-amber-500/10 text-amber-400">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-fg">{data?.stats.learning ?? 0}</div>
            <div className="text-xs text-fg-3">Learning & In Progress</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-purple-500/10 text-purple-400">
            <BrainCircuit size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-fg">{data?.stats.total ?? 0}</div>
            <div className="text-xs text-fg-3">Total In Deck</div>
          </div>
        </Card>
      </div>

      {/* Active Review Session */}
      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : dueCards.length > 0 && currentCard ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-between text-xs text-fg-3">
            <span>
              Reviewing Card {currentIndex + 1} of {dueCards.length}
            </span>
            <span className="flex items-center gap-1">
              <Badge>{currentCard.category}</Badge>
              <Badge>{currentCard.difficulty}</Badge>
            </span>
          </div>

          {/* Flashcard with Flip Animation */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="group relative min-h-[260px] cursor-pointer rounded-panel border border-line bg-panel p-6 shadow-sm transition-all hover:border-line-strong hover:shadow-md"
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIsFlipped(!isFlipped);
              }
            }}
          >
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-signal">
                  {isFlipped ? 'Answer & Intuition' : 'Question'}
                </div>
                <div className="mt-4 text-base font-medium leading-relaxed text-fg sm:text-lg">
                  {isFlipped ? currentCard.answer : currentCard.question}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-fg-3">
                <span className="flex items-center gap-1.5 text-fg-2">
                  <RotateCw size={13} className="text-signal" /> Click or spacebar to flip
                </span>
                <span>Current interval: {currentCard.interval || 1}d</span>
              </div>
            </div>
          </div>

          {/* SM-2 Rating Controls */}
          {isFlipped && (
            <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in">
              <Button
                variant="secondary"
                disabled={reviewing}
                onClick={() => handleReview(1)}
                className="flex flex-col py-3 text-center border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5"
              >
                <span className="text-xs font-bold text-rose-400">Again</span>
                <span className="text-[10px] text-fg-3">1 day</span>
              </Button>
              <Button
                variant="secondary"
                disabled={reviewing}
                onClick={() => handleReview(2)}
                className="flex flex-col py-3 text-center border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5"
              >
                <span className="text-xs font-bold text-amber-400">Hard</span>
                <span className="text-[10px] text-fg-3">~2 days</span>
              </Button>
              <Button
                variant="secondary"
                disabled={reviewing}
                onClick={() => handleReview(3)}
                className="flex flex-col py-3 text-center border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5"
              >
                <span className="text-xs font-bold text-emerald-400">Good</span>
                <span className="text-[10px] text-fg-3">~6 days</span>
              </Button>
              <Button
                variant="secondary"
                disabled={reviewing}
                onClick={() => handleReview(4)}
                className="flex flex-col py-3 text-center border-signal/20 hover:border-signal/50 hover:bg-signal/5"
              >
                <span className="text-xs font-bold text-signal">Easy</span>
                <span className="text-[10px] text-fg-3">~12 days</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircle2 size={24} className="text-emerald-400" />}
          title="All caught up on reviews!"
          description="You have no flashcards due today. Generate new cards from recent interview weak spots or add custom cards."
          action={
            <Button disabled={generating} onClick={handleGenerate} className="gap-2">
              <Sparkles size={14} /> Generate from Weak Areas
            </Button>
          }
        />
      )}

      {/* Deck Card Management */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-fg">Deck Library ({data?.cards?.length ?? 0} cards)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.cards?.map(card => (
            <Card key={card.id} className="flex flex-col justify-between p-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge>{card.category}</Badge>
                  <span className="text-[11px] text-fg-3">Next: {card.due_date || 'Today'}</span>
                </div>
                <h3 className="line-clamp-2 text-sm font-medium text-fg">{card.question}</h3>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-fg-3">{card.answer}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-2.5 text-[11px] text-fg-3">
                <span>Repetitions: {card.repetition || 0}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(card.id)}
                  className="rounded p-1 text-fg-3 transition-colors hover:text-rose-400"
                  aria-label="Delete card"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Custom Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg space-y-4 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-semibold text-fg">Add Custom Flashcard</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-fg-3 hover:text-fg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-medium text-fg-2">Question</label>
                <textarea
                  required
                  rows={2}
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  placeholder="e.g. Explain write-ahead logging (WAL) in Postgres and its benefit."
                  className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-fg-2">Answer</label>
                <textarea
                  required
                  rows={3}
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value)}
                  placeholder="e.g. WAL ensures changes are appended sequentially to a log on disk before data files are modified, ensuring crash recovery and ACID durability."
                  className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Category</label>
                  <input
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="e.g. Databases"
                    className="w-full rounded-control border border-line bg-panel p-2 text-fg outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={e => setNewDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full rounded-control border border-line bg-panel p-2 text-fg outline-none focus:border-signal"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={savingCard}>
                  Save Card
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

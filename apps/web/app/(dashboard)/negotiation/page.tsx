'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  Building2,
  DollarSign,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

interface Offer {
  id: string;
  company: string;
  role: string;
  level?: string;
  base_salary: number;
  equity: number;
  bonus: number;
  signing_bonus: number;
  currency: string;
  location: string;
  notes?: string;
  counter_script?: string;
  market_benchmark?: Record<string, unknown>;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);

const totalComp = (o: Offer) => (o.base_salary || 0) + (o.bonus || 0) + (o.signing_bonus || 0);

export default function NegotiationPage() {
  const { data, mutate, isLoading } = useSWR<{ offers: Offer[] }>('/api/negotiation', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [coachingId, setCoachingId] = useState<string | null>(null);
  const [coachingOffer, setCoachingOffer] = useState<Offer | null>(null);
  const [script, setScript] = useState('');
  const [coaching, setCoaching] = useState(false);

  // Form state
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [base, setBase] = useState('');
  const [equity, setEquity] = useState('');
  const [bonus, setBonus] = useState('');
  const [signing, setSigning] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditingOffer(null);
    setCompany(''); setRole(''); setLevel(''); setBase(''); setEquity('');
    setBonus(''); setSigning(''); setCurrency('USD'); setLocation(''); setNotes('');
    setShowForm(true);
  };

  const openEdit = (o: Offer) => {
    setEditingOffer(o);
    setCompany(o.company); setRole(o.role); setLevel(o.level || '');
    setBase(String(o.base_salary || '')); setEquity(String(o.equity || ''));
    setBonus(String(o.bonus || '')); setSigning(String(o.signing_bonus || ''));
    setCurrency(o.currency || 'USD'); setLocation(o.location || ''); setNotes(o.notes || '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      toast.error('Company and role are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOffer?.id,
          company, role, level,
          base_salary: Number(base) || 0,
          equity: Number(equity) || 0,
          bonus: Number(bonus) || 0,
          signing_bonus: Number(signing) || 0,
          currency, location, notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editingOffer ? 'Offer updated' : 'Offer added');
      setShowForm(false);
      mutate();
    } catch {
      toast.error('Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    try {
      const res = await fetch(`/api/negotiation?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Offer deleted'); mutate(); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleCoach = async (offer: Offer) => {
    setCoachingId(offer.id);
    setCoachingOffer(offer);
    setScript(offer.counter_script || '');
    if (offer.counter_script) return; // already coached, just show
    setCoaching(true);
    try {
      const res = await fetch('/api/negotiation/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Coaching failed');
      setScript(json.counter_script || '');
      toast.success('Negotiation script ready!');
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Coach failed');
    } finally {
      setCoaching(false);
    }
  };

  const offers = data?.offers ?? [];
  const bestOffer = offers.length > 0
    ? offers.reduce((a, b) => totalComp(a) > totalComp(b) ? a : b)
    : null;

  return (
    <div className="page-container space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Salary & Offer Coach"
          description="Track competing offers side-by-side, benchmark compensation, and get AI-written counter-offer scripts that maximise your total package."
        />
        <Button onClick={openNew} className="flex items-center gap-1.5">
          <Plus size={16} /> Add Offer
        </Button>
      </div>

      {/* Summary stats */}
      {offers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-signal/10 text-signal">
              <Target size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-fg">{offers.length}</div>
              <div className="text-xs text-fg-3">Offers Tracked</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-fg">
                {bestOffer ? fmt(totalComp(bestOffer), bestOffer.currency) : '—'}
              </div>
              <div className="text-xs text-fg-3">Best Total Comp</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-amber-500/10 text-amber-400">
              <ArrowUpDown size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-fg">
                {offers.length > 1
                  ? fmt(Math.max(...offers.map(totalComp)) - Math.min(...offers.map(totalComp)), offers[0]?.currency)
                  : '—'}
              </div>
              <div className="text-xs text-fg-3">Spread Across Offers</div>
            </div>
          </Card>
        </div>
      )}

      {/* Offer grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map(i => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={24} className="text-signal" />}
          title="No offers tracked yet"
          description="Add your first offer to compare packages and get a personalised AI counter-offer script."
          action={
            <Button onClick={openNew} className="gap-1.5">
              <Plus size={15} /> Add First Offer
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {offers.map(o => {
            const tc = totalComp(o);
            const isBest = bestOffer?.id === o.id && offers.length > 1;
            return (
              <Card
                key={o.id}
                className={cn(
                  'flex flex-col justify-between p-5 space-y-4 transition-all',
                  isBest && 'border-signal/40 ring-1 ring-signal/20'
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-fg">{o.company}</h3>
                        {isBest && <Badge className="bg-signal/10 text-signal border-signal/20 text-[10px]">Best</Badge>}
                      </div>
                      <div className="text-sm text-fg-2 mt-0.5">{o.role}{o.level ? ` · ${o.level}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(o)} aria-label="Edit"><Pencil size={13} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(o.id)} className="text-fg-3 hover:text-rose-400" aria-label="Delete"><Trash2 size={13} /></Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-control bg-raised/60 p-2.5">
                      <div className="text-fg-3 mb-0.5">Base</div>
                      <div className="font-semibold text-fg">{fmt(o.base_salary, o.currency)}</div>
                    </div>
                    <div className="rounded-control bg-raised/60 p-2.5">
                      <div className="text-fg-3 mb-0.5">Bonus</div>
                      <div className="font-semibold text-fg">{fmt(o.bonus, o.currency)}</div>
                    </div>
                    <div className="rounded-control bg-raised/60 p-2.5">
                      <div className="text-fg-3 mb-0.5">Equity / yr</div>
                      <div className="font-semibold text-fg">{fmt(o.equity, o.currency)}</div>
                    </div>
                    <div className="rounded-control bg-raised/60 p-2.5">
                      <div className="text-fg-3 mb-0.5">Signing</div>
                      <div className="font-semibold text-fg">{fmt(o.signing_bonus, o.currency)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/60 pt-2.5 text-xs">
                    <span className="flex items-center gap-1 text-fg-3">
                      <MapPin size={11} /> {o.location || 'Remote'}
                    </span>
                    <span className="font-semibold text-signal">
                      Total: {fmt(tc, o.currency)}/yr
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full flex items-center justify-center gap-1.5 text-signal border-signal/20 hover:border-signal/50 hover:bg-signal/5"
                  onClick={() => handleCoach(o)}
                >
                  <Sparkles size={14} />
                  {o.counter_script ? 'View Counter Script' : 'Generate Counter Script'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-xl space-y-4 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-semibold text-fg">
                {editingOffer ? 'Edit Offer' : 'Add Offer'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-fg-3 hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Company *</label>
                  <input
                    required value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Google" className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Role *</label>
                  <input
                    required value={role} onChange={e => setRole(e.target.value)}
                    placeholder="e.g. Senior Software Engineer" className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Level</label>
                  <input
                    value={level} onChange={e => setLevel(e.target.value)}
                    placeholder="e.g. L5, IC4, Staff" className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-field w-full">
                    {['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Base Salary / yr</label>
                  <input
                    type="number" min="0" value={base} onChange={e => setBase(e.target.value)}
                    placeholder="180000" className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Annual Bonus / yr</label>
                  <input
                    type="number" min="0" value={bonus} onChange={e => setBonus(e.target.value)}
                    placeholder="25000" className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Equity (annualised)</label>
                  <input
                    type="number" min="0" value={equity} onChange={e => setEquity(e.target.value)}
                    placeholder="50000" className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-fg-2">Signing Bonus</label>
                  <input
                    type="number" min="0" value={signing} onChange={e => setSigning(e.target.value)}
                    placeholder="30000" className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-fg-2">Location</label>
                <input
                  value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA / Remote" className="input-field w-full"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-fg-2">Notes (context for AI coach)</label>
                <textarea
                  rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Competing offers? Timeline? Leverage points?"
                  className="input-field w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>Save Offer</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Counter-offer Script Modal */}
      {coachingId && coachingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-2xl space-y-4 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-semibold text-fg flex items-center gap-2">
                  <MessageSquare size={17} className="text-signal" />
                  Counter-Offer Script
                </h3>
                <div className="text-xs text-fg-3 mt-0.5">
                  {coachingOffer.company} · {coachingOffer.role}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setCoachingId(null); setCoachingOffer(null); setScript(''); }}
                className="text-fg-3 hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            {coaching ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-fg-3">
                <Sparkles size={28} className="text-signal animate-pulse" />
                <p className="text-sm">Analysing your offer and crafting a negotiation script…</p>
              </div>
            ) : script ? (
              <div className="space-y-4">
                <div className="rounded-panel border border-signal/20 bg-signal/5 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-signal flex items-center gap-1.5">
                    <Building2 size={12} /> AI Negotiation Coach
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg-2">{script}</div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(script);
                      toast.success('Script copied!');
                    }}
                  >
                    Copy Script
                  </Button>
                  <Button
                    onClick={() => handleCoach(coachingOffer)}
                    className="gap-1.5"
                    disabled={coaching}
                  >
                    <Sparkles size={13} /> Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-fg-3">
                No script generated yet.
                <Button onClick={() => handleCoach(coachingOffer)} className="ml-2 gap-1.5" disabled={coaching}>
                  <Sparkles size={13} /> Generate Now
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

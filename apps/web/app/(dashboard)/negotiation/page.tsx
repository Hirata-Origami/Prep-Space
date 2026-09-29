'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Copy, DollarSign, MapPin, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

interface Offer {
  id: string;
  company: string;
  role: string;
  level?: string | null;
  base_salary: number;
  equity: number;
  bonus: number;
  signing_bonus: number;
  currency: string;
  location: string | null;
  notes?: string | null;
  counter_script?: string | null;
  created_at: string;
}

interface Draft {
  id?: string;
  company: string;
  role: string;
  level: string;
  currency: string;
  base_salary: string;
  bonus: string;
  equity: string;
  signing_bonus: string;
  location: string;
  notes: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD'];
const EMPTY: Draft = { company: '', role: '', level: '', currency: 'USD', base_salary: '', bonus: '', equity: '', signing_bonus: '', location: '', notes: '' };

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Could not load your offers');
  return json as { offers: Offer[]; setupNeeded?: boolean; error?: string };
};

const money = (n: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);

/** Cash you receive in year one. Equity is left out because its value is uncertain. */
const yearOne = (o: Offer) => (o.base_salary || 0) + (o.bonus || 0) + (o.signing_bonus || 0);
/** A normal year after the signing bonus, including equity that vests per year. */
const ongoing = (o: Offer) => (o.base_salary || 0) + (o.bonus || 0) + (o.equity || 0);

const ROWS: { label: string; hint?: string; value: (o: Offer) => number }[] = [
  { label: 'Base salary', value: o => o.base_salary },
  { label: 'Annual bonus', value: o => o.bonus },
  { label: 'Equity per year', value: o => o.equity },
  { label: 'Signing bonus', hint: 'One time', value: o => o.signing_bonus },
  { label: 'Cash in year one', hint: 'Base, bonus and signing', value: yearOne },
  { label: 'Yearly with equity', hint: 'Base, bonus and equity', value: ongoing },
];

export default function NegotiationPage() {
  const { data, error, mutate, isLoading } = useSWR('/api/negotiation', fetcher);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [coaching, setCoaching] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const offers = useMemo(() => data?.offers ?? [], [data]);
  const comparable = offers.length >= 2 && new Set(offers.map(o => o.currency)).size === 1;

  const remove = async (id: string) => {
    const res = await fetch(`/api/negotiation?id=${id}`, { method: 'DELETE' });
    setDeleting(null);
    if (res.ok) {
      toast.success('Offer deleted');
      mutate();
    } else toast.error('Could not delete the offer');
  };

  const edit = (o: Offer) =>
    setEditing({
      id: o.id, company: o.company, role: o.role, level: o.level ?? '', currency: o.currency,
      base_salary: o.base_salary ? String(o.base_salary) : '', bonus: o.bonus ? String(o.bonus) : '',
      equity: o.equity ? String(o.equity) : '', signing_bonus: o.signing_bonus ? String(o.signing_bonus) : '',
      location: o.location ?? '', notes: o.notes ?? '',
    });

  return (
    <div className="page-container">
      <PageHeader
        title="Offer coach"
        description="Keep your offers side by side and get a counter-offer email written around your numbers."
        action={<Button onClick={() => setEditing({ ...EMPTY })} disabled={data?.setupNeeded}><Plus size={15} aria-hidden /> Add an offer</Button>}
      />

      {data?.setupNeeded && <Card className="mb-6 border-live/40 bg-live/5 text-sm text-fg-2">{data.error}</Card>}
      {error && <ErrorState title="Could not load your offers" description={error.message} onRetry={() => mutate()} />}
      {isLoading && <Skeleton className="h-56" />}

      {data && !data.setupNeeded && offers.length === 0 && (
        <EmptyState
          icon={<DollarSign size={20} aria-hidden />}
          title="No offers yet"
          description="Add an offer to see its year-one cash and yearly total, compare it with others, and draft a counter."
          action={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={15} aria-hidden /> Add an offer</Button>}
        />
      )}

      {comparable && (
        <section aria-label="Comparison" className="mb-10">
          <h2 className="mb-3 text-base font-semibold text-fg">Side by side</h2>
          <div className="overflow-x-auto rounded-panel border border-line bg-panel">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-normal text-fg-3"><span className="sr-only">Component</span></th>
                  {offers.map(o => (
                    <th key={o.id} scope="col" className="px-4 py-3 text-right font-semibold text-fg">
                      {o.company}
                      <div className="text-xs font-normal text-fg-3">{o.role}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => {
                  const values = offers.map(row.value);
                  const best = Math.max(...values);
                  const strong = i >= 4;
                  return (
                    <tr key={row.label} className={cn('border-b border-line last:border-0', strong && 'bg-raised/50')}>
                      <th scope="row" className="px-4 py-3 text-left font-normal text-fg-2">
                        <span className={cn(strong && 'font-medium text-fg')}>{row.label}</span>
                        {row.hint && <span className="block text-xs text-fg-3">{row.hint}</span>}
                      </th>
                      {values.map((v, n) => (
                        <td key={offers[n].id} className={cn('px-4 py-3 text-right font-mono', v > 0 && v === best && new Set(values).size > 1 ? 'font-semibold text-good' : 'text-fg-2')}>
                          {v ? money(v, offers[n].currency) : '–'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-fg-3">Green marks the highest value in each row. Equity is counted at the yearly value you entered, so treat it as an estimate.</p>
        </section>
      )}

      {offers.length > 0 && (
        <ul className="grid gap-4 lg:grid-cols-2">
          {offers.map(o => (
            <li key={o.id}>
              <Card className="flex h-full flex-col">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-fg">{o.company}</h2>
                    <p className="text-sm text-fg-2">{o.role}{o.level ? `, ${o.level}` : ''}</p>
                    {o.location && <p className="mt-1 flex items-center gap-1 text-xs text-fg-3"><MapPin size={12} aria-hidden /> {o.location}</p>}
                  </div>
                  {o.counter_script && <Badge tone="good">Counter drafted</Badge>}
                </div>

                <dl className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-control bg-raised p-3">
                    <dt className="text-xs text-fg-3">Cash in year one</dt>
                    <dd className="mt-0.5 font-mono text-lg font-semibold text-fg">{money(yearOne(o), o.currency)}</dd>
                  </div>
                  <div className="rounded-control bg-raised p-3">
                    <dt className="text-xs text-fg-3">Yearly with equity</dt>
                    <dd className="mt-0.5 font-mono text-lg font-semibold text-fg">{money(ongoing(o), o.currency)}</dd>
                  </div>
                </dl>
                <p className="mb-4 text-[13px] text-fg-3">
                  Base {money(o.base_salary, o.currency)}
                  {o.bonus ? `, bonus ${money(o.bonus, o.currency)}` : ''}
                  {o.equity ? `, equity ${money(o.equity, o.currency)}/yr` : ''}
                  {o.signing_bonus ? `, signing ${money(o.signing_bonus, o.currency)}` : ''}
                </p>
                {o.notes && <p className="mb-4 line-clamp-2 text-[13px] text-fg-2">{o.notes}</p>}

                <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                  <Button size="sm" variant={o.counter_script ? 'secondary' : 'primary'} onClick={() => setCoaching(o)}>
                    <Sparkles size={14} aria-hidden /> {o.counter_script ? 'View counter' : 'Write a counter'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => edit(o)}><Pencil size={14} aria-hidden /> Edit</Button>
                  <span className="ml-auto flex items-center gap-1.5">
                    {deleting === o.id ? (
                      <>
                        <Button size="sm" variant="danger" onClick={() => remove(o.id)}>Delete</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>Keep</Button>
                      </>
                    ) : (
                      <Button size="icon" variant="ghost" aria-label={`Delete ${o.company} offer`} onClick={() => setDeleting(o.id)}><Trash2 size={15} aria-hidden /></Button>
                    )}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && <OfferForm key={editing.id ?? 'new'} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); mutate(); }} />}
      {coaching && <CounterModal key={coaching.id} offer={coaching} onClose={() => setCoaching(null)} onDone={() => mutate()} />}
    </div>
  );
}

function OfferForm({ initial, onClose, onSaved }: { initial: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Draft, v: string) => setD(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/negotiation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(d.id ? 'Offer updated' : 'Offer added');
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save the offer');
    } finally {
      setSaving(false);
    }
  };

  const num = (label: string, key: keyof Draft, hint?: string) => (
    <Field label={label} hint={hint}>{a => <Input {...a} type="number" inputMode="decimal" min={0} value={d[key]} onChange={e => set(key, e.target.value)} placeholder="0" />}</Field>
  );

  return (
    <Modal
      open
      onOpenChange={o => !o && onClose()}
      title={d.id ? 'Edit offer' : 'Add an offer'}
      description="Use yearly amounts in one currency."
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!d.company.trim() || !d.role.trim()}>{d.id ? 'Save changes' : 'Add offer'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">{a => <Input {...a} value={d.company} onChange={e => set('company', e.target.value)} placeholder="Stripe" />}</Field>
          <Field label="Role">{a => <Input {...a} value={d.role} onChange={e => set('role', e.target.value)} placeholder="Senior backend engineer" />}</Field>
          <Field label="Level">{a => <Input {...a} value={d.level} onChange={e => set('level', e.target.value)} placeholder="L5" />}</Field>
          <Field label="Location">{a => <Input {...a} value={d.location} onChange={e => set('location', e.target.value)} placeholder="Remote" />}</Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr]">
          <Field label="Currency">
            {a => <Select {...a} value={d.currency} onChange={e => set('currency', e.target.value)}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</Select>}
          </Field>
          {num('Base salary', 'base_salary')}
          {num('Annual bonus', 'bonus')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {num('Equity per year', 'equity', 'Grant value divided by vesting years.')}
          {num('Signing bonus', 'signing_bonus')}
        </div>
        <Field label="Context for the counter" hint="Competing offers, your impact, deadlines. The email only uses what you write here.">
          {a => <Textarea {...a} rows={3} value={d.notes} onChange={e => set('notes', e.target.value)} placeholder="I also have an offer at a similar level. I would like to sign by Friday." />}
        </Field>
      </div>
    </Modal>
  );
}

function CounterModal({ offer, onClose, onDone }: { offer: Offer; onClose: () => void; onDone: () => void }) {
  const [script, setScript] = useState(offer.counter_script ?? '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const write = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/negotiation/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setScript(json.counter_script);
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not write the counter');
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Modal
      open
      onOpenChange={o => !o && onClose()}
      title={`Counter for ${offer.company}`}
      description="A draft to edit. Replace anything in [brackets] with your own number."
      className="max-w-2xl"
      footer={
        script ? (
          <>
            <Button variant="ghost" onClick={write} loading={busy}><RefreshCw size={14} aria-hidden /> Write a new version</Button>
            <Button onClick={copy}>{copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} Copy email</Button>
          </>
        ) : undefined
      }
    >
      {script ? (
        <Textarea value={script} onChange={e => setScript(e.target.value)} rows={14} aria-label="Counter-offer email" className="font-[inherit] text-[14px] leading-relaxed" />
      ) : (
        <div className="py-6 text-center">
          <p className="mx-auto mb-5 max-w-sm text-sm text-fg-2">
            The email uses your offer details and notes. It will not quote market data, so check your own research before sending.
          </p>
          <Button onClick={write} loading={busy}><Sparkles size={15} aria-hidden /> Write the counter</Button>
        </div>
      )}
    </Modal>
  );
}

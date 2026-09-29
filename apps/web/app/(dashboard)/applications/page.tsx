'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { CalendarClock, ExternalLink, FileText, Mic, Plus, Send, Trash2 } from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Stat, Tabs, TabsList, TabsTrigger, Textarea,
} from '@/components/ui';
import { cn } from '@/lib/cn';

interface Application {
  id: string;
  company: string;
  role: string;
  status: Status;
  url: string | null;
  jd_text: string | null;
  notes: string | null;
  applied_at: string | null;
  next_step: string | null;
  next_step_at: string | null;
  updated_at: string;
}

type Status = 'saved' | 'applied' | 'screen' | 'interview' | 'offer' | 'rejected' | 'withdrawn';

const STATUS_LABEL: Record<Status, string> = {
  saved: 'Saved',
  applied: 'Applied',
  screen: 'Phone screen',
  interview: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const STATUS_TONE: Record<Status, 'neutral' | 'signal' | 'violet' | 'live' | 'good' | 'bad'> = {
  saved: 'neutral', applied: 'signal', screen: 'violet', interview: 'live', offer: 'good', rejected: 'bad', withdrawn: 'neutral',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'active', label: 'In process' },
  { id: 'offer', label: 'Offers' },
  { id: 'closed', label: 'Closed' },
] as const;

const fetcher = (url: string) => fetch(url).then(r => r.json());

const blank = { company: '', role: '', status: 'saved' as Status, url: '', jd_text: '', notes: '', next_step: '', next_step_at: '' };

function dueTone(date: string | null): 'bad' | 'live' | 'neutral' {
  if (!date) return 'neutral';
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  return days < 0 ? 'bad' : days <= 2 ? 'live' : 'neutral';
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<{ applications: Application[]; setupNeeded?: boolean; error?: string }>('/api/applications', fetcher);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [editing, setEditing] = useState<(Partial<Application> & typeof blank & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const apps = useMemo(() => data?.applications ?? [], [data]);
  const shown = apps.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'active') return a.status === 'screen' || a.status === 'interview';
    if (filter === 'closed') return a.status === 'rejected' || a.status === 'withdrawn';
    return a.status === filter;
  });

  const counts = useMemo(() => ({
    total: apps.length,
    applied: apps.filter(a => a.status !== 'saved').length,
    active: apps.filter(a => a.status === 'screen' || a.status === 'interview').length,
    offers: apps.filter(a => a.status === 'offer').length,
  }), [apps]);

  const openNew = () => setEditing({ ...blank });
  const openEdit = (a: Application) =>
    setEditing({
      ...a,
      url: a.url ?? '', jd_text: a.jd_text ?? '', notes: a.notes ?? '', next_step: a.next_step ?? '', next_step_at: a.next_step_at ?? '',
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.company.trim() || !editing.role.trim()) {
      toast.error('Company and role are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company: editing.company.trim(), role: editing.role.trim(), status: editing.status, url: editing.url, jd_text: editing.jd_text,
        notes: editing.notes, next_step: editing.next_step, next_step_at: editing.next_step_at,
      };
      const res = await fetch(editing.id ? `/api/applications/${editing.id}` : '/api/applications', {
        method: editing.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(editing.id ? 'Application updated' : 'Application added');
      setEditing(null);
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (a: Application, status: Status) => {
    mutate(prev => prev && { ...prev, applications: prev.applications.map(x => (x.id === a.id ? { ...x, status } : x)) }, false);
    const res = await fetch(`/api/applications/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) toast.error('Could not update the status');
    mutate();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Application removed');
      setEditing(null);
      mutate();
    } else toast.error('Could not remove it');
  };

  const tailor = (a: { company: string; role: string; jd_text?: string | null }) => {
    try {
      sessionStorage.setItem('prepspace_pending_jd', JSON.stringify({ company: a.company, role: a.role, jd: a.jd_text ?? '' }));
    } catch { /* falls back to opening the builder empty */ }
    router.push('/resume');
  };

  const practise = (a: { company: string; role: string }) =>
    router.push(`/interview?${new URLSearchParams({ topic: 'conceptual', role: a.role, company: a.company, direct: 'true' }).toString()}`);

  return (
    <div className="page-container">
      <PageHeader
        title="Applications"
        description="Track every role from saved to offer, with the job description, next step and prep one click away."
        action={<Button onClick={openNew}><Plus size={16} aria-hidden /> Add application</Button>}
      />

      {data?.setupNeeded ? (
        <Card className="border-live/30 bg-live/5">
          <h2 className="text-sm font-semibold text-fg">One-time database setup needed</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
            The applications table does not exist yet. Open the Supabase SQL editor and run <code className="font-mono text-fg">supabase/migrations/002_github_and_applications.sql</code>, then reload this page.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mb-6 grid grid-cols-2 gap-6 p-5 sm:p-6 lg:grid-cols-4 lg:divide-x lg:divide-line">
            <Stat label="Tracked" value={counts.total} />
            <Stat label="Applied" value={counts.applied} className="lg:pl-6" />
            <Stat label="In process" value={counts.active} className="lg:pl-6" />
            <Stat label="Offers" value={counts.offers} className="lg:pl-6" />
          </Card>

          <Tabs value={filter} onValueChange={v => setFilter(v as typeof filter)}>
            <TabsList aria-label="Filter applications" className="mb-5">
              {FILTERS.map(f => <TabsTrigger key={f.id} value={f.id}>{f.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading applications">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-panel" />)}
            </div>
          ) : error || data?.error ? (
            <ErrorState title="Could not load your applications" description={data?.error} onRetry={() => mutate()} />
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<Send size={20} aria-hidden />}
              title={apps.length === 0 ? 'No applications yet' : 'Nothing in this view'}
              description={apps.length === 0 ? 'Add a role you are considering. Paste the job description to tailor your resume, write a cover letter and practise for it.' : 'Try another filter.'}
              action={apps.length === 0 ? <Button onClick={openNew}><Plus size={15} aria-hidden /> Add your first application</Button> : undefined}
            />
          ) : (
            <ul className="space-y-3">
              {shown.map(a => (
                <li key={a.id}>
                  <Card className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <button type="button" onClick={() => openEdit(a)} className="min-w-0 flex-1 basis-56 rounded-control text-left">
                      <div className="truncate text-[15px] font-semibold text-fg">{a.role}</div>
                      <div className="truncate text-sm text-fg-2">{a.company}</div>
                      {a.next_step && (
                        <div className={cn('mt-1.5 inline-flex items-center gap-1.5 text-xs', dueTone(a.next_step_at) === 'bad' ? 'text-bad' : dueTone(a.next_step_at) === 'live' ? 'text-live' : 'text-fg-3')}>
                          <CalendarClock size={12} aria-hidden /> {a.next_step}{a.next_step_at && ` · ${new Date(a.next_step_at).toLocaleDateString()}`}
                        </div>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select aria-label={`Status for ${a.company}`} value={a.status} onChange={e => setStatus(a, e.target.value as Status)} className="h-9 w-40">
                        {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </Select>
                      <Badge tone={STATUS_TONE[a.status]} className="hidden sm:inline-flex">{STATUS_LABEL[a.status]}</Badge>
                      <Button size="sm" variant="secondary" onClick={() => tailor(a)}><FileText size={13} aria-hidden /> Tailor resume</Button>
                      <Button size="sm" variant="ghost" onClick={() => practise(a)}><Mic size={13} aria-hidden /> Practise</Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal
        open={editing !== null}
        onOpenChange={o => { if (!o) setEditing(null); }}
        title={editing?.id ? 'Edit application' : 'Add application'}
        className="max-w-xl"
        footer={
          <>
            {editing?.id && (
              <Button variant="ghost" className="mr-auto text-bad hover:text-bad" onClick={() => remove(editing.id!)}><Trash2 size={14} aria-hidden /> Delete</Button>
            )}
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save</Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company">{a => <Input {...a} value={editing.company} onChange={e => setEditing({ ...editing, company: e.target.value })} placeholder="Stripe" />}</Field>
              <Field label="Role">{a => <Input {...a} value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })} placeholder="Backend Engineer" />}</Field>
              <Field label="Status">
                {a => (
                  <Select {...a} value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as Status })}>
                    {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Posting link">{a => <Input {...a} value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} placeholder="https://…" />}</Field>
              <Field label="Next step">{a => <Input {...a} value={editing.next_step} onChange={e => setEditing({ ...editing, next_step: e.target.value })} placeholder="Recruiter call" />}</Field>
              <Field label="Next step date">{a => <Input {...a} type="date" value={editing.next_step_at} onChange={e => setEditing({ ...editing, next_step_at: e.target.value })} />}</Field>
            </div>
            <Field label="Job description" hint="Used to tailor your resume, write a cover letter and check keywords.">
              {a => <Textarea {...a} rows={6} value={editing.jd_text} onChange={e => setEditing({ ...editing, jd_text: e.target.value })} />}
            </Field>
            <Field label="Notes">{a => <Textarea {...a} rows={3} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Contacts, salary range, questions to ask" />}</Field>
            {editing.url && (
              <a href={editing.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:underline">
                <ExternalLink size={13} aria-hidden /> Open posting
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Play, Plus, Search } from 'lucide-react';
import { useCompanies, Company } from '@/lib/hooks/useCompanies';
import { Badge, ButtonLink, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

const difficultyTone = (d: number) => (d >= 9 ? 'text-bad' : d >= 8 ? 'text-live' : 'text-good');
const passTone = (p: number) => (p > 65 ? 'text-good' : p > 55 ? 'text-live' : 'text-bad');

export default function MockCompanyPage() {
  const router = useRouter();
  const { companies, isLoading, isError, mutate } = useCompanies();
  const [selected, setSelected] = useState<Company | null>(null);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCompanies = companies.filter((c: Company) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (company: Company) => {
    setSelected(company);
    setSelectedRound(company.rounds?.[0] || '');
  };

  const handleStartInterview = () => {
    if (!selected) return;
    const params = new URLSearchParams({
      topic: 'conceptual',
      role: targetRole,
      company: selected.name,
      round: selectedRound,
      direct: 'true',
    });
    // Pass round topics if available
    const roundTopics = selected.round_topics?.[selectedRound];
    if (roundTopics?.length) {
      params.set('module_topics', JSON.stringify(roundTopics));
    }
    router.push(`/interview?${params.toString()}`);
  };

  const roundTopics = selected?.round_topics?.[selectedRound] ?? [];

  return (
    <div className="page-container">
      <PageHeader
        title="Mock company interviews"
        description="Practise against each company's real round structure and known patterns."
        action={
          <ButtonLink href="/mock-company/new" variant="secondary">
            <Plus size={16} aria-hidden /> Add company
          </ButtonLink>
        }
      />

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" aria-hidden />
        <Input
          type="search"
          aria-label="Search companies"
          placeholder="Search by company or industry"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading companies">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-panel" />)}
        </div>
      ) : isError ? (
        <ErrorState title="Could not load companies" onRetry={() => mutate()} />
      ) : filteredCompanies.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} aria-hidden />}
          title={searchQuery ? 'No companies match your search' : 'No companies yet'}
          description={searchQuery ? 'Try a different name or clear the search.' : 'Add a company to build a round-by-round mock interview for it.'}
          action={searchQuery ? undefined : <ButtonLink href="/mock-company/new">Add a company</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company: Company) => {
            const active = selected?.id === company.id;
            return (
              <li key={company.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(company)}
                  aria-pressed={active}
                  className={cn(
                    'flex h-full w-full flex-col rounded-panel border p-5 text-left transition-colors',
                    active ? 'border-signal bg-signal/5' : 'border-line bg-panel hover:border-line-strong hover:bg-raised'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-3xl leading-none" aria-hidden>{company.logo_emoji}</span>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-fg">{company.name}</div>
                        <div className="truncate text-xs text-fg-3">{company.industry} · {company.size}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={cn('font-mono text-lg font-semibold leading-none', difficultyTone(company.difficulty_rating))}>{company.difficulty_rating?.toFixed(1)}</div>
                      <div className="mt-1 text-[12px] text-fg-3">Difficulty</div>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-fg-2">{company.interview_culture}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(company.rounds || []).slice(0, 3).map((r: string) => <Badge key={r} tone="signal">{r}</Badge>)}
                    {(company.rounds || []).length > 3 && <Badge>+{company.rounds.length - 3}</Badge>}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 text-xs text-fg-3">
                    <span>Pass rate <strong className={cn('font-mono', passTone(company.community_pass_rate))}>{company.community_pass_rate}%</strong></span>
                    <span className={active ? 'font-semibold text-signal' : ''}>{active ? 'Selected' : 'Select'}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <Card className="mt-8 border-signal/30 p-5 sm:p-6" aria-live="polite">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-4xl leading-none" aria-hidden>{selected.logo_emoji}</span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-fg">{selected.name}</h2>
                  <p className="text-sm text-fg-3">{selected.interview_culture}</p>
                </div>
              </div>

              {selected.known_patterns?.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-semibold text-fg">Known patterns</h3>
                  <ul className="space-y-1.5 text-sm text-fg-2">
                    {selected.known_patterns.map((p: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" aria-hidden />{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Field label="Your role">
                {a => <Input {...a} value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="Senior Frontend Engineer" />}
              </Field>
              <Field label="Round">
                {a => (
                  <Select {...a} value={selectedRound} onChange={e => setSelectedRound(e.target.value)}>
                    {(selected.rounds || []).map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                )}
              </Field>

              {roundTopics.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[13px] font-medium text-fg">Topics covered</div>
                  <div className="flex flex-wrap gap-1.5">
                    {roundTopics.map(t => <Badge key={t} tone="violet">{t}</Badge>)}
                  </div>
                </div>
              )}

              <Button size="lg" className="w-full" onClick={handleStartInterview}>
                <Play size={15} className="fill-current" aria-hidden /> Start {selected.name} interview
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

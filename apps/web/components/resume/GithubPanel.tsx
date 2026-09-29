'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ChevronDown, GitFork, Github, Loader2, Plus, Lock, RefreshCw, Star, Trash2, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input } from '@/components/ui';
import { sameGithubAccount } from '@/lib/github/match';
import { parseGithubUsername, type GithubIndex, type IndexProgress, type RepoProfile, type RepoSummary } from '@/lib/github/types';
import { cn } from '@/lib/cn';

interface GithubPanelProps {
  /** The profile's GitHub URL or handle, used to prefill the username. */
  profileGithub: string;
  index?: GithubIndex;
  /** True for repos already on the resume, matched by URL or name. */
  isOnResume: (repo: RepoProfile) => boolean;
  onChange: (next: GithubIndex | undefined) => void;
  onIndexed: () => void;
  onAddProject: (repo: RepoProfile) => void;
  /** Called once after indexing finishes, with everything indexed, when the username matches the resume profile. */
  onAutoAdd: (index: GithubIndex) => void;
}

const complexityLabel = ['', 'Simple', 'Small', 'Solid', 'Advanced', 'Complex'];

function timeAgo(iso?: string | null) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function GithubPanel({ profileGithub, index, isOnResume, onChange, onIndexed, onAddProject, onAutoAdd }: GithubPanelProps) {
  const [username, setUsername] = useState(index?.username || parseGithubUsername(profileGithub));
  const sameAccount = sameGithubAccount(profileGithub, username);

  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [showForks, setShowForks] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [progress, setProgress] = useState<Record<string, IndexProgress>>({});
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const indexRef = useRef<GithubIndex | undefined>(index);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const indexed = useMemo(() => new Map((index?.projects ?? []).map(p => [p.fullName, p])), [index]);

  const findRepos = async () => {
    const user = parseGithubUsername(username);
    if (!user) {
      toast.error('Enter your GitHub username first.');
      return;
    }
    setLoadingRepos(true);
    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const list = json.repos as RepoSummary[];
      setRepos(list);
      setUsername(json.username);
      // preselect the newest own, non-fork, non-archived repos that are not indexed yet
      setSelected(new Set(list.filter(r => !r.fork && !r.archived && !indexed.has(r.fullName)).slice(0, 12).map(r => r.fullName)));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not list repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const runIndex = async (names: string[]) => {
    if (!names.length || running) return;
    setRunning(true);
    setProgress(Object.fromEntries(names.map(n => [n, { fullName: n, status: 'queued' as const }])));

    let cursor = 0;
    let ok = 0;
    const worker = async () => {
      while (cursor < names.length) {
        const name = names[cursor++];
        setProgress(p => ({ ...p, [name]: { fullName: name, status: 'indexing' } }));
        try {
          const res = await fetch('/api/github/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo: name }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error);
          const profile = json.profile as RepoProfile;
          const current = indexRef.current;
          const next: GithubIndex = {
            username: current?.username || parseGithubUsername(username) || profile.fullName.split('/')[0],
            indexedAt: new Date().toISOString(),
            projects: [...(current?.projects ?? []).filter(p => p.fullName !== profile.fullName), profile],
          };
          indexRef.current = next;
          onChange(next);
          ok++;
          setProgress(p => ({ ...p, [name]: { fullName: name, status: 'done' } }));
        } catch (e: unknown) {
          setProgress(p => ({ ...p, [name]: { fullName: name, status: 'failed', error: e instanceof Error ? e.message : 'Failed' } }));
        }
      }
    };
    await Promise.all([worker(), worker()]);
    setRunning(false);
    setSelected(new Set());
    if (ok) {
      toast.success(`Indexed ${ok} ${ok === 1 ? 'repository' : 'repositories'}`);
      onIndexed();
      if (sameAccount && indexRef.current) onAutoAdd(indexRef.current);
    }
  };

  const visible = (repos ?? []).filter(r => showForks || (!r.fork && !r.archived));
  const doneCount = Object.values(progress).filter(p => p.status === 'done' || p.status === 'failed').length;
  const total = Object.keys(progress).length;

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <Github size={20} className="mt-0.5 shrink-0 text-fg-2" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-fg">Index your GitHub projects</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-3">
              PrepSpace reads each repository, works out what it does and how it is built, and keeps those facts. When you tailor your resume to a job, it picks the projects that fit best and writes about them from what it verified.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="GitHub username" hint={profileGithub ? 'Taken from your resume profile.' : 'Or paste your profile URL.'}>
            {a => <Input {...a} value={username} onChange={e => setUsername(e.target.value)} placeholder="octocat" autoComplete="off" />}
          </Field>
          <Button onClick={findRepos} loading={loadingRepos}>
            {repos ? <RefreshCw size={15} aria-hidden /> : <Github size={15} aria-hidden />} {repos ? 'Refresh list' : 'Find repositories'}
          </Button>
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-3">
          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden />
          Only public repositories are read. Each one is also looked up on DeepWiki for a deeper architecture read, then summarised with your Gemini key.</p>
        {parseGithubUsername(username) && (
          <div className={cn('rounded-control border px-3 py-2.5 text-[13px] leading-relaxed', sameAccount ? 'border-good/30 bg-good/5 text-fg-2' : 'border-line bg-raised text-fg-2')}>
            {sameAccount
              ? 'This is the GitHub account on your resume profile. When indexing finishes, the projects are added to your resume automatically, ranked for ATS and trimmed to fit one page.'
              : profileGithub
                ? 'This is not the account on your resume profile, so nothing is added automatically. Use Add to resume on the projects you want.'
                : 'Your resume profile has no GitHub link yet. Use Add to resume on the projects you want.'}
          </div>
        )}
      </Card>

      {/* repo picker */}
      {repos && (
        <Card padded={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div>
              <div className="text-sm font-semibold text-fg">{visible.length} repositories</div>
              <div className="text-xs text-fg-3">{selected.size} selected</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-fg-2">
                <input type="checkbox" checked={showForks} onChange={e => setShowForks(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent-primary)]" /> Forks and archived
              </label>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(visible.map(r => r.fullName)))}>Select all</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button size="sm" onClick={() => runIndex([...selected])} loading={running} disabled={selected.size === 0}>
                Index {selected.size || ''} selected
              </Button>
            </div>
          </div>

          {running && (
            <div className="border-b border-line px-5 py-2.5 text-xs text-fg-2" role="status">
              Indexing {doneCount} of {total}. Each repository takes 10 to 40 seconds.
            </div>
          )}

          <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
            {visible.map(r => {
              const p = progress[r.fullName];
              const done = indexed.get(r.fullName);
              return (
                <li key={r.fullName} className="flex items-center gap-3 px-5 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.fullName}`}
                    checked={selected.has(r.fullName)}
                    disabled={running}
                    onChange={e => setSelected(s => { const n = new Set(s); if (e.target.checked) n.add(r.fullName); else n.delete(r.fullName); return n; })}
                    className="h-4 w-4 shrink-0 accent-[var(--accent-primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-fg">{r.name}</span>
                      {r.fork && <Badge>Fork</Badge>}
                      {done && <Badge tone="good">Indexed</Badge>}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-fg-3">{r.description || 'No description'}</div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-3 text-xs text-fg-3 sm:flex">
                    {r.language && <span>{r.language}</span>}
                    <span className="inline-flex items-center gap-1"><Star size={11} aria-hidden />{r.stars}</span>
                    <span className="inline-flex items-center gap-1"><GitFork size={11} aria-hidden />{r.forks}</span>
                    <span>{timeAgo(r.pushedAt)}</span>
                  </div>
                  <div className="w-5 shrink-0" aria-live="polite">
                    {p?.status === 'indexing' && <Loader2 size={16} className="animate-spin text-signal" aria-label="Indexing" />}
                    {p?.status === 'done' && <CheckCircle2 size={16} className="text-good" aria-label="Indexed" />}
                    {p?.status === 'failed' && <span title={p.error}><XCircle size={16} className="text-bad" aria-label={`Failed: ${p.error}`} /></span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* indexed knowledge */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">What PrepSpace knows ({index?.projects.length ?? 0})</h3>
          {index && index.projects.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => runIndex(index.projects.map(p => p.fullName))} disabled={running}>
              <RefreshCw size={13} aria-hidden /> Re-index all
            </Button>
          )}
        </div>

        {!index || index.projects.length === 0 ? (
          <EmptyState
            icon={<Github size={20} aria-hidden />}
            title="Nothing indexed yet"
            description="Find your repositories above and index the ones you want considered. You can pick which ones show up on a resume later."
            className="py-10"
          />
        ) : (
          <ul className="space-y-3">
            {[...index.projects].sort((a, b) => b.complexity - a.complexity || (b.pushedAt ?? '').localeCompare(a.pushedAt ?? '')).map(p => {
              const expanded = open === p.fullName;
              const onResume = isOnResume(p);
              return (
                <li key={p.fullName}>
                  <Card padded={false} className="overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : p.fullName)}
                      className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-raised"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-fg">{p.name}</span>
                          {onResume && <Badge tone="signal">On resume</Badge>}
                          <Badge>{complexityLabel[p.complexity]}</Badge>
                          <Badge tone={p.source === 'deepwiki+github' ? 'violet' : 'neutral'}>{p.source === 'deepwiki+github' ? 'DeepWiki + code' : 'Code analysis'}</Badge>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">{p.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.techStack.slice(0, 8).map(t => <Badge key={t} tone="neutral">{t}</Badge>)}
                        </div>
                      </div>
                      <ChevronDown size={16} className={cn('mt-1 shrink-0 text-fg-3 transition-transform', expanded && 'rotate-180')} aria-hidden />
                    </button>

                    {expanded && (
                      <div className="space-y-4 border-t border-line bg-raised/40 px-5 py-4">
                        {p.architecture && (
                          <div>
                            <div className="mb-1 text-xs font-medium text-fg-3">How it is built</div>
                            <p className="text-[13px] leading-relaxed text-fg-2">{p.architecture}</p>
                          </div>
                        )}
                        {p.highlights.length > 0 && (
                          <div>
                            <div className="mb-1 text-xs font-medium text-fg-3">Resume-ready facts</div>
                            <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-fg-2">
                              {p.highlights.map((h, i) => <li key={i}>{h}</li>)}
                            </ul>
                          </div>
                        )}
                        {p.roleFit.length > 0 && (
                          <div className="text-[13px] text-fg-2"><span className="text-fg-3">Strong evidence for: </span>{p.roleFit.join(', ')}</div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {!onResume && !sameAccount && (
                            <Button size="sm" onClick={() => onAddProject(p)}><Plus size={13} aria-hidden /> Add to resume</Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => runIndex([p.fullName])} disabled={running}><RefreshCw size={13} aria-hidden /> Re-index</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-bad hover:text-bad"
                            onClick={() => onChange(index && index.projects.length > 1 ? { ...index, projects: index.projects.filter(x => x.fullName !== p.fullName) } : undefined)}
                          >
                            <Trash2 size={13} aria-hidden /> Forget
                          </Button>
                        </div>
                        <div className="text-xs text-fg-3">Indexed {timeAgo(p.indexedAt)}. Last pushed {timeAgo(p.pushedAt)}.</div>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

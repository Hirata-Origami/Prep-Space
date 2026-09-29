import type { RepoSummary } from './types';

/** Server-side GitHub REST helpers. Public data only. An optional server-side GITHUB_TOKEN (read-only, no scopes) lifts the shared rate limit. */

const API = 'https://api.github.com';

function headers(raw = false): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'PrepSpace',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class GithubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(), cache: 'no-store' });
    if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new GithubError(
      remaining === '0'
        ? 'GitHub rate limit reached. Try again in a few minutes.'
        : 'GitHub refused the request.',
      res.status
    );
  }
  if (res.status === 404) throw new GithubError('Not found. Check the username. Only public repositories can be read.', 404);
  if (!res.ok) throw new GithubError(`GitHub returned ${res.status}`, res.status);
  return res.json() as Promise<T>;
}

async function ghText(path: string): Promise<string | null> {
  const res = await fetch(`${API}${path}`, { headers: headers(true), cache: 'no-store' });
  if (!res.ok) return null;
  return res.text();
}

interface ApiRepo {
  full_name: string;
  name: string;
  html_url: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  size: number;
  topics?: string[];
  owner: { login: string };
}

const toSummary = (r: ApiRepo): RepoSummary => ({
  fullName: r.full_name,
  name: r.name,
  url: r.html_url,
  private: r.private,
  fork: r.fork,
  archived: r.archived,
  description: r.description,
  language: r.language,
  stars: r.stargazers_count,
  forks: r.forks_count,
  pushedAt: r.pushed_at,
  sizeKb: r.size,
  topics: r.topics ?? [],
});

/** Lists a user's public repositories, newest push first. */
export async function listRepos(username: string): Promise<{ repos: RepoSummary[] }> {
  const collected: ApiRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh<ApiRepo[]>(`/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`);
    collected.push(...batch);
    if (batch.length < 100) break;
  }
  return { repos: collected.filter(r => !r.private && r.owner.login.toLowerCase() === username.toLowerCase()).map(toSummary) };
}

const MANIFESTS = [
  'package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle',
  'pubspec.yaml', 'Gemfile', 'composer.json', 'Dockerfile', 'docker-compose.yml', 'vercel.json',
];

export interface RepoFacts {
  summary: RepoSummary;
  readme: string;
  languages: Record<string, number>;
  tree: string[];
  manifests: Record<string, string>;
  commitCount: number | null;
  contributors: number | null;
}

const clip = (s: string | null, n: number) => (s ? s.slice(0, n) : '');

/** Collects the facts the model may reason about: README, structure, manifests, languages, activity. */
export async function getRepoFacts(fullName: string, ): Promise<RepoFacts> {
  const repo = await gh<ApiRepo>(`/repos/${fullName}`);
  const [readme, languages, contents, contributors, commits] = await Promise.all([
    ghText(`/repos/${fullName}/readme`),
    gh<Record<string, number>>(`/repos/${fullName}/languages`).catch(() => ({})),
    gh<{ name: string; type: string; path: string }[]>(`/repos/${fullName}/contents`).catch(() => []),
    fetch(`${API}/repos/${fullName}/contributors?per_page=1&anon=1`, { headers: headers(), cache: 'no-store' })
      .then(r => (r.ok ? countFromLink(r) ?? 1 : null))
      .catch(() => null),
    fetch(`${API}/repos/${fullName}/commits?per_page=1`, { headers: headers(), cache: 'no-store' })
      .then(r => (r.ok ? countFromLink(r) ?? 1 : null))
      .catch(() => null),
  ]);

  const tree = Array.isArray(contents) ? contents.map(c => (c.type === 'dir' ? `${c.name}/` : c.name)) : [];
  const present = MANIFESTS.filter(m => tree.includes(m));
  const manifestTexts = await Promise.all(present.slice(0, 5).map(m => ghText(`/repos/${fullName}/contents/${m}`)));
  const manifests: Record<string, string> = {};
  present.slice(0, 5).forEach((m, i) => {
    if (manifestTexts[i]) manifests[m] = clip(manifestTexts[i], 2500);
  });

  return {
    summary: toSummary(repo),
    readme: clip(readme, 9000),
    languages,
    tree,
    manifests,
    commitCount: commits,
    contributors,
  };
}

function countFromLink(res: Response): number | null {
  const link = res.headers.get('link');
  const m = link?.match(/[?&]page=(\d+)>; rel="last"/);
  return m ? Number(m[1]) : null;
}

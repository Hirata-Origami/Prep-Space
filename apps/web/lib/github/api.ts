import type { RepoSummary } from './types';

/** Server-side GitHub REST helpers. The token is only ever sent to api.github.com. */

const API = 'https://api.github.com';

function headers(token?: string | null, raw = false): HeadersInit {
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

async function gh<T>(path: string, token?: string | null): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(token), cache: 'no-store' });
  if (res.status === 401) throw new GithubError('GitHub rejected the token. It may be expired or revoked.', 401);
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new GithubError(
      remaining === '0'
        ? 'GitHub rate limit reached. Add a token for a much higher limit, or try again in an hour.'
        : 'GitHub refused the request. The token may lack access to this repository.',
      res.status
    );
  }
  if (res.status === 404) throw new GithubError('Not found. Check the username, or add a token if the repository is private.', 404);
  if (!res.ok) throw new GithubError(`GitHub returned ${res.status}`, res.status);
  return res.json() as Promise<T>;
}

async function ghText(path: string, token?: string | null): Promise<string | null> {
  const res = await fetch(`${API}${path}`, { headers: headers(token, true), cache: 'no-store' });
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

export interface TokenInfo {
  login: string;
  scopes: string[];
}

/** Confirms a token works and who it belongs to. */
export async function verifyToken(token: string): Promise<TokenInfo> {
  const res = await fetch(`${API}/user`, { headers: headers(token), cache: 'no-store' });
  if (res.status === 401) throw new GithubError('GitHub rejected this token.', 401);
  if (!res.ok) throw new GithubError(`GitHub returned ${res.status}`, res.status);
  const body = (await res.json()) as { login: string };
  const scopes = (res.headers.get('x-oauth-scopes') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return { login: body.login, scopes };
}

/**
 * Lists repositories. With a token that belongs to `username`, private repos are included;
 * otherwise only public ones are visible.
 */
export async function listRepos(username: string, token?: string | null): Promise<{ repos: RepoSummary[]; includesPrivate: boolean }> {
  let ownToken = false;
  if (token) {
    const me = await verifyToken(token);
    ownToken = me.login.toLowerCase() === username.toLowerCase();
  }

  const collected: ApiRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const path = ownToken
      ? `/user/repos?affiliation=owner&sort=pushed&per_page=100&page=${page}`
      : `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`;
    const batch = await gh<ApiRepo[]>(path, token);
    collected.push(...batch);
    if (batch.length < 100) break;
  }

  return { repos: collected.filter(r => r.owner.login.toLowerCase() === username.toLowerCase()).map(toSummary), includesPrivate: ownToken };
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
export async function getRepoFacts(fullName: string, token?: string | null): Promise<RepoFacts> {
  const repo = await gh<ApiRepo>(`/repos/${fullName}`, token);
  const [readme, languages, contents, contributors, commits] = await Promise.all([
    ghText(`/repos/${fullName}/readme`, token),
    gh<Record<string, number>>(`/repos/${fullName}/languages`, token).catch(() => ({})),
    gh<{ name: string; type: string; path: string }[]>(`/repos/${fullName}/contents`, token).catch(() => []),
    fetch(`${API}/repos/${fullName}/contributors?per_page=1&anon=1`, { headers: headers(token), cache: 'no-store' })
      .then(r => (r.ok ? countFromLink(r) ?? 1 : null))
      .catch(() => null),
    fetch(`${API}/repos/${fullName}/commits?per_page=1`, { headers: headers(token), cache: 'no-store' })
      .then(r => (r.ok ? countFromLink(r) ?? 1 : null))
      .catch(() => null),
  ]);

  const tree = Array.isArray(contents) ? contents.map(c => (c.type === 'dir' ? `${c.name}/` : c.name)) : [];
  const present = MANIFESTS.filter(m => tree.includes(m));
  const manifestTexts = await Promise.all(present.slice(0, 5).map(m => ghText(`/repos/${fullName}/contents/${m}`, token)));
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

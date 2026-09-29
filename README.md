# PrepSpace

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Hirata-Origami/Prep-Space)

PrepSpace is an AI interview preparation platform. You practise out loud with a voice and video interviewer, get scored on what you said and how you came across, build a resume tailored to each job, and keep a workspace for code, SQL and system-design diagrams.

The roadmap for what is built and what is next lives in [PLAN.md](PLAN.md).

## Features

### Practise
- **Live AI interview.** Real-time voice conversation with an interviewer (Gemini Live). The interviewer also sees your camera.
- **Performance report.** Scores for technical depth, communication, problem solving, conciseness and confidence, with question-by-question feedback, timestamped audio markers, words per minute and filler words.
- **On-camera analysis.** The report also scores eye contact, posture, expression, framing and lighting, and focus, with notes tied to timestamps. See [How video analysis works](#how-video-analysis-works).
- **Story bank and flashcards.** Save STAR stories for behavioural interview practice and review due flashcards by difficulty.
- **Shared board.** Inside a live interview you can open a board, write code or sketch a diagram, and share it so the interviewer reacts to it.
- **Roadmaps.** Paste a job description and get a study plan with modules and topics.
- **Mock companies, groups and a leaderboard** for community practice.

### Workspace (`/workspace`)
- **Code and SQL editor** with line numbers, syntax colours, auto-indent and bracket pairing for SQL, JavaScript, TypeScript, Python, Java, Go and C++, plus a notes mode.
- **Diagram canvas** for architecture diagrams: shapes for clients, load balancers, services, databases, caches, queues, storage, CDNs and external APIs; arrows with labels; freehand pen; drag, pan and zoom; undo; SVG and PNG export.
- **The AI writes.** Review, explain, fix, optimise, write tests, solve a problem, or hand you a fresh practice problem. Replace your code with the result in one click. Input queries persist in the composer and restore automatically on transient errors.
- **The AI draws.** Describe a system and get a diagram with automatic layout. Ask for changes ("add a cache before the database") and it edits the same diagram while keeping your layout and pen strokes. It can also critique a design or write it up as notes.
- **Gemini Live in Workspace.** Toggle Live mode to pair-program, design systems, or simulate technical interviews out loud. Features integrated camera feed, real-time bi-directional audio, auto-scrolling transcript, interactive text input fallback, and real-time live diagramming directly onto the canvas.
- Documents autosave.

### Career tools
- **Resume builder.** Five LaTeX templates (a faithful two-column original plus ATS-friendly single-column layouts), exact `.tex` import, live A4 preview, ATS checks, Overleaf export, plain-text copy, and draft protection. Templates are engineered with calibrated spacing and project bounds to guarantee a clean 1-page fit without stripping bullet details.
- **Tailor to a job.** Paste a job description and get rewritten bullets that keep every figure, plus a cover letter grounded in your resume.
- **GitHub project indexing & Projects integration.** Enter a GitHub username to index public repositories with DeepWiki and Gemini. Indexed repositories appear directly in the Resume Projects tab with 1-click addition, and are intelligently selected and tailored based on target job descriptions.
- **Application tracker.** Track statuses, next steps and job descriptions, and jump straight to tailoring or practising.
- **Command palette** with Ctrl or Cmd + K.

### Gemini Multi-Model Cascade & Resilience
- **Auto-failover cascade.** PrepSpace uses an automated fallback chain across Gemini models (Gemini 3.8 Flash &rarr; Gemini 3.7 Flash &rarr; Gemini 3.5 Flash Lite). If a model encounters RPM/RPD rate limits (429) or high-demand capacity issues (503), it seamlessly switches to the next available tier without interrupting the user.
- **Live quota & status dashboard.** Real-time tracking of requests per minute (RPM), requests per day (RPD), and tokens per minute (TPM) visible in Settings with cooldown countdowns.
- **Key onboarding gate.** Mandatory Gemini API key validation on onboarding and page access, verified directly against Google AI Studio without consuming generation quota.

## How video analysis works

During a live interview the browser takes a small snapshot from your camera every 10 seconds. For each snapshot it also measures brightness and movement, and uses the browser's `FaceDetector` where available to check that your face is in frame. When you end the session, up to 12 evenly spaced snapshots go to Gemini together with the transcript request, and the result is stored in the report under `analysis.video`.

- Snapshots are downsized (320 by 240 JPEG), sent once, and never stored. Only the resulting scores and notes are saved.
- If the camera is off, or fewer than two snapshots were captured, the on-camera section is left out.
- The model is told to judge only what is visible and to avoid guesses about identity, age, health or emotion it cannot see.
- A failure in this step never blocks the report.

## How the workspace AI draws

The model returns a graph (nodes with a kind, and edges) rather than coordinates. `lib/workspace/layout.ts` lays it out left to right in layers and breaks cycles. When editing an existing diagram, nodes you already placed keep their positions and new nodes are placed next to the ones they connect to, then nudged clear of overlaps. Model output is validated by `sanitizeDiagram` before it reaches the canvas or the database.

## Tech stack

- Next.js 16 (App Router, Turbopack, React Compiler), React 19, Tailwind CSS v4, Radix UI
- Supabase (auth, Postgres with row-level security), Upstash Redis
- Google Gemini (`@google/generative-ai` for text and vision, `@google/genai` for Live)
- SWR, sonner, framer-motion, next-themes
- DeepWiki MCP for public repository analysis

## Getting started

1. Clone: `git clone https://github.com/Hirata-Origami/Prep-Space`
2. Copy `.env.example` to `apps/web/.env.local` and fill it in (see below).
3. Install: `npm install` inside `apps/web`.
4. Set up the database (see below).
5. Run: `npm run dev` inside `apps/web`, then open `http://localhost:3000`.

Each user brings their own Gemini API key, which they add during onboarding. No shared key is required.

### Environment variables

| Variable | Needed | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side admin operations |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional | Caching |
| `SMTP_*` | optional | Report emails |
| `NEXT_PUBLIC_SITE_URL` | yes | Links in emails |
| `GITHUB_TOKEN` | optional | A read-only token with no scopes, set on the server, that lifts GitHub's shared 60 requests per hour limit for public repository lookups. Users never enter a token. |

### Database

Run these in the Supabase SQL editor, in order. Every script is safe to run more than once.

1. `supabase/migrations/full_schema.sql`: the base schema.
2. `supabase/migrations/002_github_and_applications.sql`: the application tracker table. (The GitHub feature reads public repositories only, so it needs no schema.)
3. `supabase/migrations/003_workspace.sql`: workspace documents.

Until a migration is run, the page that needs it shows a notice with the file name instead of failing.

For infrastructure details see [setup-guide.md](setup-guide.md).

## Project layout

```
apps/web
  app/(dashboard)/      pages: dashboard, interview, reports, roadmap, resume, workspace, applications, ...
  app/api/              route handlers (sessions, resume, github, workspace, applications, ...)
  components/           ui kit, shell, interview, resume, workspace
  lib/
    interview/          video sampling and on-camera analysis
    resume/             LaTeX engine: templates, parser, sanitizer, merge guards, ATS checks
    github/             GitHub REST, DeepWiki client, indexer, project matching
    workspace/          diagram types, layout, syntax tokenizer, AI prompts
supabase/migrations     SQL
PLAN.md                 roadmap and status
```

## Quality checks

From `apps/web`:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Known limits

- The workspace runs no code. The AI can predict output but says so.
- The single-column LaTeX templates have not been compiled in CI; the two-column template is the original preamble.
- Each user's Gemini key is stored in the `users` table without extra encryption.
- Video analysis is a coaching aid based on a handful of snapshots. It is not a measurement.

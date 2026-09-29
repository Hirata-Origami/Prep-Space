# PrepSpace

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Hirata-Origami/Prep-Space)

PrepSpace is an AI interview preparation platform. You practise out loud with a voice and video interviewer, get scored on what you said and how you came across, build a resume tailored to each job, and keep a workspace for code, SQL and system-design diagrams.

## Features

### Practise
- **Live AI interview.** Real-time voice conversation with an interviewer (Gemini Live). The interviewer also sees your camera.
- **Performance report.** Scores for technical depth, communication, problem solving, conciseness and confidence, with question-by-question feedback, timestamped audio markers, words per minute and filler words.
- **On-camera analysis.** The report also scores eye contact, posture, expression, framing and lighting, and focus, with notes tied to timestamps. See [How video analysis works](#how-video-analysis-works).
- **Shared board.** Inside a live interview you can open a board, write code or sketch a diagram, and share it so the interviewer reacts to it.
- **Do this next.** The dashboard suggests one action in a fixed order of urgency (an application step within five days, flashcards due, no interview for a week, then a practice problem) and says why.
- **Roadmaps.** Paste a job description and get a study plan with modules and topics.
- **Mock companies, groups and a leaderboard** for community practice.

### Workspace (/workspace)
- **Talk to Alex.** A live voice and text session (Gemini Live, the same model as the interview) sits in a strip under the workspace, with the transcript and a message box. No camera.
- **Alex draws and writes.** Ask for a diagram and Alex calls a drawing tool that puts it on the canvas; ask to change it ("add a cache before the database") and it edits the same diagram, keeping your layout. Ask for code or notes and Alex writes into the editor. Whatever you type or draw is sent back to Alex as context, so it always sees the current state.
- **Code and SQL editor** with line numbers, syntax colours, auto-indent and bracket pairing for SQL, JavaScript, TypeScript, Python, Java, Go and C++, plus a notes mode.
- **Diagram canvas:** 21 kinds of component (users, web and mobile clients, CDN, load balancer, API gateway, auth, services, workers, serverless functions, databases, caches, search, queues, event streams, object storage, ML models, email or push, monitoring, external APIs, notes) drawn as distinct shapes, dashed group boxes for VPCs, regions and clusters, labelled arrows, freehand pen, drag, pan, zoom, undo, and SVG and PNG export. Code, diagram or both side by side, full width.
- **Run your code.** JavaScript, TypeScript, Python and SQL run in your browser with a time limit: JS and TS in a worker, Python with Pyodide, SQL on SQLite (results as tables). Ctrl or Cmd + Enter runs. Alex can run the code too, and the judge uses your real output as evidence. Interpreters download from a CDN on first use, so nothing is added to the app.
- **Coach menu** for one-shot answers you want to keep: judge a solution, review, explain, fix, optimise, write tests, solve, get a practice problem, critique a design, write it up as notes.
- Documents autosave.

### Practice tools
- **Coding practice.** Ten tracks (algorithms and SQL) at three levels. Each click creates a fresh problem in a workspace document; press Judge and the AI walks your solution through test cases and estimates its complexity. Passing a problem for the first time earns XP by level. The verdict is a prediction: nothing is executed.
- **Flashcards.** Recall cards built from the questions you answered poorly, plus your own. Reviews use SM-2 spaced repetition with keyboard shortcuts (Space to reveal, 1 to 4 to rate), and the dashboard shows what is due.
- **STAR stories.** A bank of behavioural stories. The AI tidies structure from your own notes and a resume bullet, and is told never to invent numbers.
- **Shareable reports.** Create a 30-day link so a mentor can read your scores and feedback without signing in. The link never exposes audio, your answers or your name, and can be turned off.
- **Emails.** Report-ready mails, a Monday summary (interviews, flashcards, coding, stories, cards due and application steps this week) and a daily tip, all in the app's look, with text escaped and a plain-text part. The summary and tip can be turned off in Settings.

### Career tools
- **Resume builder.** Five LaTeX templates (a faithful two-column original plus ATS-friendly single-column layouts), exact `.tex` import, live A4 preview, Overleaf export, plain-text copy and draft protection.
- **One page, guaranteed.** The resume is laid out with the same renderer as the preview and measured against A4. "Fit to one page" shortens long bullets (never cutting a figure), trims the summary, keeps the strongest bullets per entry and drops the weakest projects, and says what it did. It runs automatically after tailoring and after GitHub projects are added.
- **Strict ATS score.** Graded checks on contact details, links, sections, summary, bullets per entry, action verbs and repeats, measurable results, bullet length, weak or first-person phrasing, buzzwords, skills, projects, dates, page fill and job-description keywords. The total is curved so a resume with warnings does not score in the nineties, and a resume that runs to two pages is capped. The panel lists the three fixes worth the most points.
- **Tailor to a job.** Paste a job description and get rewritten bullets that keep every figure, plus a cover letter grounded in your resume.
- **GitHub project indexing.** Enter a GitHub username. PrepSpace lists the public repositories, reads each one (README, structure, dependency files, languages, activity), asks DeepWiki for an architecture read, and summarises it with your Gemini key. When you tailor to a job it picks the best-fitting projects and writes about them from verified facts only. If the username is the GitHub account on your resume profile, the indexed projects are added to the resume automatically, ranked for ATS and trimmed to one page; otherwise you choose which to add.
- **Application tracker.** Track statuses, next steps and job descriptions, and jump straight to tailoring or practising.
- **Offer coach.** Compare offers side by side (year-one cash and yearly total with equity) and get a counter-offer email built only from your numbers and notes. It never quotes market data.
- **Command palette** with Ctrl or Cmd + K.

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
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side admin operations: shared report links, XP awards, cron jobs |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional | Caching |
| `SMTP_*` | optional | Report emails |
| `NEXT_PUBLIC_SITE_URL` | yes | Links in emails |
| `CRON_SECRET` | optional | If set, the daily tip and weekly digest endpoints require it as a bearer token, and a test send to one address becomes possible. If unset they still run, but only once per period, so nobody who finds the URL can make them send more than the schedule would. |
| `GITHUB_TOKEN` | optional | A read-only token with no scopes, set on the server, that lifts GitHub's shared 60 requests per hour limit for public repository lookups. Users never enter a token. |

### Database

Run these in the Supabase SQL editor, in order. Every script is safe to run more than once.

1. `supabase/migrations/full_schema.sql`: the complete schema. For a fresh project this is all you need.
2. `supabase/migrations/004_practice_features.sql`: for a project that already has the older base schema. It adds the application tracker, workspace documents, coding submissions, flashcards, STAR stories, offers and shared reports, and locks down `increment_xp` so only the server can award XP, adds the email opt-out column and a small table that keeps scheduled emails to once per period, and removes the unused GitHub token column. It is safe to run after any earlier script: it skips what exists and never touches your data.

The GitHub feature reads public repositories only, so it needs no schema.

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
```

## Quality checks

From `apps/web`:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Verified

- All five LaTeX templates were compiled with pdfLaTeX (TeX Live 2026) using a real resume. After "Fit to one page" every template produced exactly one page, and the preview's page-fill figure matched the PDF within about 2 percentage points (overflow beyond one page was under-reported by up to 6).
- Gemini API keys are encrypted at rest (AES-256-GCM, key derived from `SUPABASE_SERVICE_ROLE_KEY`, or `APP_SECRET` if you set one). Keys saved earlier are encrypted the next time their owner loads the app. If that secret changes, users add their key again.

## Known limits

- Running code supports JavaScript, TypeScript, Python and SQL. SQL runs on SQLite, so Postgres-only syntax may fail. Go, Java and C++ are not runnable.
- Video analysis is a coaching aid based on a handful of snapshots. It is not a measurement.
- The ATS score is a strict heuristic, not a real applicant tracking system.

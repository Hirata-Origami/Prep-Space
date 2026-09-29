# PrepSpace roadmap

Living plan. Items are ordered by how much demand and value they carry for interview prep, and each one is ticked when shipped.
Status key: `[x]` shipped, `[~]` in progress, `[ ]` planned.

## Findings that shaped the plan

- The live interview already streams webcam frames (1 per second) to Gemini, so the interviewer can see the candidate. The final report, however, is built from the transcript only, so body language and presence are never scored.
- Only public GitHub repositories are needed for resume project selection. DeepWiki cannot see private repos anyway, so a GitHub token adds risk (secret storage) for little value.
- System design and coding rounds are the most asked-for interview formats, and the app has nowhere to write code, SQL or draw an architecture.

## Phase A: cleanup

- [x] A1. Public-only GitHub: remove token entry, token storage, private-repo indexing, `lib/crypto.ts`, `APP_ENCRYPTION_KEY`.
- [x] A2. Migration `002` rewritten: applications table only (no token column). Workspaces table goes in `003`.

## Phase B: interview realism

- [x] B1. Video analysis. During the interview the browser samples small frames and simple presence signals; at the end the report is scored on eye contact, posture, expression, framing and distractions, with concrete timestamped notes.
  - Camera-off sessions skip the video section and say so.
  - Frames are downsized JPEGs sent once with the report request and never stored.
- [x] B2. Shared board inside the live interview: write code or draw, then share it so the interviewer reads it (sent as text into the Live session).

## Phase C: workspace (write, code, draw)

- [x] C1. `/workspace` documents: notes, code or SQL, and diagram pages, saved per user.
- [x] C2. Code and SQL editor: line numbers, tab handling, syntax colours, language picker.
- [x] C3. Diagram canvas (SVG, no heavy dependency): boxes, databases, queues, clients, arrows, labels, freehand pen, drag, pan, zoom.
- [x] C4. AI can write: review code or SQL, explain, fix, write a solution, complexity notes.
- [x] C5. AI can draw: describe a system in words and get an architecture diagram with auto layout; ask for changes ("add a cache before the DB") and it edits the current diagram.
- [x] C6. Export diagram as SVG/PNG, copy code.

## Phase D: high-demand candidates (after A to C)

Ranked by demand among interview-prep users.

1. [x] Coding practice with an AI judge: ten tracks, three levels, attempt history, XP once per problem.
2. [x] Spaced-repetition flashcards from weak areas found in reports (SM-2, keyboard review, dashboard nudge).
3. [x] Behavioural answer builder (STAR story bank tied to resume bullets).
4. [x] Offer coach: side-by-side comparison and a counter email that never invents market data.
5. [x] Weekly progress email (cron, secret required).
6. [x] Shareable report link for mentors (30 days, revocable, private fields removed).

## Changelog

- 2026-09-29: plan created.
- 2026-09-29: A (public-only GitHub, migrations), B1 (video analysis), B2 (shared board), C1 to C6 (workspace) shipped. Migration 003 adds workspace_docs. D1 started.
- 2026-09-29: D1 to D6 shipped, then rebuilt after review: pages moved onto the design system, share and cron endpoints hardened, XP awarding moved server-side, SWR cache no longer persisted (it caused hydration errors). Migration 004 replaces 002 and 003.

## Next candidates

- Run real code for the judge (a sandboxed runner) instead of predicting results.
- Mock interview for system design that uses the shared board automatically.
- Recruiter-style email reminders for application next steps.
- Encrypt stored Gemini keys.

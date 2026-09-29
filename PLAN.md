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

1. [~] Coding practice with AI judge for SQL and algorithms. Shipped: "Give me a problem", review, fix, tests in the workspace. Next: difficulty tracks and a solved-problems history.
2. [ ] Spaced-repetition flashcards from weak areas found in reports.
3. [ ] Behavioural answer builder (STAR stories bank tied to resume bullets).
4. [ ] Salary and offer negotiation coach.
5. [ ] Weekly progress email and streak reminders (cron already exists).
6. [ ] Shareable report link for mentors.

## Changelog

- 2026-09-29: plan created.
- 2026-09-29: A (public-only GitHub, migrations), B1 (video analysis), B2 (shared board), C1 to C6 (workspace) shipped. Migration 003 adds workspace_docs. D1 started.

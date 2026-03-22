# 🧠 AI Interview & Career Readiness Platform — Master Build Prompt v2.0

> **Purpose of this document:** This is the single source of truth for designing, architecting, and building a world-class, production-grade, multitenant AI interview and career readiness platform. Every architectural decision, data model, feature set, AI pipeline, and UX direction is defined here. Engineers, AI coding agents, and product designers should treat this as the canonical specification.
>
> **v2.0 Changes:** Full $0 infrastructure stack (Vercel + Supabase + AWS Lambda free tier), Gemini 2.5 Flash Live API for interviews, Gemini Embedding 2 for skill vectors, Supabase Auth as primary auth (50K MAU free) with Clerk as premium alternative, all TTS fallback layers removed, rate limits documented precisely per provider's March 2026 free tier specs.

---

## TABLE OF CONTENTS

1. [Product Vision & Positioning](#1-product-vision--positioning)
2. [Competitor Analysis & Differentiation](#2-competitor-analysis--differentiation)
3. [Tech Stack — Full Specification](#3-tech-stack--full-specification)
4. [Free-Forever Infrastructure & Rate Limit Budget](#4-free-forever-infrastructure--rate-limit-budget)
5. [High-Level Design (HLD)](#5-high-level-design-hld)
6. [Low-Level Design (LLD)](#6-low-level-design-lld)
7. [Design Patterns & Architecture Principles](#7-design-patterns--architecture-principles)
8. [Multitenancy Architecture](#8-multitenancy-architecture)
9. [Landing Page — Immersive Scroll Experience](#9-landing-page--immersive-scroll-experience)
10. [Module 1 — Personalized Roadmap Engine](#10-module-1--personalized-roadmap-engine)
11. [Module 2 — AI Live Interview Engine (Gemini 2.5 Flash Live API)](#11-module-2--ai-live-interview-engine-gemini-25-flash-live-api)
12. [Module 3 — Groups & Collaborative Roadmaps](#12-module-3--groups--collaborative-roadmaps)
13. [Module 4 — Mock Company Interview](#13-module-4--mock-company-interview)
14. [Module 5 — Resume Builder](#14-module-5--resume-builder)
15. [Module 6 — Smart Hire (B2B Recruiter Module)](#15-module-6--smart-hire-b2b-recruiter-module)
16. [Module 7 — Edu Bundle (Education Institution Module)](#16-module-7--edu-bundle-education-institution-module)
17. [Module 8 — Peer Practice (P2P Interview Network)](#17-module-8--peer-practice-p2p-interview-network)
18. [Module 9 — AI Copilot & Real-Time Coaching](#18-module-9--ai-copilot--real-time-coaching)
19. [Module 10 — Analytics & Intelligence Dashboard](#19-module-10--analytics--intelligence-dashboard)
20. [Proctoring & Integrity Engine](#20-proctoring--integrity-engine)
21. [Gamification & Engagement Layer](#21-gamification--engagement-layer)
22. [Notification & Communication System](#22-notification--communication-system)
23. [Scalability & Infrastructure](#23-scalability--infrastructure)
24. [Security, Compliance & RBAC](#24-security-compliance--rbac)
25. [API Design & Integration Layer](#25-api-design--integration-layer)
26. [Database Schema — Full Reference](#26-database-schema--full-reference)
27. [Development Phases & Milestones](#27-development-phases--milestones)
28. [Appendix A — Gemini Live System Prompt Template](#appendix-a--gemini-live-system-prompt-template)
29. [Appendix B — Environment Variables Reference](#appendix-b--environment-variables-reference)

---

## 1. PRODUCT VISION & POSITIONING

### Tagline
**"Train like it's real. Land what you deserve."**

### What This Platform Is
A full-stack, AI-native, multitenant platform that serves three distinct user personas:

| Persona | Role | Primary Value |
|---|---|---|
| **Job Seeker** | Individual candidate | Personalized interview training, roadmap-based learning, resume building |
| **Recruiter / Company** | Hiring team | Automated candidate screening, AI-evaluated assessments, ranked shortlists |
| **Educator / Institution** | College, university, bootcamp | Structured academic interview prep, batch tracking, placement readiness |

### Core Philosophy
- **Adaptive over Generic:** Every interview, every question, every report is personalized to the individual's skill graph — not templated.
- **Audio-First:** The primary interaction medium is voice. AI speaks; candidate speaks. Gemini 2.5 Flash Live API creates genuine conversational physics.
- **Proof Over Claims:** Every strength and weakness claim is backed by timestamped audio evidence the user can replay.
- **$0 Until Scale:** Free-forever infrastructure stack handles thousands of users per month at zero cost. Upgrade path is clear, gradual, and justified by revenue.
- **Production-Grade from Day 1:** Multitenant, RBAC-enforced, event-driven, horizontally scalable architecture that proves technical expertise.

---

## 2. COMPETITOR ANALYSIS & DIFFERENTIATION

### Competitive Landscape Map

| Platform | Strength | Gap We Fill |
|---|---|---|
| **Final Round AI** | Real-time copilot during live interviews | Passive assistance only; no deep training roadmap |
| **Interviewing.io** | FAANG engineer expert feedback | Expensive ($225/session), no AI personalization |
| **Pramp** | Free peer-to-peer mock interviews | Inconsistent peer quality, no adaptive learning |
| **HelloInterview** | Strong system design AI practice | Narrow scope, no behavioral or roadmap layer |
| **HireVue** | Enterprise video interview screening | No candidate-facing training; B2B only |
| **Big Interview** | Structured STAR behavioral coaching | No technical interview; no roadmap engine |
| **Yoodli** | Communication & delivery analytics | No content evaluation; purely delivery-focused |
| **TestGorilla** | Pre-employment skill assessments | Assessment only; no training or improvement loop |
| **Beyz AI** | Real-time answer suggestions | Enables cheating; no integrity layer |
| **Google Interview Warmup** | Free, low-friction behavioral warmup | Extremely basic; no personalization or depth |

### Our Unique Differentiators
1. **Gemini 2.5 Flash Live API** for sub-100ms latency real-time conversational interviews — native voice-to-voice, no turn-based awkwardness
2. **Gemini Embedding 2** multimodal skill graph — text, audio, and behavioral signals unified in one embedding space
3. **Adaptive Skill Graph** — platform truly knows where you are and tunes every session to your exact gaps
4. **Timestamped Audio Evidence Reports** — every score backed by a replayable audio moment
5. **Proctoring with Integrity Scoring** — behavioral signals without invasive surveillance
6. **Multitenant from Core** — B2C, B2B, and Edu share one codebase with full row-level isolation
7. **Roadmap-to-Resume Pipeline** — interview data directly informs resume generation
8. **Peer Practice + AI Practice** — volume (AI) + calibration (peer) in one platform
9. **Company-Specific Mock Rounds** with ruthless practice mode simulating real interview day pressure
10. **$0 Infrastructure** — enables free tier for users without burning revenue, creating a genuine moat

---

## 3. TECH STACK — FULL SPECIFICATION

### Frontend
```
Framework:        Next.js 14+ (App Router, React Server Components, SSR/SSG/ISR)
Language:         TypeScript (strict mode)
Styling:          Tailwind CSS 3.4+ + CSS Variables for per-tenant theming
UI Components:    ShadCN UI (headless) + Radix UI primitives
Animation:        Framer Motion (page transitions, micro-interactions)
Scroll FX:        GSAP 3 + ScrollTrigger plugin (landing page immersive sections)
3D / WebGL:       Three.js + React Three Fiber (landing page hero particle field)
Charts:           Recharts + D3.js (interview analytics, radar charts, heatmaps)
Audio Waveform:   WaveSurfer.js (timestamped audio replay with annotations)
Video/Audio:      WebRTC getUserMedia (live interview audio capture)
State:            Zustand (client state) + TanStack Query v5 (server state + caching)
Forms:            React Hook Form + Zod (runtime validation)
Code Editor:      Monaco Editor (coding interview questions, in-browser)
Whiteboard:       Excalidraw (system design rounds)
i18n:             next-i18next (multilingual, starting with EN/ES/HI/ZH/AR)
PWA:              next-pwa (service worker, offline shell, push notifications)
Testing:          Vitest + React Testing Library + Playwright (E2E)
Deployment:       Vercel (Hobby tier — unlimited bandwidth, free forever)
```

### Backend — AWS Lambda (Free Forever Tier)
```
Runtime:          Node.js 20 LTS (TypeScript, compiled via esbuild)
Framework:        AWS Lambda (direct handler functions, no framework overhead)
API Style:        REST (Lambda + API Gateway HTTP API — cheapest option)
Bundler:          esbuild (sub-100ms cold starts via minimal bundle size)
ORM:              Prisma (generates type-safe queries; connection via Supabase pooler)
API Gateway:      AWS API Gateway HTTP API (70% cheaper than REST API type)
Auth Middleware:  Supabase JWT verification on every Lambda invocation
Deployment:       Serverless Framework v4 OR AWS SAM (IaC, no CDK needed)
CI/CD:            GitHub Actions → Serverless deploy on push to main
Monitoring:       AWS CloudWatch Logs (structured JSON via Pino logger)
Secrets:          AWS Systems Manager Parameter Store (free) + .env for local
Cold Start Opt:   Keep-warm pings via EventBridge Scheduler (free tier: 14M events/mo)
Concurrency:      AWS Lambda default: 1,000 concurrent executions (no config needed)
Timeout:          30s for API routes, 15min for async workers (report generation)
```

### Database & Backend Services — Supabase (Free Forever Tier)
```
Primary DB:       Supabase PostgreSQL 15 (shared compute, 500MB free)
                  — pgvector extension enabled (skill graph embeddings)
                  — Row-Level Security (RLS) enforced (tenant isolation)
                  — Prisma connects via Supabase connection pooler (port 6543)
Auth:             Supabase Auth (50,000 MAU free — email, Google, GitHub OAuth)
                  — JWT tokens verified by Lambda middleware
                  — RLS policies reference auth.uid() for per-user isolation
File Storage:     Supabase Storage (1GB free — audio segments, resumes, avatars)
                  — Signed URLs for private access (interview recordings)
                  — Public bucket for avatars and company logos
Realtime:         Supabase Realtime (session transcript streaming, group feeds)
                  — Uses PostgreSQL LISTEN/NOTIFY under the hood
Edge Functions:   Supabase Edge Functions (500K invocations free/month)
                  — Used for: proctoring event ingestion, webhook handling
Scheduled Jobs:   Supabase pg_cron (free, runs inside Postgres)
                  — Triggers report generation after session completion
                  — Daily skill graph recalculation
                  — Streak reset at midnight UTC
Connection Pool:  Supabase built-in PgBouncer (transaction mode, free)
```

### AI Layer — Google Gemini (Free Tier + Pay-as-you-scale)
```
Live Interview:   gemini-2.5-flash-preview-native-audio (Gemini 2.5 Flash Live API)
                  — Bidirectional real-time audio streaming (WebSocket)
                  — Native voice activity detection (VAD) built in
                  — Sub-100ms response latency
                  — Interruption handling (candidate can interrupt AI naturally)
                  — Native audio output (no separate TTS needed — zero fallback)
                  — Model string: gemini-live-2.5-flash-preview

Analysis Engine:  gemini-3.1-flash-lite-preview (post-interview deep analysis)
                  — Full transcript evaluation via function calling
                  — Competency scoring with structured JSON output
                  — Generates audio annotations and improvement recommendations
                  — Rate limit: 10 RPM / 250 RPD (free) → 300 RPM (Tier 1)

JD Parsing:       gemini-3.1-flash-lite-preview (fast, cost-efficient JD extraction)
                  — Rate limit: 15 RPM / 1,000 RPD (free) — highest throughput
                  — Used for all lightweight tasks: classification, routing, parsing

Resume Gen:       gemini-3.1-flash-lite-preview (structured resume generation)
                  — Function calling for structured output (no parse fragility)

Embeddings:       gemini-embedding-2 (Google's latest multimodal embedding model)
                  — Model string: gemini-embedding-2-preview
                  — Supports: text, image, audio, video, PDF in unified space
                  — Used for: user skill graph vectors, semantic question search
                  — Rate limit: 10M tokens/minute (free — extremely generous)
                  — Output dimension: 3072 (configurable down to 256 for efficiency)
                  — Stored in: pgvector column on Supabase (ivfflat index)

Orchestration:    LangChain.js (multi-step AI pipelines, prompt chaining)
Prompt Storage:   Supabase DB table (versioned, A/B testable, per-tenant override)

⚠️  NO TTS FALLBACK: Gemini 2.5 Flash Live API provides native audio output.
    There is no separate text-to-speech system. If Live API is unavailable,
    the session gracefully degrades to text-only mode (no third-party TTS).
```

### Authentication — Supabase Auth (Primary) + Clerk (Premium Alternative)
```
Primary Auth:     Supabase Auth
                  FREE TIER: 50,000 MAU forever (no credit card)
                  Providers: Email/Password, Magic Link, Google OAuth, GitHub OAuth
                  MFA: TOTP (free on all plans)
                  Session: JWTs auto-refreshed, verified in Lambda middleware
                  RBAC: Custom claims in JWT metadata (role, tenantId, plan)
                  RLS: auth.uid() wired directly into all Postgres policies
                  Best for: Early stage, cost-conscious, tight Supabase integration

Premium Alt:      Clerk (upgrade when DX or organization features are needed)
                  FREE TIER: 10,000 MAU (lower than Supabase, but richer DX)
                  Paid: $0.02/MAU after 10K
                  Features: Pre-built <SignIn/> components, Organizations API,
                            impersonation, session management, audit logs
                  Best for: When B2B organizational features justify the cost
                  NOTE: Clerk + Supabase can coexist (Clerk issues JWT, Supabase
                        verifies via JWKS endpoint — documented integration)

Decision Rule:
  - Launch phase (0–50K MAU): Supabase Auth exclusively (fully free)
  - Growth phase (50K+ MAU or B2B org features needed): Evaluate Clerk upgrade
  - Never use: AWS Cognito (complex), Auth0 (expensive), Firebase Auth (poor DX)
```

### Other Infrastructure
```
Email:            Resend (3,000 emails/month free — transactional)
                  Fallback: Supabase built-in email (50/hour free)
Push:             Firebase Cloud Messaging (FCM) — completely free, unlimited
Payments:         Stripe (no monthly fee; 2.9% + 30¢ per transaction only)
Feature Flags:    Supabase DB table (per-tenant JSON config — no separate service)
Rate Limiting:    Upstash Redis (10K commands/day free on free tier)
                  — Sliding window per-user and per-tenant
Analytics:        Vercel Analytics (built-in, free) + PostHog (1M events/month free)
Error Tracking:   Sentry (5K errors/month free)
```

---

## 4. FREE-FOREVER INFRASTRUCTURE & RATE LIMIT BUDGET

> This section is the authoritative reference for every provider's free tier limits as of **March 2026**. All architectural decisions around queuing, batching, and graceful degradation must respect these hard limits.

### Gemini API — Free Tier Rate Limits (March 2026)

| Model | Use Case | RPM | RPD | TPM | Notes |
|---|---|---|---|---|---|
| `gemini-live-2.5-flash-preview` | Live interview sessions | ~3 concurrent sessions | ~50 sessions/day | 250K TPM | Live API = concurrent sessions not RPM |
| `gemini-3.1-flash-lite-preview` | Post-session analysis, resume gen | 10 RPM | 250 RPD | 250K TPM | Primary workhorse model |
| `gemini-3.1-flash-lite-preview` | JD parsing, classification, routing | 15 RPM | 1,000 RPD | 250K TPM | Highest free throughput |
| `gemini-2.5-pro` | Complex reasoning (used sparingly) | 5 RPM | 100 RPD | 250K TPM | Reserved for hardest tasks only |
| `gemini-embedding-2-preview` | Skill graph embeddings | N/A | N/A | 10M TPM | Extremely generous — not a bottleneck |

**Critical Architecture Notes:**
- Rate limits are **per project, not per API key** — multiple keys in the same project share the same quota
- Free tier prompts **may be used for model training** — do NOT send PII or proprietary candidate data in raw form; always anonymize or hash identifiers in prompts
- EU/EEA/UK/Switzerland users: Free tier is **not available** for these regions — plan for Tier 1 ($0 upfront, pay-per-token) for European customers from day one
- **Gemini 2.0 Flash is deprecated** (retired March 3, 2026) — never use it; use 2.5 Flash or 2.5 Flash-Lite

**Rate Limit Strategy:**
```
Free tier capacity (per day):
  Live sessions:     ~50 concurrent interviews/day
  Analysis reports:  250 reports/day (1 per session, routed to 2.5-flash)
  JD parsings:       1,000 JD parses/day (routed to flash-lite)
  Embeddings:        Effectively unlimited (10M TPM)

When RPD limit is hit:
  Live API:   → Queue session request; show user estimated wait time
  Analysis:   → pg_cron retries every 30 min until quota resets at midnight PT
  JD Parsing: → Immediate fallback to gemini-3.1-flash-lite-preview (250 RPD backup pool)
```

### AWS Lambda — Free Tier (Always Free, No Expiry)

| Resource | Free Allowance | Notes |
|---|---|---|
| Requests | 1,000,000 req/month | Resets monthly — never expires |
| Compute | 400,000 GB-seconds/month | At 128MB: 3.2M seconds of execution |
| Concurrent executions | 1,000 (soft limit) | Requestable increase via support |
| Timeout max | 15 minutes | Long enough for report generation |
| Ephemeral storage | 512MB per function | Free |
| HTTP response streaming | 100 GiB/month | For chunked AI responses |

**Lambda Budget Calculation for 1,000 Daily Active Users:**
```
Scenario: 1,000 DAU × 5 API calls/session × 200ms avg duration × 128MB memory
Requests/month: 1,000 × 5 × 30 = 150,000 req → well within 1M free
GB-seconds/month: 150,000 × 0.2s × 0.128GB = 3,840 GB-s → well within 400K free
Verdict: FREE up to ~5,000 DAU with current session profile
```

### Supabase — Free Tier (Forever, 2 Projects Max)

| Resource | Free Allowance | Notes |
|---|---|---|
| Database storage | 500MB | Partition sessions data aggressively; archive to S3 after 90 days |
| File storage | 1GB | Audio chunks stored here temporarily; move completed audio to... |
| Monthly Active Users | 50,000 MAU | Extremely generous — covers most early-stage SaaS |
| API requests | Unlimited | No per-request charges (unlike Firebase) |
| Realtime messages | 2 million/month | Enough for active session transcription |
| Edge Function invocations | 500,000/month | Proctoring events, webhooks |
| Bandwidth (egress) | 5GB/month | CDN-serve audio via Supabase Storage signed URLs |
| pg_cron jobs | Unlimited | All async triggers run here for free |
| Concurrent connections | 200 max | Use Supabase PgBouncer pooler (transaction mode) to stay under limit |
| Inactivity pause | After 1 week | ⚠️ Use keep-alive ping via GitHub Actions cron to prevent pause in dev |

**Storage Architecture for $0:**
```
Audio recording lifecycle:
  1. Live session: Audio chunks → Supabase Storage (temp, <100MB per session)
  2. Session complete: Full audio assembled → kept in Supabase Storage if < 50MB
  3. After 90 days OR if storage approaches 800MB: → archived to S3 Glacier
     (S3 Standard: 5GB free for 12mo; Glacier: $0.004/GB/month after)

Database space optimization:
  - Store only metadata and indexes in Postgres
  - Store large blobs (transcripts > 10KB, full reports) in Supabase Storage as JSON files
  - Partition interview_sessions by month; drop partitions older than 6 months on free tier
```

### Vercel — Hobby Tier (Free Forever)

| Resource | Free Allowance | Notes |
|---|---|---|
| Bandwidth | 100GB/month | More than enough for Next.js app |
| Serverless function invocations | 1M/month | Used for Next.js API routes (minimal) |
| Build minutes | 6,000 min/month | Plenty for CI/CD |
| Edge network | Global CDN | Included free |
| Preview deployments | Unlimited | Per PR previews |
| Custom domains | 1 per project | Use subdomain strategy for tenants |

### Resend Email — Free Tier

| Resource | Free Allowance |
|---|---|
| Emails/month | 3,000 |
| Rate limit | 10 emails/second |
| Custom domains | 1 |

**Email Budget:** 3,000/month covers ~100 active users with 30 emails/month each (session reports, invites, reminders). Upgrade at 100+ DAU.

### Upstash Redis — Free Tier (Rate Limiting)

| Resource | Free Allowance |
|---|---|
| Commands/day | 10,000 |
| Max database size | 256MB |
| Global replication | Available |

**Usage:** Only used for sliding-window rate limiting per user. Each API request = 2 Redis commands (GET + INCR). Budget: 10,000 commands = 5,000 rate limit checks/day — sufficient for early stage.

### Total Monthly Cost at Zero Scale: **$0.00**
### Total Monthly Cost at 1,000 DAU: **$0.00** (all within free tiers)
### Estimated Upgrade Trigger: **5,000+ DAU** → ~$25–50/month (Supabase Pro + Gemini Tier 1)

---

## 5. HIGH-LEVEL DESIGN (HLD)

### System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                  │
│  Next.js 14 (SSR/SSG/RSC) — Vercel Hobby (free, global CDN)         │
│  WebRTC Audio Capture — GSAP + Three.js + Framer Motion UI          │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼─────────────────────────────────────────────┐
│                      API LAYER                                        │
│  AWS API Gateway (HTTP API) + AWS Lambda                             │
│  — REST endpoints for all CRUD + business logic                     │
│  — JWT verified via Supabase JWKS on every invocation               │
│  — Tenant context extracted from JWT claims                         │
└──────┬──────────────┬──────────────────┬───────────────┬────────────┘
       │              │                  │               │
┌──────▼─────┐ ┌──────▼──────┐ ┌────────▼───┐ ┌────────▼────┐
│  Auth      │ │  Core API   │ │  Session   │ │  Async      │
│  Lambda    │ │  Lambda(s)  │ │  Token     │ │  Worker     │
│  (verify   │ │  (roadmap,  │ │  Lambda    │ │  Lambda     │
│   + RBAC)  │ │  reports,   │ │  (issues   │ │  (report    │
│            │ │  resume..)  │ │  ephemeral │ │  gen, email,│
│            │ │             │ │  Gemini    │ │  skill graph│
│            │ │             │ │  token)    │ │  update)    │
└──────┬─────┘ └──────┬──────┘ └────────┬───┘ └────────┬────┘
       │              │                  │               │
┌──────▼──────────────▼──────────────────▼───────────────▼────────────┐
│                        DATA LAYER                                     │
│  Supabase PostgreSQL (RLS + pgvector + pg_cron)                      │
│  Supabase Storage (audio, resumes, avatars — 1GB free)               │
│  Supabase Realtime (session transcript streaming)                    │
│  Upstash Redis (rate limiting — 10K commands/day free)               │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ Direct browser WebSocket (no backend proxy)
┌──────────────────────────▼───────────────────────────────────────────┐
│                        AI LAYER                                       │
│  Gemini 2.5 Flash Live API (browser ↔ Gemini directly)              │
│  wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
│  — Ephemeral token from Session Token Lambda (15min TTL)            │
│  Gemini 2.5 Flash (Lambda — post-session analysis)                  │
│  Gemini 2.5 Flash-Lite (Lambda — JD parsing, classification)        │
│  Gemini Embedding 2 (Lambda — skill graph vector generation)        │
└──────────────────────────────────────────────────────────────────────┘
```

### Request Flow — Live Interview Session (Critical Path)

```
1. User clicks "Start Interview"
   → POST /v1/sessions (Lambda)
   → Lambda validates JWT, checks rate limits (Upstash), creates session row in Supabase
   → Returns: { sessionId, status: 'pending_token' }

2. Client requests ephemeral Gemini token
   → POST /v1/sessions/{id}/token (Session Token Lambda)
   → Lambda loads: user skill graph, module topics, tenant prompt config from Supabase
   → Lambda constructs full system prompt (Decorator pattern — see LLD)
   → Lambda calls Gemini API: POST /v1beta/models/gemini-live-2.5-flash-preview:generateContent
     with ephemeralTokenRequest { ttlSeconds: 900, systemInstruction: fullPrompt }
   → Returns: { ephemeralToken, expiresAt }

3. Browser opens direct WebSocket to Gemini Live API
   → wss://generativelanguage.googleapis.com/... with token in header
   → No backend proxy — browser ↔ Gemini directly
   → Eliminates Lambda WebSocket costs and latency

4. Live session running
   → Audio: Browser mic → Gemini (native audio) → Gemini voice → Browser speaker
   → Transcript: Gemini streams text transcript → Supabase Realtime channel
   → Proctoring events: Browser → POST /v1/sessions/{id}/proctor (Supabase Edge Function)
   → State updates: Lambda polling endpoint /v1/sessions/{id}/state (lightweight)

5. Session ends (user ends OR Gemini calls end_session function)
   → Browser POSTs /v1/sessions/{id}/complete (Lambda)
   → Lambda updates session status to 'processing' in Supabase
   → Lambda publishes pg_notify('report_queue', sessionId)

6. pg_cron picks up report generation (runs every 2 minutes)
   → Supabase pg_cron → triggers Edge Function → calls Lambda /internal/generate-report
   → Lambda: fetches transcript from Supabase Realtime buffer
   → Lambda: calls Gemini 2.5 Flash for deep analysis
   → Lambda: calls Gemini Embedding 2 to update skill graph vectors
   → Lambda: stores full report JSON in Supabase Storage
   → Lambda: upserts report metadata row in Supabase DB
   → Lambda: sends email via Resend + FCM push notification

7. User views report
   → Next.js page with ISR (Incremental Static Regeneration) for fast load
   → Report fetched from Supabase (direct client query via RLS)
   → Audio served via Supabase Storage signed URLs
```

### Tenant Resolution Flow

```
1. Request arrives: POST https://api.platform.com/v1/roadmaps
   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

2. Lambda middleware decodes JWT (Supabase-issued):
   { sub: "user-uuid", email: "user@company.com",
     app_metadata: { tenantId: "acme-corp", role: "candidate", plan: "pro" } }

3. Tenant config loaded from Supabase:
   SELECT * FROM tenant_configs WHERE id = 'acme-corp'
   → Cached in Lambda memory for 5 minutes (simple JS Map — no Redis needed)

4. All DB queries tagged: SET LOCAL app.tenant_id = 'acme-corp'
   → RLS policies automatically scope all queries to this tenant

5. AI prompts: SELECT content FROM prompt_templates WHERE tenant_id = 'acme-corp'
   → Falls back to platform defaults if no tenant override exists

6. Response returned with tenant branding headers:
   X-Tenant-Theme: { primary: '#4DFFA0', logo: '...', interviewerName: 'Alex' }
```

---

## 6. LOW-LEVEL DESIGN (LLD)

### Live Interview Session — State Machine

```typescript
// Session state machine — persisted in Supabase, replicated via Realtime
enum SessionState {
  INITIALIZING       = 'INITIALIZING',       // Lambda building session plan
  TOKEN_ISSUED       = 'TOKEN_ISSUED',        // Ephemeral token sent to browser
  CONNECTED          = 'CONNECTED',           // Browser WebSocket to Gemini open
  WARMUP             = 'WARMUP',              // AI intro and rapport-building
  QUESTION_ASKING    = 'QUESTION_ASKING',     // Gemini speaking question
  LISTENING          = 'LISTENING',           // Candidate answering
  EVALUATING         = 'EVALUATING',          // Gemini analyzing (internal)
  FOLLOW_UP          = 'FOLLOW_UP',           // Probe question after weak answer
  TRANSITIONING      = 'TRANSITIONING',       // Moving to next topic
  PAUSED             = 'PAUSED',              // User paused session
  COMPLETING         = 'COMPLETING',          // Gemini wrapping up
  PROCESSING         = 'PROCESSING',          // Report generation in progress
  COMPLETE           = 'COMPLETE',            // Report ready
  ABORTED            = 'ABORTED'              // User abandoned or connection lost
}

// Persisted to: interview_sessions.state (Supabase)
// Replicated via: Supabase Realtime channel 'session:{sessionId}'
// Consumed by: Frontend (live progress bar, UI state), Lambda (report trigger)
```

### Session Plan Builder (Decorator Pattern)

```typescript
// Runs in Session Token Lambda before issuing ephemeral Gemini token
class SessionPlanBuilder {
  private plan: Partial<SessionPlan> = {};

  // Step 1: Load base module definition
  withModule(module: Module): this {
    this.plan.moduleName = module.title;
    this.plan.topicList = module.topics;
    this.plan.totalQuestions = module.questionCount;
    return this;
  }

  // Step 2: Overlay user skill graph calibration
  withUserCalibration(skillGraph: UserSkillGraph): this {
    this.plan.userCalibration = {
      strongTopics: skillGraph.getTopicsAbove(75),
      weakTopics: skillGraph.getTopicsBelow(50),
      untestedTopics: skillGraph.getUntestedTopics(),
      speakingPatterns: skillGraph.speakingPatterns,
      overallLevel: skillGraph.overallLevel,
      previousSessionCount: skillGraph.sessionCount
    };
    // Reduce question depth for strong topics; increase for weak/untested
    this.plan.topicWeights = this.computeTopicWeights(this.plan.topicList, skillGraph);
    return this;
  }

  // Step 3: Inject tenant persona
  withTenantPersona(tenantConfig: TenantConfig): this {
    this.plan.interviewerName = tenantConfig.interviewerName ?? 'Alex';
    this.plan.interviewerTone = tenantConfig.interviewerTone ?? 'professional-warm';
    this.plan.tenantContext = tenantConfig.companyContext ?? null;
    return this;
  }

  // Step 4: Inject target company context (if Mock Company Interview mode)
  withCompanyContext(company: CompanyProfile): this {
    this.plan.companyName = company.name;
    this.plan.companyInterviewStyle = company.interviewCulture;
    this.plan.practiceMode = 'ruthless'; // No hints, no warmth
    return this;
  }

  // Step 5: Construct final system prompt
  build(): SessionPlan {
    const plan = this.plan as SessionPlan;
    plan.systemPrompt = this.constructSystemPrompt(plan);
    plan.sessionId = crypto.randomUUID();
    plan.createdAt = new Date();
    return plan;
  }

  private constructSystemPrompt(plan: SessionPlan): string {
    // Loads versioned template from Supabase prompt_templates table
    // Substitutes all {{variables}} with plan values
    // Returns complete system instruction string for Gemini Live API
    return PromptTemplateEngine.render('interview-system-prompt', plan);
  }
}
```

### Gemini 2.5 Flash Live API — Browser-Side Integration

```typescript
// Runs entirely in the browser — no backend WebSocket proxy
class GeminiLiveInterviewClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext;
  private mediaStream: MediaStream;
  private audioQueue: AudioBuffer[] = [];
  private questionBoundaries: TimestampMarker[] = [];

  async connect(ephemeralToken: string, sessionId: string): Promise<void> {
    // Open direct WebSocket to Gemini Live API using ephemeral token
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${ephemeralToken}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Send session configuration
      this.ws!.send(JSON.stringify({
        setup: {
          model: 'models/gemini-live-2.5-flash-preview',
          generation_config: {
            response_modalities: ['AUDIO', 'TEXT'],
            // NO speech_config needed — Gemini Live 2.5 handles voice natively
            // NO separate TTS — this is native audio output
          },
          tools: [
            { function_declarations: [evaluateAnswerFn, logQuestionFn, endSessionFn] }
          ]
        }
      }));
    };

    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      // Handle AI audio output — play directly
      if (data.serverContent?.modelTurn?.parts) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (part.inlineData?.mimeType === 'audio/pcm;rate=24000') {
            // Queue and play audio chunk
            await this.playAudioChunk(part.inlineData.data);
          }
          if (part.text) {
            // Stream transcript to Supabase Realtime for report building
            await supabase.channel(`session:${sessionId}`)
              .send({ type: 'transcript_chunk', text: part.text, ts: Date.now() });
          }
          if (part.functionCall) {
            await this.handleFunctionCall(part.functionCall, sessionId);
          }
        }
      }
    };

    // Capture microphone and stream to Gemini
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.startAudioStreaming();
  }

  private async startAudioStreaming(): Promise<void> {
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const pcmData = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
      }
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          realtimeInput: {
            audio: {
              data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))),
              mimeType: 'audio/pcm;rate=16000'
            }
          }
        }));
      }
    };
  }

  private async handleFunctionCall(
    call: { name: string; args: Record<string, unknown> },
    sessionId: string
  ): Promise<void> {
    if (call.name === 'evaluate_answer') {
      const ev = call.args as AnswerEvaluation;
      // Log question boundary timestamp
      this.questionBoundaries.push({ questionId: ev.questionId, startMs: ev.audioStartMs, endMs: ev.audioEndMs });
      // Persist to Supabase via Lambda
      await fetch(`/v1/sessions/${sessionId}/question-log`, {
        method: 'POST',
        body: JSON.stringify(ev),
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
    }
    if (call.name === 'end_session') {
      await this.gracefullyEnd(sessionId);
    }
  }
}
```

### Adaptive Question Engine

```typescript
class AdaptiveQuestionEngine {
  private difficultyLevel: number = 5;   // 1-10 scale, starts at midpoint
  private consecutiveCorrect = 0;
  private consecutiveWrong = 0;
  private coveredTopics = new Set<string>();

  // Injected into Gemini system prompt as structured instructions
  toPromptInstructions(): string {
    return `
CURRENT ADAPTIVE STATE:
- Current difficulty: ${this.difficultyLevel}/10
- Topics covered this session: ${[...this.coveredTopics].join(', ')}
- Consecutive correct: ${this.consecutiveCorrect}
- Consecutive wrong: ${this.consecutiveWrong}

DIFFICULTY ADJUSTMENT RULES (follow strictly):
- If candidate scores ≥8/10 for 3 consecutive questions → increase difficulty by 1
- If candidate scores ≤4/10 for 2 consecutive questions → decrease difficulty by 1.5
- Never go below 2 or above 9 within a session (maintain some challenge/achievability)

TOPIC SELECTION PRIORITY:
1. Required topics not yet covered: ${this.getUncoveredRequired().join(', ')}
2. User's weak topics (from calibration): select these after required are done
3. User's strong topics: ask only 1 stretch question; don't waste session time
    `;
  }

  recordEvaluation(score: number, topic: string): void {
    this.coveredTopics.add(topic);
    if (score >= 8) {
      this.consecutiveCorrect++;
      this.consecutiveWrong = 0;
      if (this.consecutiveCorrect >= 3) {
        this.difficultyLevel = Math.min(9, this.difficultyLevel + 1);
        this.consecutiveCorrect = 0;
      }
    } else if (score <= 4) {
      this.consecutiveWrong++;
      this.consecutiveCorrect = 0;
      if (this.consecutiveWrong >= 2) {
        this.difficultyLevel = Math.max(2, this.difficultyLevel - 1.5);
        this.consecutiveWrong = 0;
      }
    }
  }

  private getUncoveredRequired(): string[] {
    return this.requiredTopics.filter(t => !this.coveredTopics.has(t));
  }
}
```

### Skill Graph — Gemini Embedding 2 Integration

```typescript
// Runs in Async Worker Lambda after each session
class SkillGraphUpdater {
  async update(userId: string, tenantId: string, report: InterviewReport): Promise<void> {
    // Step 1: Extract topic scores from report
    const newTopicScores = report.topicScores;  // Record<string, number>

    // Step 2: Load existing skill graph from Supabase
    const { data: existing } = await supabase
      .from('user_skill_graphs')
      .select('topic_scores, skill_embedding')
      .eq('user_id', userId)
      .single();

    // Step 3: Blend new scores with existing (EWMA — weight recent more)
    const ALPHA = 0.4; // 40% weight to new session
    const blendedScores: Record<string, TopicScore> = {};
    for (const [topic, newScore] of Object.entries(newTopicScores)) {
      const existing_score = existing?.topic_scores?.[topic]?.currentScore ?? 50;
      blendedScores[topic] = {
        currentScore: existing_score * (1 - ALPHA) + newScore * ALPHA,
        trend: newScore > existing_score ? 'improving' : newScore < existing_score ? 'declining' : 'stable',
        lastTestedAt: new Date(),
        sessionCount: (existing?.topic_scores?.[topic]?.sessionCount ?? 0) + 1,
        confidence: Math.min(1, ((existing?.topic_scores?.[topic]?.sessionCount ?? 0) + 1) / 5)
      };
    }

    // Step 4: Generate updated embedding using Gemini Embedding 2
    // NOTE: gemini-embedding-2 supports multimodal — we pass both text description
    // and a JSON representation of the skill graph for richer embedding
    const embeddingInput = `
      Candidate skill profile for role: ${report.targetRole}
      Strong areas: ${Object.entries(blendedScores).filter(([,v]) => v.currentScore > 75).map(([k]) => k).join(', ')}
      Developing areas: ${Object.entries(blendedScores).filter(([,v]) => v.currentScore >= 50 && v.currentScore <= 75).map(([k]) => k).join(', ')}
      Gap areas: ${Object.entries(blendedScores).filter(([,v]) => v.currentScore < 50).map(([k]) => k).join(', ')}
      Session count: ${report.sessionNumber}
      Overall readiness: ${this.computeReadiness(blendedScores)}%
    `;

    const embeddingResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2-preview',
          content: { parts: [{ text: embeddingInput }] },
          outputDimensionality: 768  // Reduced from 3072 for storage efficiency in Supabase
        })
      }
    );

    const { embedding } = await embeddingResponse.json();

    // Step 5: Upsert skill graph in Supabase (with pgvector embedding)
    await supabase.from('user_skill_graphs').upsert({
      user_id: userId,
      tenant_id: tenantId,
      topic_scores: blendedScores,
      skill_embedding: embedding.values,  // pgvector column (768-dim)
      overall_level: this.computeLevel(blendedScores),
      readiness_score: this.computeReadiness(blendedScores),
      updated_at: new Date()
    });
  }

  private computeReadiness(scores: Record<string, TopicScore>): number {
    const values = Object.values(scores).map(s => s.currentScore * s.confidence);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  }

  private computeLevel(scores: Record<string, TopicScore>): string {
    const readiness = this.computeReadiness(scores);
    if (readiness >= 85) return 'expert';
    if (readiness >= 70) return 'advanced';
    if (readiness >= 50) return 'intermediate';
    if (readiness >= 30) return 'beginner';
    return 'novice';
  }
}
```

### Report Generation Pipeline (Async Worker Lambda)

```typescript
// Triggered by Supabase pg_cron → Edge Function → Lambda (every 2 minutes)
class ReportGenerationPipeline {
  async execute(sessionId: string): Promise<void> {
    // Step 1: Load session data from Supabase
    const session = await supabase.from('interview_sessions').select('*').eq('id', sessionId).single();
    const transcript = await this.assembleTranscript(sessionId);  // From Realtime buffer
    const questionLog = session.data.question_log as QuestionLogEntry[];

    // Step 2: Call Gemini 2.5 Flash for deep analysis (function calling for structured output)
    const analysisResponse = await gemini25Flash.generateContent({
      contents: [{ role: 'user', parts: [{ text: this.buildAnalysisPrompt(transcript, questionLog, session.data.plan) }] }],
      tools: [{ functionDeclarations: [generateReportFn] }],
      toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['generate_report'] } }
    });

    const report = analysisResponse.response.functionCalls()[0].args as DeepInterviewReport;

    // Step 3: Generate per-question audio annotations
    const annotations = this.buildAudioAnnotations(questionLog, report.questionAnalyses);

    // Step 4: Compute speaking analytics from transcript
    const speakingAnalytics = this.analyzeSpeaking(transcript);

    // Step 5: Update skill graph (Gemini Embedding 2)
    await new SkillGraphUpdater().update(session.data.user_id, session.data.tenant_id, {
      ...report,
      targetRole: session.data.plan.targetRole,
      sessionNumber: session.data.plan.sessionNumber
    });

    // Step 6: Store report in Supabase Storage (JSON file — keeps DB small)
    const reportKey = `tenants/${session.data.tenant_id}/reports/${sessionId}.json`;
    await supabase.storage.from('reports').upload(reportKey, JSON.stringify({
      ...report, annotations, speakingAnalytics
    }), { contentType: 'application/json', upsert: true });

    // Step 7: Store report metadata row in DB (lightweight reference only)
    await supabase.from('interview_reports').upsert({
      session_id: sessionId,
      user_id: session.data.user_id,
      tenant_id: session.data.tenant_id,
      overall_score: report.overallScore,
      hire_recommendation: report.hireRecommendation,
      report_storage_key: reportKey,
      generated_at: new Date()
    });

    // Step 8: Update module progress
    await this.updateModuleProgress(session.data.user_id, session.data.module_id, report);

    // Step 9: Notify user
    await resend.emails.send({ to: session.data.user_email, subject: 'Your interview report is ready', html: reportEmailHtml(report) });
    await fcm.send({ token: session.data.fcm_token, notification: { title: 'Report Ready', body: `You scored ${report.overallScore}/100` } });
  }
}
```

---

## 7. DESIGN PATTERNS & ARCHITECTURE PRINCIPLES

### Backend Patterns

| Pattern | Where Used | Why |
|---|---|---|
| **Repository Pattern** | All Supabase DB access | Decouples business logic from Supabase client; testable with mocks |
| **Service Layer Pattern** | Lambda business logic | Thin handlers, fat services; single responsibility |
| **CQRS** | Sessions (write) vs Reports (read) | Write to Supabase directly; read from Storage JSON + metadata; separate models |
| **Event Sourcing (lite)** | Session state changes | Full state history via question_log JSONB; replay any session exactly |
| **Saga Pattern** | Report generation pipeline | Distributed steps: transcript → analysis → embedding → store → notify; each independently retryable |
| **Circuit Breaker** | Gemini API calls in Lambda | If Gemini returns 429/503, stop retrying; return "processing" status; pg_cron retries later |
| **Outbox Pattern** | pg_notify for async jobs | Transactional consistency: session marked complete AND notify in same Postgres transaction |
| **Bulkhead** | Per-tenant rate limiting | Each tenant's Gemini quota tracked separately in Upstash; one power tenant can't starve others |
| **Strategy Pattern** | Interview types | `CodingInterviewStrategy`, `BehavioralInterviewStrategy`, `SystemDesignInterviewStrategy` — same session loop, different prompts and tools |
| **Factory Pattern** | Session plan construction | `SessionPlanFactory.create(type, userId, moduleId)` returns correct plan variant |
| **Observer Pattern** | Proctoring signal pipeline | Browser fires events; Supabase Edge Function collects; Lambda scores — fully decoupled |
| **Decorator Pattern** | System prompt construction | `SessionPlanBuilder` layers context incrementally (module → user → tenant → company) |

### Frontend Patterns

| Pattern | Where Used | Why |
|---|---|---|
| **Compound Component** | Interview UI, Report viewer | Flexible composition; parent manages state; children render independently |
| **Optimistic Updates** | Progress tracking, XP gains | Instant UI feedback via Zustand; reconcile with server in background |
| **Stale-While-Revalidate** | Dashboard data, leaderboards | Always show cached data; refresh via TanStack Query in background |
| **Command Pattern** | Interview controls (pause, end, skip) | Undoable, loggable; consistent keyboard shortcut handling |
| **Render Slots** | Layout with tenant branding | Per-tenant logo, colors, font injected via CSS variables without code changes |

### AI Prompt Engineering Patterns

| Pattern | Description |
|---|---|
| **Persona Injection** | System prompt defines interviewer name, tone, company context — per tenant override |
| **Few-Shot Calibration** | 2 examples of strong vs. weak answers for this specific module injected into context |
| **Chain-of-Thought Evaluation** | `"First identify what the candidate got right. Then what was missing. Then assign a score."` |
| **Structured Output via Function Calling** | ALL AI evaluations returned as typed JSON via Gemini function calling — zero parsing fragility |
| **Context Window Management** | Rolling: last 6 Q&A pairs in full; older history summarized to 3 sentences |
| **Prompt Versioning** | All prompts in `prompt_templates` Supabase table with version numbers; rollback in one SQL update |
| **Tenant Prompt Override** | `SELECT content FROM prompt_templates WHERE tenant_id = ? OR tenant_id IS NULL ORDER BY tenant_id NULLS LAST LIMIT 1` |

---

## 8. MULTITENANCY ARCHITECTURE

### Tenancy Model: Shared Database, Row-Level Security

Every table has a `tenant_id` column. PostgreSQL RLS policies enforce isolation at the database layer — even if application code has a bug, cross-tenant data access is blocked at Postgres level.

### Tenant Types

| Tenant Type | Example | Features Unlocked |
|---|---|---|
| `individual` | Solo job seeker (free) | All candidate modules |
| `group` | Study group (free) | Groups module + shared roadmap |
| `company` | Acme Corp (Smart Hire) | Smart Hire + company interview config + custom branding |
| `education` | MIT CSAIL | Edu Bundle + batch management + LMS integration |
| `platform` | Internal admin | All modules + platform analytics + billing management |

### Isolation Enforced At Every Layer

```sql
-- Supabase RLS (enforced at database level — cannot be bypassed by app code)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = (current_setting('app.tenant_id'))::UUID);

-- Every Lambda sets this before any query:
await supabase.rpc('set_config', { key: 'app.tenant_id', value: tenantId });
```

```typescript
// API Layer — middleware extracts tenantId from JWT, validates, sets in context
const tenantMiddleware = async (event: APIGatewayEvent): Promise<TenantContext> => {
  const jwt = decodeJWT(event.headers.Authorization);
  const tenantId = jwt.app_metadata?.tenantId;
  if (!tenantId) throw new UnauthorizedError('No tenant context in JWT');
  // Load from Lambda memory cache (5min TTL) before hitting Supabase
  return tenantConfigCache.getOrFetch(tenantId, () => loadTenantConfig(tenantId));
};
```

```
S3/Supabase Storage:  Key prefix: tenants/{tenantId}/ — IAM/RLS restricts cross-tenant access
Redis (Upstash):      Key prefix: t:{tenantId}: — namespaced to prevent collisions
AI Prompts:           tenant_id FK on prompt_templates — falls back to platform defaults
Feature Flags:        tenant_configs.features JSONB — per-tenant feature toggles
Branding:             tenant_configs.branding JSONB — logo, colors, fonts, interviewer persona
```

---

## 9. LANDING PAGE — IMMERSIVE SCROLL EXPERIENCE

### Design Direction
**Aesthetic:** Dark editorial — inspired by Linear.app's precision meets Stripe's trust meets a sci-fi product reveal. No generic SaaS gradients. No purple-on-white. This page should feel like the product itself is confident and unusual.

**Color Palette:**
```css
--bg-base:        #080C14;  /* Near-black, cold blue tint */
--bg-surface:     #0E1421;  /* Card surfaces */
--accent-primary: #4DFFA0;  /* Electric mint — growth, confidence */
--accent-violet:  #7B61FF;  /* Deep violet — intelligence, AI */
--accent-amber:   #FFB547;  /* Warm amber — warnings, highlights */
--text-primary:   #F0F4FF;  /* Bright white-blue */
--text-muted:     #6B7A99;  /* Cool gray */
--border:         rgba(255,255,255,0.06);
```

**Typography:**
```css
--font-display: 'Clash Display', 'PP Editorial New', sans-serif;  /* Headlines */
--font-body:    'DM Sans', 'Syne', sans-serif;                    /* Body text */
--font-mono:    'JetBrains Mono', 'Geist Mono', monospace;        /* Data, scores, code */
```

### Section-by-Section Specification

#### SECTION 1 — Hero (100vh, Three.js + GSAP)

**Background:** Three.js particle field — 800 nodes connected by faint lines, simulating a knowledge graph. On `mousemove`, particles gently repel cursor (repulsion radius: 120px). Particles drift at 0.02 speed.

**Center Content:**
```
[GSAP stagger reveal, each line: y: 40→0, opacity: 0→1, delay: 0.2s each]

"Train like it's real."     ← Clash Display, 96px, --text-primary
"Land what you deserve."    ← Clash Display, 96px, --accent-primary (gradient shimmer)

[Typewriter cycle below — Framer Motion]
Roles cycling: "Frontend Engineer" → "System Architect" → "ML Engineer" → "Product Manager"

[Sub-headline]
"The AI interview platform that knows exactly where you are —
and trains you precisely for where you need to be."
← DM Sans, 20px, --text-muted, max-width: 600px, centered

[CTAs — stagger in 0.4s after headline]
[ Start Free — No credit card ]    [ Watch 60s Demo ▶ ]

[Social proof ticker — infinite scroll horizontal marquee, 40px/s]
"47,000+ sessions completed · 92% report score improvements · 
Used by engineers at Google, Meta, Amazon · 150+ universities enrolled"
```

#### SECTION 2 — The Problem (GSAP ScrollTrigger.scrub)

**Layout:** Full viewport, split vertically. Left: animated stat counter. Right: "before/after" mock interview transcript UI that transforms as you scroll.

```javascript
// Transcript transformation tied to scroll position (scrub: true)
ScrollTrigger.create({
  trigger: '#problem-section',
  start: 'top top',
  end: 'bottom bottom',
  pin: '#problem-visual',
  scrub: 1,
  onUpdate: (self) => {
    // At progress 0: show nervous, scattered answer (red highlights)
    // At progress 0.5: show AI annotation appearing ("Missing key concept: Big O complexity")
    // At progress 1: answer replaced with structured, confident version (green highlights)
    transformTranscript(self.progress);
  }
});
```

**Stat counter:** "73% of qualified candidates fail interviews they should pass" — number counts up from 0 on scroll entry.

#### SECTION 3 — Live Demo Teaser (Pinned Horizontal Scroll)

```javascript
// 3 panels slide horizontally while user scrolls vertically
gsap.to(".demo-panels", {
  xPercent: -66.666,
  ease: "none",
  scrollTrigger: {
    trigger: ".demo-wrapper",
    pin: true,
    scrub: 1,
    snap: { snapTo: 1/2, duration: 0.3, ease: "power1.inOut" },
    end: () => "+=" + document.querySelector(".demo-panels").offsetWidth
  }
});
```

- **Panel A:** Animated roadmap UI — module cards snapping into positions, calibration bar filling from 0 to 78%, "Gap Detected" labels appearing
- **Panel B:** Live interview UI — AI waveform animating as question is asked; transcript appearing word-by-word; proctoring badge showing "Verified"
- **Panel C:** Post-interview report — radar chart drawing arcs one by one; waveform with colored annotation markers appearing; score counter incrementing to 84/100

#### SECTION 4 — Feature Deep Dives (6 Alternating Blocks)

Each block: 100vh, alternating image-left/text-right and text-left/image-right layout. On scroll, visual slides in from edge (GSAP `xPercent: ±30 → 0`) while text children stagger up.

```javascript
gsap.utils.toArray(".feature-block").forEach((block, i) => {
  const visual = block.querySelector(".feature-visual");
  const textItems = block.querySelectorAll(".feature-text > *");
  const fromLeft = i % 2 === 0;

  const tl = gsap.timeline({
    scrollTrigger: { trigger: block, start: "top 70%", toggleActions: "play none none reverse" }
  });

  tl.from(visual, { xPercent: fromLeft ? -25 : 25, opacity: 0, duration: 1, ease: "power3.out" })
    .from(textItems, { y: 30, opacity: 0, stagger: 0.12, duration: 0.7 }, "-=0.6");
});
```

Features: Adaptive Roadmap · Gemini Live Interview · Timestamped Audio Reports · Mock Company Rounds · Smart Hire (B2B) · Edu Bundle

#### SECTION 5 — Competitor Comparison Table (Interactive)

- Toggle buttons: [Final Round AI] [Pramp] [HireVue] [Big Interview]
- On toggle, table rows animate: checkmarks tick in (spring), X marks slide in
- Our column: highlighted with mint `box-shadow: 0 0 0 2px #4DFFA0`
- Row animation: `gsap.from(rows, { y: 20, opacity: 0, stagger: 0.05 })`

#### SECTION 6 — Social Proof / Testimonials

- Auto-scrolling card carousel (Framer Motion `animate={{ x }}`)
- Each card: avatar, quote, company logo they landed at, score improvement
- Grain texture background (`background-image: url("data:image/svg+xml,...")`)

#### SECTION 7 — Pricing

```
Free:           3 sessions/mo, 1 roadmap
Pro:            $19/mo — unlimited sessions, all modules, audio reports
Elite:          $49/mo — everything + peer matching + resume builder + priority AI
Company:        From $299/mo — Smart Hire pipeline (50 candidates)
Education:      Custom — contact sales

Annual toggle: prices animate down with strikethrough + new value (Framer Motion layout animation)
```

#### SECTION 8 — Footer

Mega footer: product sitemap, trust badges (coming: SOC2), status page, social links, newsletter signup.

---

## 10. MODULE 1 — PERSONALIZED ROADMAP ENGINE

### Entry Points
- **Predefined Paths:** 15 roles — Frontend, Backend, Full Stack, DevOps/SRE, Data Scientist, ML Engineer, Android, iOS, Product Manager, Data Analyst, Cloud Architect, QA, Security, Blockchain, Embedded Systems
- **JD Upload/Paste:** Full JD text → Gemini Flash-Lite parsing (1,000 RPD free tier — ideal for this task)
- **Custom Role:** Free-form title + description

### JD Parsing via Gemini 2.5 Flash-Lite

```typescript
// Routes to flash-lite (cheapest model) — preserves flash quota for analysis
const parseJD = async (rawJD: string): Promise<ParsedJD> => {
  const response = await geminiFlashLite.generateContent({
    contents: [{ role: 'user', parts: [{ text: `Parse this job description:\n\n${rawJD}` }] }],
    tools: [{ functionDeclarations: [parseJDFunctionDeclaration] }],
    toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['parse_jd'] } }
  });
  return response.response.functionCalls()[0].args as ParsedJD;
};
```

### Roadmap Calibration Algorithm Post-Initial Assessment

```
Module calibration after initial assessment interview:

Score > 80%  → Status: COMPLETE ✅ — show, but route around in default path
Score 50-80% → Status: IN_PROGRESS 🔄 — depth reduced for known sub-topics
Score < 50%  → Status: TO_LEARN 📚 — full training mode; top priority in ordering

Module re-ordering formula:
  priority = (gap_score × 1.5) + (jd_relevance_weight × 2.0) + (prerequisite_unlocked ? 1 : 0)
  Sort modules by priority DESC
  Lock modules whose prerequisites aren't completed
```

### Module States

```typescript
enum ModuleStatus {
  LOCKED              = 'LOCKED',
  AVAILABLE           = 'AVAILABLE',
  ASSESSMENT_PENDING  = 'ASSESSMENT_PENDING',
  IN_PROGRESS         = 'IN_PROGRESS',
  REVISION            = 'REVISION',    // Completed but performance dropped
  COMPLETE            = 'COMPLETE',    // Score consistently > 80%
  MASTERED            = 'MASTERED'     // Score > 95% across 3+ sessions
}
```

### Continue Button Smart Logic

```typescript
async function determineContinueAction(userId: string, roadmapId: string): Promise<ContinueAction> {
  const activeSession = await redis.get(`t:${tenantId}:active_session:${userId}`);
  if (activeSession) return { action: 'resume_session', sessionId: activeSession };

  const progress = await getModuleProgress(userId, roadmapId);
  const assessmentDone = progress.some(m => m.status !== 'ASSESSMENT_PENDING');
  if (!assessmentDone) return { action: 'start_assessment' };

  const inProgress = progress.filter(m => m.status === 'IN_PROGRESS')
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt)[0];
  if (inProgress) return { action: 'continue_module', moduleId: inProgress.id };

  const nextAvailable = progress.find(m => m.status === 'AVAILABLE');
  if (nextAvailable) return { action: 'start_module', moduleId: nextAvailable.id };

  return { action: 'roadmap_complete' };
}
```

---

## 11. MODULE 2 — AI LIVE INTERVIEW ENGINE (GEMINI 2.5 FLASH LIVE API)

### Model: `gemini-live-2.5-flash-preview`

This is the cornerstone of the platform. Gemini 2.5 Flash Live API provides:
- **Native bidirectional audio** — no separate STT + TTS layers needed; eliminated entirely
- **Built-in Voice Activity Detection (VAD)** — detects when candidate stops speaking; no push-to-talk
- **Interruption handling** — candidate can naturally interrupt AI; conversation feels real
- **Sub-100ms latency** — comparable to a real human phone call
- **Function calling over audio** — AI calls `evaluate_answer()` after each complete answer without breaking conversational flow
- **Native transcript** — text transcript generated alongside audio in real-time

### Session Rate Limit Management

```typescript
// Before issuing an ephemeral token, check concurrent session count
// Free tier: ~3 concurrent Live API sessions per project (unofficial limit)
// Strategy: Queue if at capacity; show user estimated wait time

async function checkLiveAPICapacity(tenantId: string): Promise<{ canStart: boolean; estimatedWait?: number }> {
  const activeSessions = await supabase
    .from('interview_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .in('state', ['CONNECTED', 'LISTENING', 'QUESTION_ASKING'])
    .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Active in last 30 min

  const CONCURRENT_LIMIT = 3; // Conservative free tier limit
  if (activeSessions.count! >= CONCURRENT_LIMIT) {
    return { canStart: false, estimatedWait: 10 }; // Estimated minutes
  }
  return { canStart: true };
}
```

### Interview Types Supported

| Type | Description | Special UI |
|---|---|---|
| **Conceptual** | Knowledge check | Standard voice Q&A |
| **Behavioral (STAR)** | Situation/Task/Action/Result | STAR structure progress indicator |
| **Coding Walkthrough** | Explain approach verbally | Monaco editor shown; talk through it |
| **Live Coding** | Code while AI observes + probes | Monaco editor + real-time AI commentary via text |
| **System Design** | Design a distributed system | Excalidraw whiteboard + voice |
| **Debugging** | "What's wrong with this code?" | Code snippet displayed; verbal analysis |
| **SQL / Data** | Query and data reasoning | SQL editor + voice |

### Post-Interview Report — Full Specification

**Report Generation:** Gemini 2.5 Flash via Lambda (async, triggered by pg_cron 2min after session end)
**Storage:** JSON file in Supabase Storage (keeps Postgres DB lean)
**Delivery:** Push notification + email → user visits `/report/[sessionId]` (ISR Next.js page)

#### Report Sections

**1. Executive Summary**
- Overall Score (0–100) with letter grade
- AI-generated 3-sentence summary
- Hire Recommendation: `Strong Yes / Yes / Maybe / No` with reasoning
- Top 3 strengths (with audio timestamp links)
- Top 3 improvement areas (with audio timestamp links)

**2. Competency Radar Chart (D3.js)**
- 8 dimensions: Technical Depth · Communication Clarity · Problem Solving · Conciseness · Confidence · Structured Thinking · Domain Breadth · Culture Fit
- Current vs. previous session overlay
- Benchmarked vs. target role percentile (anonymized peer data)

**3. Topic Coverage Heatmap (D3.js)**
- Grid of all module topics — green/amber/red
- Click any cell → drawer opens with questions asked for that topic + scores

**4. Answer Timeline (Recharts)**
- Horizontal bar chart: each question = one bar; height = score
- Click bar → opens: question text + transcript excerpt + AI remarks

**5. Timestamped Audio Waveform (WaveSurfer.js)**
- Full session waveform
- Colored markers at question boundaries and key moments:
  - 🟢 Strong answer · 🟡 Partial answer · 🔴 Missed concept · 🔵 Proctoring flag · ⚪ Question boundary
- Click any marker → seek + show annotation tooltip

**6. Speaking Analytics (Recharts)**
- Words per minute per question (bar chart)
- Filler word frequency with timestamp heatmap
- Silence distribution (pre-answer pauses vs. mid-answer thinking pauses)
- Answer length distribution (too short / ideal / over-explained)

**7. Proctoring Summary**
- Per-question integrity score
- Flags with timestamp + severity
- Session badge: Verified / Caution / Flagged

**8. Improvement Recommendations (Gemini-generated)**
- 5 ranked action items with: specific audio evidence timestamp + next module link

---

## 12. MODULE 3 — GROUPS & COLLABORATIVE ROADMAPS

### Access Tiers

| Type | Max Members | Admin Features | Use Case |
|---|---|---|---|
| **Private** | 1 (creator) | N/A | Solo prep |
| **Public** | Unlimited | Read-only | Community roadmap |
| **Shared** | 50 | Invite, deadlines, reports | Study group, bootcamp |
| **Cohort** | 500 | Batch assignment, LMS sync | University class |
| **Company Track** | Unlimited | Pipeline integration | New hire onboarding |

### Key Features
- Role types: Owner, Admin, Member, Observer
- Invite methods: Email link (with expiry), shareable URL, bulk CSV
- Shared roadmap with individual progress tracking
- Optional leaderboard (admin-configurable; anonymous mode available)
- Realtime group feed via Supabase Realtime channels
- Module deadlines with automated reminder notifications (Resend email + FCM push)
- Admin analytics: member progress heatmap, at-risk member detection, completion funnel

---

## 13. MODULE 4 — MOCK COMPANY INTERVIEW

### Company Interview Database

- 50 companies seeded at launch (FAANG, MAANG, top unicorns + top consulting firms)
- Community-contributed rounds (upvoted, moderator-verified)
- Each company profile: rounds, competencies per round, difficulty rating, known patterns, community pass rate, interview culture description

### Two Modes

**Train Mode (Gemini 2.5 Flash Live — calibrated)**
- AI introduces itself as the company's interviewer with company context
- Hints available on request: user says "Give me a hint" → Gemini provides one
- Post-question explanations shown after each answer
- Progress saved to personal roadmap

**Practice Mode — Ruthless (Gemini 2.5 Flash Live — pressure)**
- Zero hints. Zero positive reinforcement. Neutral, firm interviewer.
- Strict time limits enforced: AI interrupts after timeout ("Let's move on.")
- Back-to-back rounds with 2-minute break between (mimics a real interview day)
- Full proctoring enabled
- Post-session: per-round scorecard + "Would Hire / Consider / Reject" verdict with written justification + "What the interviewer was thinking" section

### Additional Features
- **Company Research Brief:** Gemini-generated company context (products, culture, recent events) loaded before session
- **Schedule Interview Day:** User sets a calendar date; platform blocks time slots + sends countdown reminders
- **Community Q&A:** Verified company-specific questions, upvoted and tagged by round type

---

## 14. MODULE 5 — RESUME BUILDER

### Generation Pipeline (Lambda → Gemini 2.5 Flash)

```
1. Pull user data: profile form + interview performance (strong topics → highlight)
2. Parse target JD if provided → Gemini Flash-Lite for keyword extraction
3. Match user profile vs JD: identify top 5 matches + top 3 gaps
4. Generate resume via Gemini 2.5 Flash function calling:
   - Professional summary (tailored to company if specified)
   - Work bullets → [Action verb] + [What done] + [Measurable outcome]
   - Skills section reordered by JD relevance
   - Projects ranked by target role relevance
5. ATS Score: keyword density analysis vs JD (0-100)
6. PDF render: Next.js @react-pdf/renderer → store in Supabase Storage
```

### Resume Variants System
- One profile → N targeted resumes (per company/role)
- Each variant versioned in Supabase (`resumes` table, version INT)
- "Sync from latest interview" → updates skills section from most recent session scores
- Side-by-side variant diff viewer
- Cover letter generator (same pipeline, tone-adjustable)

### Export Options
- PDF (A4 + US Letter)
- DOCX (editable)
- ATS plain text
- JSON Resume (open standard)

---

## 15. MODULE 6 — SMART HIRE (B2B RECRUITER MODULE)

### Pipeline Builder

```typescript
interface HiringPipeline {
  id: string;
  tenantId: string;         // Company tenant
  roleName: string;
  rounds: HiringRound[];
  globalPassThreshold: number;
  deadline: Date;
  anonymizationEnabled: boolean;  // Hide name/photo during AI evaluation
  biasCheckEnabled: boolean;
  webhookUrl?: string;            // ATS integration endpoint
}

interface HiringRound {
  name: string;
  sequence: number;
  type: 'ai_interview' | 'assessment' | 'resume_screen';
  durationMinutes: number;
  competencies: Array<{ name: string; weight: number; criteria: string[] }>;
  passThreshold: number;
  isProctored: boolean;
  interviewType: InterviewType;
}
```

### AI Evaluation Scoring

```
CompositeScore = Σ(competency_score_i × weight_i) × integrityMultiplier

integrityMultiplier:
  proctoring_score ≥ 90 → 1.0 (no penalty)
  proctoring_score 70-89 → 0.95
  proctoring_score 50-69 → 0.85
  proctoring_score < 50 → 0.70 (flagged for human review)
```

### Recruiter Dashboard
- Kanban pipeline view: Invited → In Progress → Completed → Shortlisted → Offer → Rejected
- Batch actions: advance all above threshold, send templated emails, export CSV
- Individual deep-dive: full report, audio recordings, proctoring events, AI rationale
- Side-by-side comparison: top 3 candidates on radar chart overlay
- ATS webhooks: POST to Greenhouse/Lever on candidate status change
- Diversity analytics: anonymized score distributions for compliance reporting
- Decision audit log: all AI decisions stored with reasoning (GDPR compliance)

---

## 16. MODULE 7 — EDU BUNDLE (EDUCATION INSTITUTION MODULE)

### Institution Hierarchy

```
Institution (tenant_type = 'education')
  └── Departments
        └── Batches (semester cohorts)
              └── Students
                    └── Enrolled Courses → Module Assignments
```

### Faculty Dashboard
- Per-student progress: all sessions, scores, trend lines, weak topic drill-down
- Batch analytics: topic weakness heatmap across cohort, completion funnel
- At-risk alerts: students not started with deadline < 3 days
- Export reports: CSV/PDF for academic records

### Placement Cell Integration
- Filter: "Show students with Backend Readiness > 75 AND System Design > 70"
- Export anonymized batch readiness PDF for visiting companies
- Direct pipeline: invite a batch to a Smart Hire assessment in one click
- Year-over-year batch comparison

### LMS Integration
- LTI 1.3 standard for Moodle, Canvas, Blackboard grade sync
- Module completion scores appear as LMS gradebook entries automatically

---

## 17. MODULE 8 — PEER PRACTICE (P2P INTERVIEW NETWORK)

### Matching Algorithm

```typescript
const matchingCriteria = {
  roleTrack: { weight: 0.35, exactMatch: true },
  skillLevel: { weight: 0.25, allowedBandWidth: 1 }, // Within 1 level
  moduleFocus: { weight: 0.20 },
  availability: { weight: 0.15 },
  languagePreference: { weight: 0.05 }
};
```

### Session Features
- **Shared Code Editor:** Monaco + Y.js CRDT (real-time collaboration)
- **Shared Whiteboard:** Excalidraw (system design rounds)
- **Video + Audio:** WebRTC peer-to-peer (no server relay)
- **Role Swap Timer:** Platform manages interviewer/interviewee rotation midway
- **AI Question Cards:** Gemini-generated question for the "interviewer" role (optional)
- **Dual Scoring:** Both parties score each other; AI adds objective supplemental analysis
- **Optional Recording:** Both must consent; stored privately in Supabase Storage

### Reputation System
- Interviewer reputation score (feedback received while acting as interviewer)
- "Helpful Interviewer" badge for consistently quality feedback
- High-reputation users matched first (quality signal)
- Low-quality peers get fewer matches (self-regulating)

---

## 18. MODULE 9 — AI COPILOT & REAL-TIME COACHING

### Practice Copilot (Self-Practice Only — NOT Available in Proctored Sessions)

Real-time text whisper suggestions appear as a subtle sidebar during designated practice sessions:
- Does not write full answers — provides: structure reminders, missing concept flags
- Example: "💡 You haven't mentioned time complexity yet"
- Disappears after candidate starts speaking again
- Togglable — user can hide it with keyboard shortcut

### Post-Answer Coach (Training Mode)

After candidate finishes answering (training sessions only):
- AI analyzes answer → shows what was strong, what was missing, how to restructure
- Model answer available (collapsed by default; user chooses to reveal)
- **No model answer audio** — text only (Gemini Live not used here to conserve RPD budget)

### Interview Day Prep Mode

10-minute rapid warm-up morning-of:
- Light conceptual questions (easy, confidence-building)
- Breathing prompt + callback to user's own best past answers ("You scored 91 on closures last week — you've got this")
- Quick-access cheat sheet of user's personal best answers from session history

---

## 19. MODULE 10 — ANALYTICS & INTELLIGENCE DASHBOARD

### Candidate Dashboard
- Today's Focus card: next recommended action + time estimate
- Streak heatmap (GitHub-style contribution graph)
- Progress rings per roadmap module (SVG animated)
- 30/60/90-day score trend lines per topic (Recharts)
- Weekly hours invested bar chart
- Readiness Meter: 0–100% overall role readiness (from skill graph)

### Company Dashboard (Smart Hire)
- Pipeline funnel: candidates per stage
- Score histogram across all candidates
- Time-to-complete per round (identify bottleneck rounds)
- Drop-off analysis (where candidates abandon)

### Institution Dashboard (Edu Bundle)
- Batch health score: aggregate readiness per batch
- Topic weakness heatmap across cohort
- Engagement rate: % completing scheduled sessions
- Year-over-year batch comparison (placement readiness trend)

### Platform Admin (Internal)
- DAU/MAU, session counts, AI cost per session
- Gemini quota consumption per project (alert at 80% daily usage)
- Tenant health scores, error rates, Lambda latency p50/p95/p99

---

## 20. PROCTORING & INTEGRITY ENGINE

### Detection Signals

| Signal | Detection Method | Severity | Score Impact |
|---|---|---|---|
| Tab Switch / Window Blur | `visibilitychange` + `blur` events | Warning | −20 pts |
| Slow Answer Start (>12s simple Q) | Timer from question end to first audio VAD | Info | −10 pts |
| Copy-Paste (text mode) | `paste` event + clipboard API | Warning | −30 pts |
| AI-Generated Answer | Perplexity scoring + burstiness analysis on transcript | Warning | −40 pts |
| Eye Gaze Off-Screen (3+ times) | MediaPipe Face Mesh (client-side only) | Warning | −15 pts |
| Multiple Faces Detected | MediaPipe (client-side only) | Violation | −50 pts |
| Mid-Answer Long Silence + Burst | Audio VAD: >8s silence then sudden fluency | Warning | −15 pts |
| Keyboard Activity During Voice | `keydown` listener during listening phase | Info | −10 pts |

### Privacy Architecture
- All face detection runs **client-side only** (TensorFlow.js/MediaPipe) — raw video never leaves device
- Events stored as structured logs (type, timestamp, severity) — never video
- User sees what's being monitored before every session (consent screen)
- Right to delete proctoring data: cascading delete from account settings

### Integrity Scoring Formula

```
Per-Question Integrity = max(0, 100 − Σ(signal_penalties))

Session Integrity = average(per_question_integrity_scores)

Badges:
  90–100 → 🛡️ "Verified"   (green shield)
  70–89  → ⚠️ "Caution"    (amber shield)
  < 70   → 🚨 "Flagged"    (red shield — recruiter notified in Smart Hire mode)
```

---

## 21. GAMIFICATION & ENGAGEMENT LAYER

### XP System

| Action | XP Earned |
|---|---|
| First session ever | +100 XP (bonus) |
| Complete any session | +50 XP |
| Module completed | +200 XP |
| Daily streak day | +25 XP/day (doubles at 7 days, triples at 30 days) |
| Score improvement vs. last session | +10 XP per point gained |
| Peer session completed | +75 XP |
| Resume generated | +100 XP |
| Proctoring score ≥ 90 | +25 XP ("Integrity Bonus") |

**Level Titles:** Novice → Trainee → Candidate → Contender → Proficient → Expert → Elite → Interview Legend

### Achievement Badges (25 total)
A selection: "First Session" · "Streak Warrior (7 days)" · "Streak Legend (30 days)" · "Deep Diver (90+ on module)" · "System Architect (85+ System Design)" · "Behavioral Master (5 behavioral sessions, avg 80+)" · "Company Conqueror (all rounds of Mock Company)" · "Speed Demon (under 80% time limit, score 80+)" · "Integrity Champion (10 Verified sessions)" · "The Comeback (score improved 30+ pts between sessions)"

### Leaderboards (Supabase query, refreshed every 15 minutes)
- Global (same role track)
- Friends (mutual connections)
- Group (within a shared group)
- Weekly reset + all-time

---

## 22. NOTIFICATION & COMMUNICATION SYSTEM

### Notification Architecture

```
Event (Lambda / Supabase trigger)
  → Supabase notifications table insert
  → pg_notify('notifications', payload)
  → Supabase Realtime → browser (in-app bell icon update)
  → Async Lambda worker:
      ├── Email → Resend (3K free/month)
      └── Push → FCM (free, unlimited)
```

### Event → Channel Matrix

| Event | In-App | Email | Push |
|---|---|---|---|
| Report ready | ✅ | ✅ | ✅ |
| Daily streak reminder (user's preferred time) | ✅ | — | ✅ |
| Group deadline approaching (24h) | ✅ | ✅ | ✅ |
| Module AI recommendation | ✅ | — | — |
| Group invite received | ✅ | ✅ | — |
| Achievement unlocked | ✅ | — | ✅ |
| Peer session matched | ✅ | ✅ | ✅ |
| Smart Hire: candidate completed all rounds | ✅ | ✅ | — |
| Gemini quota at 80% daily | ✅ (admin only) | ✅ | — |

---

## 23. SCALABILITY & INFRASTRUCTURE

### Horizontal Scaling by Layer

**Frontend (Vercel):** Automatic global CDN — no config needed. ISR for report pages means zero Lambda invocations for repeat viewers.

**API (Lambda):** Stateless functions auto-scale from 0 to 1,000 concurrent by default. Cold starts minimized by: small bundle (esbuild), 128MB memory, keep-warm EventBridge pings on critical functions.

**Database (Supabase):** Scale path:
```
Free (500MB) → Pro $25/mo (8GB) → Large compute add-on $110/mo → Team $599/mo
Migrate off Supabase at 10M+ MAU → AWS RDS + self-managed Postgres for cost control
```

**Storage:** Supabase Storage 1GB free → upgrade to $0.021/GB on Pro. At scale, migrate audio to AWS S3 ($0.023/GB/month, 5GB free for 12 months).

### Caching Strategy

```
L1 (Lambda process memory):
  - Tenant configs: Map<tenantId, config>, 5-minute TTL, refreshed on next request
  - Gemini daily quota counters: atomic increment in Lambda memory (approximate; Upstash for precision)

L2 (Upstash Redis, 10K commands/day free):
  - Per-user rate limits: sliding window (2 commands per API request)
  - Active session IDs: SET user:{id}:active_session {sessionId} EX 1800
  - ONLY use for: rate limiting + active session tracking (conserve 10K daily budget)

L3 (Supabase + CDN):
  - Module definitions: cached in browser localStorage (1h TTL)
  - Report pages: Next.js ISR with 60-second revalidation
  - Static assets: Vercel CDN (global edge, 100GB/month free)
```

### Gemini Quota Protection System

```typescript
// Tracks daily Gemini usage per model in Supabase (updated after each call)
// pg_cron resets counters at midnight Pacific time (matching Gemini's reset)
async function checkGeminiQuota(model: GeminiModel): Promise<boolean> {
  const { data } = await supabase
    .from('gemini_quota_tracker')
    .select('requests_today, daily_limit')
    .eq('model', model)
    .single();

  if (data.requests_today >= data.daily_limit * 0.9) {
    // Alert admin at 90% of limit
    await alertAdmin(`Gemini ${model} at ${Math.round(data.requests_today / data.daily_limit * 100)}% daily quota`);
  }

  return data.requests_today < data.daily_limit;
}

// Model routing by task to maximize free tier efficiency
const MODEL_ROUTING = {
  'live_interview':  'gemini-live-2.5-flash-preview',    // No RPM limit tracked traditionally
  'deep_analysis':   'gemini-3.1-flash-lite-preview',                 // 250 RPD — protected pool
  'jd_parsing':      'gemini-3.1-flash-lite-preview',            // 1000 RPD — use liberally
  'classification':  'gemini-3.1-flash-lite-preview',            // 1000 RPD
  'resume_gen':      'gemini-3.1-flash-lite-preview',                 // 250 RPD
  'embeddings':      'gemini-embedding-2-preview',       // ~unlimited (10M TPM)
};
```

---

## 24. SECURITY, COMPLIANCE & RBAC

### RBAC Roles

```
Platform Admin
  └── Tenant Owner
        ├── Tenant Admin
        │     ├── Recruiter (Smart Hire)
        │     ├── Educator (Edu Bundle)
        │     └── Group Admin → Group Member
        └── Candidate → (Free | Pro | Elite)
```

### Supabase RLS Permission Matrix

```sql
-- Candidates can only see their own data
CREATE POLICY "users_own_data" ON interview_sessions
  FOR ALL USING (
    user_id = auth.uid() AND tenant_id = (current_setting('app.tenant_id'))::UUID
  );

-- Recruiters can see all sessions in their hiring pipelines
CREATE POLICY "recruiter_pipeline_access" ON interview_sessions
  FOR SELECT USING (
    pipeline_id IN (
      SELECT id FROM hiring_pipelines WHERE tenant_id = (current_setting('app.tenant_id'))::UUID
    ) AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('recruiter', 'tenant_admin')
    )
  );

-- Educators can see all sessions in their batches
CREATE POLICY "educator_batch_access" ON interview_sessions
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM batch_enrollments
      WHERE batch_id IN (SELECT id FROM batches WHERE educator_id = auth.uid())
    )
  );
```

### Security Measures
- **JWT verification:** Every Lambda handler verifies Supabase JWT via JWKS endpoint (cached 1h)
- **Rate limiting:** Upstash Redis sliding window — 60 req/min per user, 5K req/min per tenant
- **Input validation:** Zod schemas on all Lambda inputs; sanitize before injecting into AI prompts
- **PII in prompts:** User identifiers anonymized before inclusion in Gemini API calls (substitute UUID hashes)
- **Signed URLs:** All Supabase Storage objects accessed via signed URLs (15-minute expiry for recordings)
- **CORS:** Strict allowlist — only platform domain and tenant subdomains
- **Secrets:** AWS Parameter Store (free tier) for Lambda secrets; Supabase Vault for DB-level secrets
- **GDPR:** Right to deletion (Supabase cascade delete); data export endpoint; recordings deleted on user request
- **Audit log:** `audit_logs` Supabase table with INSERT-only RLS (no one can delete audit records)

---

## 25. API DESIGN & INTEGRATION LAYER

### REST API Conventions

```
Base URL: https://api.yourplatform.com/v1
Auth: Authorization: Bearer {supabase-jwt}
Tenant: Extracted from JWT app_metadata (no separate header needed)

Versioning: /v1 URL prefix — old versions deprecated with 6-month sunset notice
Pagination: Cursor-based (no offset) — stable performance at scale
Errors: { code: string, message: string, details?: object, requestId: string }
```

### Key Endpoints

```
# Roadmaps
POST   /v1/roadmaps                      # Create (JD or predefined)
GET    /v1/roadmaps/:id/modules          # List modules with progress
POST   /v1/roadmaps/:id/continue         # Smart continue (returns action + params)

# Sessions
POST   /v1/sessions                      # Create session
POST   /v1/sessions/:id/token            # Issue ephemeral Gemini Live token
POST   /v1/sessions/:id/complete         # Mark complete, trigger report generation
POST   /v1/sessions/:id/question-log     # Append question evaluation
POST   /v1/sessions/:id/proctor          # Log proctoring event (also via Edge Function)

# Reports
GET    /v1/reports/:sessionId            # Get report metadata + signed storage URL

# Smart Hire
POST   /v1/hiring/pipelines              # Create pipeline
POST   /v1/hiring/pipelines/:id/invite   # Generate invite link / email candidates
GET    /v1/hiring/pipelines/:id/candidates  # List candidates with scores

# Internal (not externally exposed, Lambda-to-Lambda)
POST   /internal/generate-report        # Triggered by pg_cron → Edge Function
POST   /internal/update-skill-graph     # Triggered after report generation
```

### Webhook System

```typescript
// Smart Hire events emitted to configured ATS endpoint
interface WebhookPayload {
  event: 'candidate.completed' | 'candidate.shortlisted' | 'candidate.rejected';
  pipelineId: string;
  candidateId: string;  // Anonymized if anonymization is enabled
  score?: number;
  timestamp: string;
  signature: string;    // HMAC-SHA256 of payload with tenant webhook secret
}
```

---

## 26. DATABASE SCHEMA — FULL REFERENCE

```sql
-- ============================================================
-- TENANCY
-- ============================================================
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('individual','group','company','education','platform')),
  plan        VARCHAR(20) NOT NULL DEFAULT 'free',
  branding    JSONB NOT NULL DEFAULT '{}',   -- logo, colors, interviewer name, tone
  features    JSONB NOT NULL DEFAULT '{}',   -- feature flag overrides per tenant
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_uid    UUID UNIQUE NOT NULL,      -- matches auth.uid()
  email           VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255),
  role            VARCHAR(30) NOT NULL DEFAULT 'candidate',
  xp              INT DEFAULT 0,
  streak_days     INT DEFAULT 0,
  streak_last_at  DATE,
  fcm_token       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_read" ON users FOR SELECT USING (supabase_uid = auth.uid());
CREATE POLICY "tenant_isolation" ON users FOR ALL
  USING (tenant_id = (current_setting('app.tenant_id', true))::UUID);

-- ============================================================
-- ROADMAPS
-- ============================================================
CREATE TABLE roadmaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  title           VARCHAR(255) NOT NULL,
  source_type     VARCHAR(20) CHECK (source_type IN ('predefined','jd','custom')),
  raw_jd          TEXT,
  parsed_skills   JSONB,
  target_role     VARCHAR(255),
  target_company  VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roadmap_owner" ON roadmaps FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
);

-- ============================================================
-- MODULES
-- ============================================================
CREATE TABLE modules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  roadmap_id          UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  topics              JSONB NOT NULL,           -- [{name, weight, requiredCoverage}]
  prerequisites       UUID[],
  sequence_order      INT NOT NULL,
  difficulty          VARCHAR(20) DEFAULT 'intermediate',
  estimated_minutes   INT,
  status              VARCHAR(30) DEFAULT 'available',
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INTERVIEW SESSIONS (partitioned by month for scale)
-- ============================================================
CREATE TABLE interview_sessions (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  module_id       UUID REFERENCES modules(id),
  pipeline_id     UUID,                           -- NULL for individual sessions
  session_type    VARCHAR(30) NOT NULL,           -- assessment|training|practice|mock_company
  state           VARCHAR(30) NOT NULL DEFAULT 'INITIALIZING',
  plan            JSONB NOT NULL,                 -- Full session plan (system prompt params)
  question_log    JSONB DEFAULT '[]',             -- Per-question evaluations from Gemini
  proctor_events  JSONB DEFAULT '[]',             -- Proctoring signal log
  audio_key       VARCHAR(500),                   -- Supabase Storage key for assembled audio
  transcript_key  VARCHAR(500),                   -- Supabase Storage key for full transcript JSON
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  duration_seconds INT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE interview_sessions_2026_03 PARTITION OF interview_sessions
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- (create new partition each month via pg_cron)

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INTERVIEW REPORTS (lightweight metadata — full data in Storage)
-- ============================================================
CREATE TABLE interview_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID UNIQUE,
  user_id             UUID REFERENCES users(id),
  tenant_id           UUID REFERENCES tenants(id),
  overall_score       FLOAT,
  hire_recommendation VARCHAR(20),                -- strong_yes|yes|maybe|no
  report_storage_key  VARCHAR(500),               -- Supabase Storage path to full JSON
  generated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER SKILL GRAPHS (pgvector for embeddings)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE user_skill_graphs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id) UNIQUE,
  topic_scores    JSONB NOT NULL DEFAULT '{}',    -- Record<topic, TopicScore>
  skill_embedding VECTOR(768),                    -- Gemini Embedding 2 (768-dim reduced)
  overall_level   VARCHAR(20) DEFAULT 'novice',
  readiness_score FLOAT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
-- ivfflat index for fast ANN queries (find similar skill profiles)
CREATE INDEX ON user_skill_graphs USING ivfflat (skill_embedding vector_cosine_ops)
  WITH (lists = 50);  -- 50 lists for ~5K user scale; increase to 200 at 50K users

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id),
  name          VARCHAR(255) NOT NULL,
  access_type   VARCHAR(20) CHECK (access_type IN ('private','public','shared','cohort','company_track')),
  roadmap_id    UUID REFERENCES roadmaps(id),
  settings      JSONB DEFAULT '{}',
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  group_id  UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id),
  role      VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- HIRING PIPELINES
-- ============================================================
CREATE TABLE hiring_pipelines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id),
  role_name               VARCHAR(255) NOT NULL,
  rounds                  JSONB NOT NULL,
  pass_threshold          FLOAT DEFAULT 70,
  deadline                TIMESTAMPTZ,
  anonymization_enabled   BOOLEAN DEFAULT FALSE,
  webhook_url             TEXT,
  status                  VARCHAR(20) DEFAULT 'active',
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RESUMES
-- ============================================================
CREATE TABLE resumes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  version         INT NOT NULL DEFAULT 1,
  target_role     VARCHAR(255),
  target_company  VARCHAR(255),
  raw_profile     JSONB NOT NULL,
  ats_score       FLOAT,
  pdf_storage_key VARCHAR(500),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PROMPT TEMPLATES (versioned, per-tenant overridable)
-- ============================================================
CREATE TABLE prompt_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),   -- NULL = platform default
  name        VARCHAR(100) NOT NULL,
  version     INT NOT NULL DEFAULT 1,
  content     TEXT NOT NULL,
  variables   JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name, version)
);

-- ============================================================
-- GEMINI QUOTA TRACKER (free tier protection)
-- ============================================================
CREATE TABLE gemini_quota_tracker (
  model               VARCHAR(100) PRIMARY KEY,
  requests_today      INT DEFAULT 0,
  daily_limit         INT NOT NULL,
  last_reset_at       TIMESTAMPTZ DEFAULT now()
);
INSERT INTO gemini_quota_tracker VALUES
  ('gemini-3.1-flash-lite-preview',       0, 250,  now());
-- Reset via pg_cron: '0 8 * * * UPDATE gemini_quota_tracker SET requests_today = 0, last_reset_at = now()'
-- (8:00 UTC = midnight Pacific Time)

-- ============================================================
-- AUDIT LOGS (INSERT-ONLY — no DELETE allowed by RLS)
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID,
  user_id     UUID,
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(100),
  resource_id UUID,
  metadata    JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_only" ON audit_logs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "tenant_read" ON audit_logs FOR SELECT
  USING (tenant_id = (current_setting('app.tenant_id', true))::UUID);
```

---

## 27. DEVELOPMENT PHASES & MILESTONES

### Phase 0 — Foundation (Weeks 1–3) — $0
- [ ] Supabase project setup (DB schema, RLS policies, Auth config, Storage buckets)
- [ ] AWS Lambda scaffold (Serverless Framework v4, Node.js 20, esbuild, TypeScript)
- [ ] API Gateway HTTP API (cheapest option) + Lambda integration
- [ ] Next.js 14 monorepo (apps/web, packages/shared-types, packages/db-client)
- [ ] Supabase Auth integrated with Lambda JWT middleware
- [ ] Multitenant RLS + JWT app_metadata role injection
- [ ] GitHub Actions CI/CD (push to main → Vercel + Serverless deploy simultaneously)
- [ ] Upstash Redis connected for rate limiting

### Phase 1 — Core MVP (Weeks 4–8) — $0
- [ ] Landing page (Next.js + GSAP + Three.js — all sections built)
- [ ] Onboarding flow (role selection, JD upload, roadmap generation via Gemini Flash-Lite)
- [ ] Roadmap Engine (module generation, calibration algorithm, status state machine)
- [ ] Text-mode interview (Gemini 2.5 Flash, function calling for structured evaluation)
- [ ] Basic post-interview report (scores, topic heatmap, recommendations)
- [ ] User dashboard (roadmap progress, session history, streak tracker)
- [ ] Continue button smart logic

### Phase 2 — Gemini Live API (Weeks 9–13) — $0
- [ ] Session Token Lambda (ephemeral Gemini token issuance)
- [ ] Browser-side Gemini 2.5 Flash Live API integration (direct WebSocket)
- [ ] WebRTC audio capture → PCM streaming to Gemini
- [ ] Gemini audio output playback (native — no TTS)
- [ ] Real-time transcript streaming via Supabase Realtime
- [ ] Adaptive question engine (difficulty adjustment injected into session plan)
- [ ] Continue session logic (Redis session persistence)
- [ ] Gemini Embedding 2 skill graph update pipeline

### Phase 3 — Audio Reports + Proctoring (Weeks 14–16) — $0
- [ ] Audio assembly from Supabase Realtime buffer
- [ ] WaveSurfer.js timestamped audio player
- [ ] Audio annotation system (markers on waveform)
- [ ] Gemini 2.5 Flash deep analysis (post-session, async via pg_cron)
- [ ] Report JSON → Supabase Storage → ISR Next.js report page
- [ ] MediaPipe face mesh (client-side proctoring)
- [ ] Proctoring signal pipeline (Edge Function → Supabase)
- [ ] Integrity scoring + session badges
- [ ] D3.js radar chart + heatmap visualizations

### Phase 4 — Groups + Mock Company (Weeks 17–20) — $0
- [ ] Group creation, invitation, access management (RBAC)
- [ ] Shared roadmap + deadline system
- [ ] Leaderboard (Supabase query, 15min cache)
- [ ] Supabase Realtime group feed
- [ ] Company interview profile database (50 companies seeded)
- [ ] Train mode + Ruthless Practice mode (different system prompts)
- [ ] Gemini-generated company research brief

### Phase 5 — Resume Builder + Peer Practice (Weeks 21–24) — $0
- [ ] Profile builder UI (all data collection screens)
- [ ] Resume generation pipeline (Gemini 2.5 Flash + function calling)
- [ ] ATS score + keyword gap analysis
- [ ] PDF export (@react-pdf/renderer → Supabase Storage)
- [ ] Peer matching algorithm + calendar-based scheduling
- [ ] P2P session (WebRTC + Y.js Monaco + Excalidraw)
- [ ] Dual scoring + AI supplemental analysis for peer sessions

### Phase 6 — Smart Hire + Edu Bundle (Weeks 25–30) — Likely $25–50/mo (Supabase Pro)
- [ ] Company tenant provisioning flow
- [ ] Hiring pipeline builder UI
- [ ] Candidate invitation + scoped access
- [ ] Recruiter Kanban dashboard
- [ ] Bias mitigation (anonymization toggle, fairness analytics)
- [ ] ATS webhook system (Greenhouse, Lever)
- [ ] Institution onboarding + batch management
- [ ] Faculty analytics dashboard
- [ ] LTI 1.3 grade sync (Moodle, Canvas)
- [ ] Placement cell integration

### Phase 7 — Gamification, Scale & Revenue (Weeks 31–36)
- [ ] Full gamification layer (XP, levels, 25 achievements, leaderboards, challenges)
- [ ] Stripe subscription billing (Free / Pro / Elite + per-seat B2B)
- [ ] PostHog analytics events (funnel tracking, feature adoption)
- [ ] Sentry error tracking
- [ ] i18n (EN/ES/HI/ZH/AR)
- [ ] PWA setup (next-pwa, FCM push, offline shell)
- [ ] Mobile-responsive audit (all critical flows)
- [ ] Core Web Vitals audit (LCP < 2.5s, INP < 200ms)
- [ ] Gemini Tier 1 activation (enable billing → 150–300 RPM; cost: pay-per-token only)

---

## APPENDIX A — GEMINI LIVE SYSTEM PROMPT TEMPLATE

```
You are {{interviewerName}}, a {{seniority}} technical interviewer{{companyContext}}.
You are conducting a {{sessionType}} interview for the role of {{targetRole}}.

---CANDIDATE PROFILE---
Overall Level: {{overallLevel}}
Strong Topics (ask at most 1 stretch question each): {{strongTopics}}
Developing Topics (probe with follow-up if answered partially): {{developingTopics}}
Gap Topics (ask full-depth questions here): {{gapTopics}}
Speaking patterns to watch for: {{speakingPatterns}}
Session #{{sessionNumber}} on this module.

---SESSION PLAN---
Module: {{moduleName}}
Total questions this session: {{totalQuestions}}
Required topics to cover before ending: {{requiredTopics}}
Current difficulty level: {{difficultyLevel}}/10

{{adaptiveEngineInstructions}}

---BEHAVIORAL RULES---
1. Do NOT confirm whether answers are correct during the session — probe instead
2. After a weak answer (score ≤5), ask one follow-up probe before moving on
3. If the candidate over-explains, redirect: "That's good context — can you summarize the core point?"
4. If they use a filler phrase (um/like) more than 3x in an answer, note it internally but don't comment
5. Ensure ALL required topics are asked before ending — track this yourself
6. Natural conversational tone — you are a human interviewer, not a quiz machine
7. After 8–10 questions total OR if session has run 25+ minutes, begin wrapping up

---EVALUATION (call evaluate_answer after EVERY complete response)---
{
  "questionText": string,
  "topic": string,
  "score": number (0–10),
  "keyConceptsMissed": string[],
  "strengths": string[],
  "audioStartMs": number,
  "audioEndMs": number,
  "shouldProbe": boolean,
  "probeQuestion"?: string
}

---BEGIN---
Start with a warm professional introduction (2 sentences), state what you'll be covering today,
then ask your first question. Do not reveal the session plan or evaluation criteria.
```

---

## APPENDIX B — ENVIRONMENT VARIABLES REFERENCE

```bash
# ── SUPABASE ──────────────────────────────────────────────
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiJ9...       # Public — safe for browser
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiJ9...    # Private — Lambda only, never browser

# ── GOOGLE GEMINI ─────────────────────────────────────────
GEMINI_API_KEY=AIzaSy...                          # Lambda-side API calls
# Note: Browser-side uses ephemeral tokens (15-min TTL) issued by Session Token Lambda
# NEVER expose GEMINI_API_KEY to the browser

# ── AWS (auto-injected in Lambda execution environment) ───
AWS_REGION=us-east-1
# No manual AWS credentials needed in Lambda — uses execution role

# ── VERCEL (Next.js frontend) ─────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiJ9...
NEXT_PUBLIC_API_BASE_URL=https://api.yourplatform.com/v1
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# ── UPSTASH REDIS (rate limiting) ─────────────────────────
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# ── EMAIL & PUSH ──────────────────────────────────────────
RESEND_API_KEY=re_...
FIREBASE_SERVER_KEY=...                           # FCM push notifications

# ── PAYMENTS ─────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# ── MONITORING ────────────────────────────────────────────
SENTRY_DSN=https://...sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...sentry.io/...

# ── APP ───────────────────────────────────────────────────
APP_ENV=production
PLATFORM_DOMAIN=yourplatform.com
JWT_ISSUER=https://your-project-ref.supabase.co/auth/v1
```

---

*This document is the canonical specification v2.0. All features, data models, AI pipelines, rate limit budgets, and architectural decisions defined here take precedence. When building individual modules, cross-reference the HLD, LLD, Patterns, Multitenancy, Security, and Rate Limit Budget sections to ensure consistency.*

**Key Technical Decisions Summary:**
- Live interviews: `gemini-live-2.5-flash-preview` — direct browser WebSocket via ephemeral token
- Embeddings: `gemini-embedding-2-preview` — 768-dim stored in pgvector (Supabase)
- Analysis: `gemini-3.1-flash-lite-preview` — 250 RPD free; protected via quota tracker
- Parsing/routing: `gemini-3.1-flash-lite-preview` — 1,000 RPD free; use liberally
- No TTS, no fallback voice — Live API handles audio natively end-to-end
- Auth: Supabase Auth (50K MAU free); Clerk upgrade path documented
- Database: Supabase PostgreSQL with RLS (tenant isolation at DB level)
- Compute: AWS Lambda (1M req/month free forever)
- Frontend: Vercel Hobby (unlimited bandwidth, global CDN, free)

**Version:** 2.0.0 | **Updated:** March 2026 | **Status:** Ready for Implementation

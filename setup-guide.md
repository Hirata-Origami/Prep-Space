# PrepSpace — Step-by-Step External Services Setup Guide

This guide walks you through setting up every external service the platform needs, in the exact order you should do them.

---

## 1. Supabase (Database + Auth + Storage)

**Website:** https://supabase.com → Sign In → New Project

### Step 1.1 — Create a Project
1. Click **New Project** in your Supabase dashboard
2. Name it: `prepspace-prod`
3. Set a strong database password (save this!)
4. Choose region: `us-east-1` (or closest to your users)
5. Wait ~2 minutes for provisioning

### Step 1.2 — Apply the Schema
1. In the left sidebar go to: **SQL Editor**
2. Click **New Query**
3. Paste the full contents of `supabase/migrations/schema.sql`
4. Click **Run** (green button)
5. Verify: Go to **Table Editor** — you should see 15 tables

### Step 1.3 — Configure Auth
1. Go to **Authentication → Providers**
2. Under **Email** → Enable "Confirm email" (optional for dev, required for prod)
3. Under **Google**:
   - Toggle **ON**
   - Go to [Google Cloud Console](https://console.cloud.google.com) → APIs → OAuth 2.0 Credentials
   - Create new OAuth client → Web → Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Secret** → paste into Supabase Google provider

### Step 1.4 — Get Your API Keys
1. Go to **Settings → API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Step 1.5 — Enable Storage Buckets
1. Go to **Storage** → **New Bucket**
2. Create: `session-audio` (private)
3. Create: `session-transcripts` (private)
4. Create: `resume-pdfs` (private)
5. Create: `avatars` (public)

### Step 1.6 — Enable Extensions
1. Go to **Database → Extensions**
2. Search and enable:
   - `uuid-ossp` ← usually pre-enabled
   - `vector` ← for pgvector skill graphs
   - `pg_cron` ← for Gemini quota resets

---

## 3. AWS (S3 for audio/transcript storage)

**Website:** https://aws.amazon.com → Sign in to Console

### Step 3.1 — Create an IAM User
1. Go to **IAM → Users → Create User**
2. Name: `prepspace-app`
3. Select: **Attach policies directly**
4. Attach: `AmazonS3FullAccess` (or create a scoped custom policy)
5. Click **Create User** → then click the user
6. Go to **Security Credentials → Access Keys → Create access key**
7. Select: **Application running outside AWS**
8. Copy `Access key` → `AWS_ACCESS_KEY_ID`
9. Copy `Secret access key` → `AWS_SECRET_ACCESS_KEY`

### Step 3.2 — Create an S3 Bucket
1. Go to **S3 → Create Bucket**
2. Name: `prepspace-sessions` (must be globally unique — append `-yourname`)
3. Region: Same as your Lambda functions
4. **Block all public access**: ON
5. Enable **Server-side encryption**: SSE-S3
6. Click **Create**

### Step 3.3 — (Optional) CloudFront CDN for audio playback
1. Go to **CloudFront → Create Distribution**
2. Origin: Your S3 bucket
3. Enable **Origin Access Control (OAC)**
4. Copy the distribution URL → `AWS_CLOUDFRONT_URL`

---

## 4. Vercel (Frontend Deployment)

**Website:** https://vercel.com

### Step 4.1 — Deploy
1. Push your code to GitHub (if not already)
2. Go to vercel.com → **New Project**
3. Import your GitHub repo
4. Set **Root Directory**: `apps/web`
5. Framework: **Next.js** (auto-detected)

### Step 4.2 — Environment Variables
In Vercel Project Settings → **Environment Variables**, add all keys from `.env.example`:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Settings → API |
| `AWS_ACCESS_KEY_ID` | From AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | From AWS IAM |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_S3_BUCKET` | e.g. `prepspace-sessions-yourname` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |

### Step 4.3 — Add Auth Redirect URLs
1. Go to Supabase → **Authentication → URL Configuration**
2. Add: `https://your-vercel-url.vercel.app`
3. Add to redirect URLs: `https://your-vercel-url.vercel.app/auth/callback`

---

## 5. Local Development Setup

```bash
# 1. Clone the project
cd d:\Projects\Prep-Space

# 2. Copy environment variables
copy .env.example apps\web\.env.local
# Then edit .env.local and fill in your values

# 3. Install dependencies (if not done)
cd apps\web
npm install

# 4. Run the development server
npm run dev
```

The app will be available at: **http://localhost:3000**

---

## 6. Page-by-Page Feature Overview

| URL | What to do there |
|---|---|
| `/` | Landing page — check design, CTAs, scroll animations |
| `/auth/signup` | Create your first account |
| `/auth/login` | Sign in (or use Google OAuth) |
| `/dashboard` | Your home base — stats, streak, roadmaps |
| `/roadmap/new` | Create a roadmap (pick a role or paste JD) |
| `/interview/new` | Start an AI interview session |
| `/reports` | View past session reports |
| `/mock-company` | Choose a company, start targeted practice |
| `/groups` | Create or join study groups |
| `/peer-practice` | Find a practice partner |
| `/resume` | Build AI-powered resume |
| `/leaderboard` | See global rankings |
| `/settings` | Profile, notifications, appearance |

---

## 7. What's NOT Yet Wired (Requires Backend)

The following features have working **UI** but need a backend Lambda + Supabase integration to function fully:

- [ ] Roadmap creation via Gemini Flash-Lite (JD parsing)
- [ ] Gemini 2.5 Flash Live API (real-time voice interview)
- [ ] Post-session report generation
- [ ] Audio upload to S3
- [ ] Auth middleware (route protection)
- [ ] Smart Hire pipeline (recruiter features)

Backend Lambda scaffold is the next step. All endpoints are documented in `implementation_plan.md`.

---

## 8. Recommended Next Steps (In Order)

1. ✅ Set up Supabase and apply schema
2. ✅ Get your Gemini API key
3. ✅ Deploy frontend to Vercel
4. ⬜ Build the first Lambda: `POST /sessions/create`
5. ⬜ Integrate Gemini Live WebSocket into the interview page
6. ⬜ Build report generation Lambda
7. ⬜ Add auth middleware to protect `/dashboard/*` routes

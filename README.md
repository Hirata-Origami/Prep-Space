# Prep-Space

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Hirata-Origami/Prep-Space)

Prep-Space is an AI-powered interview preparation platform designed to help job seekers master their interview skills through simulation, personalized roadmaps, and data-driven feedback.

## Key Features

- **AI Interview Simulation**: Real-time voice interaction for mock interviews.
- **AI-Powered Roadmaps**: Automated JD parsing to generate study paths.
- **Resume Optimization**: Intelligent resume generation and critique.
- **Peer-Matching**: Community-based practice and study groups.
- **Progress Tracking**: Analytics on performance, streaks, and interview readiness.

## Tech Stack

Built with modern web technologies:

- **Framework**: Next.js 16 (App Router)
- **Database/Auth**: Supabase
- **AI/LLM**: Google Gemini API (Flash-Lite / Live)
- **Styling**: Tailwind CSS & Radix UI
- **State Management**: Zustand & React Query
- **Deployment**: Vercel

## Getting Started

1.  **Clone the repo**: `git clone https://github.com/Hirata-Origami/Prep-Space`
2.  **Setup Environment**: Copy `.env.example` to `apps/web/.env.local` and configure your API keys (Supabase, AWS, Gemini).
3.  **Install dependencies**: `npm install` inside `apps/web`.
4.  **Run Development**: `npm run dev` and access it at `http://localhost:3000`.

For detailed infrastructure setup, refer to [setup-guide.md](setup-guide.md).

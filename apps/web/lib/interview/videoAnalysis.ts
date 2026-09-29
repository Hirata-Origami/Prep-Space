import type { GenerativeModel } from '@google/generative-ai';
import { withRetry } from '@/lib/gemini';
import { parseJsonReply } from '@/lib/resume/merge';
import { MAX_FRAMES_SENT, mmss, type VideoAnalysis, type VideoFrame } from './video';

const clampScore = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const PROMPT = `You are an interview coach reviewing snapshots from a candidate's webcam during a video interview.
Judge only what is visible. Never guess about the candidate's identity, age, ethnicity, health, emotions you cannot see, or the content of their answers.
Focus on things they can change: where they look, posture, how engaged the face looks, framing, lighting, background and distractions.
Each frame is labelled with its time. Some frames carry measured signals (brightness, movement); use them as supporting evidence.

Return ONLY this JSON:
{
  "scores": { "eye_contact": 0-100, "posture": 0-100, "expression": 0-100, "framing_lighting": 0-100, "focus": 0-100 },
  "summary": "2-3 sentences on how they came across on camera",
  "observations": [ { "time": "mm:ss", "type": "good" | "improve", "note": "specific and visible" } ],
  "tips": ["3 short, concrete things to do differently next time"]
}
Use 4 to 8 observations, each tied to a frame time. "eye_contact" means looking toward the camera rather than away or down.`;

/** Scores on-camera presence from sampled frames. Returns null when there is nothing to analyse. */
export async function analyzeVideo(model: GenerativeModel, frames: VideoFrame[]): Promise<VideoAnalysis | null> {
  const usable = frames.filter(f => f.data && f.data.length > 500).slice(0, MAX_FRAMES_SENT);
  if (usable.length < 2) return null;

  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: PROMPT }];
  for (const f of usable) {
    const signals = [`brightness ${f.luma}/255`, `movement ${Math.round(f.motion * 100)}%`, f.face === undefined ? '' : f.face ? 'face detected' : 'no face detected']
      .filter(Boolean)
      .join(', ');
    parts.push({ text: `Frame at ${mmss(f.t)} (${signals})` }, { inlineData: { mimeType: 'image/jpeg', data: f.data } });
  }

  const result = await withRetry(() => model.generateContent(parts));
  const parsed = parseJsonReply<{
    scores?: Record<string, unknown>;
    summary?: string;
    observations?: { time?: string; type?: string; note?: string }[];
    tips?: string[];
  }>(result.response.text());

  const withFace = usable.filter(f => f.face !== undefined);
  return {
    available: true,
    scores: {
      eye_contact: clampScore(parsed.scores?.eye_contact),
      posture: clampScore(parsed.scores?.posture),
      expression: clampScore(parsed.scores?.expression),
      framing_lighting: clampScore(parsed.scores?.framing_lighting),
      focus: clampScore(parsed.scores?.focus),
    },
    summary: (parsed.summary ?? '').trim(),
    observations: (parsed.observations ?? [])
      .filter(o => o.note)
      .slice(0, 8)
      .map(o => ({ time: o.time ?? '', type: o.type === 'good' ? ('good' as const) : ('improve' as const), note: String(o.note).trim() })),
    tips: (parsed.tips ?? []).slice(0, 4).map(String),
    frames_analyzed: usable.length,
    face_visible_pct: withFace.length ? Math.round((withFace.filter(f => f.face).length / withFace.length) * 100) : undefined,
  };
}

/** Shared shapes and client-side sampling for on-camera analysis. Frames are small and never stored. */

export interface VideoFrame {
  /** Seconds since the interview began. */
  t: number;
  /** JPEG, base64 without the data-URL prefix. */
  data: string;
  /** Mean brightness 0-255, a cheap lighting signal. */
  luma: number;
  /** Change from the previous sample 0-1, a cheap movement signal. */
  motion: number;
  /** True/false when the browser's FaceDetector could tell, otherwise undefined. */
  face?: boolean;
}

export interface VideoObservation {
  time: string;
  type: 'good' | 'improve';
  note: string;
}

export interface VideoAnalysis {
  available: true;
  scores: {
    eye_contact: number;
    posture: number;
    expression: number;
    framing_lighting: number;
    focus: number;
  };
  summary: string;
  observations: VideoObservation[];
  tips: string[];
  frames_analyzed: number;
  face_visible_pct?: number;
}

export const MAX_FRAMES_SENT = 12;
const SAMPLE_W = 320;
const SAMPLE_H = 240;

interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<unknown[]>;
}

/** Takes a snapshot of the video element. Returns null when the frame is not usable. */
export class FrameSampler {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  private prev: Uint8ClampedArray | null = null;
  private detector: FaceDetectorLike | null = null;

  constructor() {
    this.canvas.width = SAMPLE_W;
    this.canvas.height = SAMPLE_H;
    const FD = (globalThis as unknown as { FaceDetector?: new (o?: object) => FaceDetectorLike }).FaceDetector;
    if (FD) {
      try {
        this.detector = new FD({ fastMode: true, maxDetectedFaces: 2 });
      } catch {
        this.detector = null;
      }
    }
  }

  async sample(video: HTMLVideoElement, seconds: number): Promise<VideoFrame | null> {
    const ctx = this.ctx;
    if (!ctx || video.readyState < 2 || !video.videoWidth) return null;
    ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const pixels = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;

    let sum = 0;
    let diff = 0;
    let n = 0;
    // every 16th pixel is plenty for brightness and motion
    for (let i = 0; i < pixels.length; i += 64) {
      const y = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      sum += y;
      if (this.prev) diff += Math.abs(y - (this.prev[i] * 0.299 + this.prev[i + 1] * 0.587 + this.prev[i + 2] * 0.114));
      n++;
    }
    const motion = this.prev ? Math.min(1, diff / n / 40) : 0;
    this.prev = new Uint8ClampedArray(pixels);

    let face: boolean | undefined;
    if (this.detector) {
      try {
        face = (await this.detector.detect(this.canvas)).length > 0;
      } catch {
        face = undefined;
      }
    }

    const url = this.canvas.toDataURL('image/jpeg', 0.6);
    return { t: Math.max(0, Math.round(seconds)), data: url.slice(url.indexOf(',') + 1), luma: Math.round(sum / n), motion: Math.round(motion * 100) / 100, face };
  }
}

/** Keeps at most `max` frames, spread evenly across the session. */
export function thinFrames(frames: VideoFrame[], max = MAX_FRAMES_SENT): VideoFrame[] {
  if (frames.length <= max) return frames;
  const out: VideoFrame[] = [];
  for (let i = 0; i < max; i++) out.push(frames[Math.round((i * (frames.length - 1)) / (max - 1))]);
  return out;
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

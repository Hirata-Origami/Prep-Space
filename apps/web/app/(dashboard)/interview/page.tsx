'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import useSWR from 'swr';
import { GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { AudioOrb } from '@/components/interview/AudioOrb';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  Sparkles,
  BookOpen,
  Play,
  RotateCcw,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Input, PageHeader, SectionHeader, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

type SessionState = 'hub' | 'connecting' | 'live' | 'complete';

interface TranscriptEntry {
  role: 'ai' | 'user';
  text: string;
  ts: number;
}

interface SessionItem {
  id: string;
  created_at: string;
  state: string;
  duration_seconds?: number;
  interview_type?: string;
  plan?: {
    role?: string;
    topic?: string;
    mode?: string;
    company?: string;
    round?: string;
    transcript?: TranscriptEntry[];
  };
  question_log?: TranscriptEntry[];
  interview_reports?: Array<{
    id: string;
    overall_score?: number;
    hire_recommendation?: string;
    generated_at?: string;
  }>;
}

const MODEL = 'models/gemini-3.8-live';
const SAMPLE_RATE = 16000;

// Audio-orb fast PCM encoder
function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createAudioBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return {
    data: encodeBytes(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm',
  };
}

const TEACH_TOPICS = [
  'Distributed Caching & Redis Patterns',
  'Event-Driven Architecture & Kafka',
  'PostgreSQL Query Optimization & Indexing',
  'React 19 Server Components & Fiber',
  'Raft Consensus & Distributed Systems',
  'OAuth 2.0 & JWT Security In-Depth',
];

function buildSystemInstruction(
  mode: 'interview' | 'teach',
  role: string,
  company?: string,
  round?: string,
  customTopic?: string,
  moduleTopics?: string[],
  pastConversationText?: string
): string {
  const commonRules = `
LANGUAGE & AUDIO RULES:
- The candidate communicates strictly in ENGLISH. You must only listen and respond in English.
- Strictly ignore ambient room noise, static, keyboard typing, breathing, mumbling, and non-English utterances. Only respond when the candidate clearly addresses you in English.
- Speak promptly, concisely, and naturally (1-3 sentences per turn). Maintain a lively, interactive conversation.
VISION & REAL-TIME VIDEO FEED:
- You receive real-time video frames (1 frame per second) from the candidate's camera.
- You can observe the candidate's visual presence, facial expressions, body language, gestures, or any notes and diagrams they display.
- Naturally incorporate visual cues when relevant while keeping the discussion focused on the role and topics.`;

  const resumptionSection = pastConversationText && pastConversationText.trim().length > 0 ? `
========================================
PREVIOUS CONVERSATION IN THIS SESSION:
The candidate is resuming a previous session. Here is what was already discussed:
${pastConversationText}

RESUMPTION INSTRUCTIONS:
- Warmly welcome the candidate back to continue the session in 1 brief sentence.
- Acknowledge what was being discussed, and smoothly continue by asking the next logical follow-up question or moving to the next concept.
- DO NOT repeat previous questions that have already been answered.
========================================` : '';

  if (mode === 'teach') {
    const topicText = customTopic || 'modern software system architecture';
    return `Your name is Alex. You are an expert senior engineering tutor and coach.
Your mission is to teach the candidate about: "${topicText}".

TEACHING APPROACH:
- Break down concepts into small, intuitive steps.
- Explain trade-offs, mental models, and real-world production examples.
- Keep spoken responses conversational and concise (1-3 sentences per turn).
- Ask interactive check-in questions to ensure the student understands before moving forward.
- Be encouraging, clear, and engaging.
${commonRules}
${resumptionSection}

START: Greet the student warmly, introduce the topic "${topicText}", and ask an opening question or share an intuitive analogy to kick off the lesson.`;
  }

  const companyContext = company
    ? `You are an elite interviewer at ${company}. This is the ${round || 'technical'} round.`
    : `You are Alex, an expert technical interviewer at a top tech company.`;
  const topicContext = customTopic ? `Focus area or topic: ${customTopic}.` : '';
  const moduleContext =
    moduleTopics && moduleTopics.length > 0
      ? `\nTOPICS TO COVER: ${moduleTopics.join(', ')}`
      : '';

  return `Your name is Alex. ${companyContext} You are interviewing for the role: ${role}.
${topicContext}${moduleContext}

BEHAVIOR:
- Be professional yet personable. Speak concisely — your spoken responses should be 1-3 sentences max.
- Ask deep, probing conceptual and practical questions.
- After the candidate answers, give a brief reaction, then ask a follow-up or next question.
- If the candidate is off-track, gently redirect.
- Keep track of the conversation flow and build on previous answers.
${commonRules}
${resumptionSection}

START: Greet the candidate warmly, mention the interview stage${company ? ` at ${company}` : ''}, and ask your first question immediately.`;
}

function InterviewStudioContent() {
  const { user, mutate: mutateUser } = useUser();
  const searchParams = useSearchParams();

  // Hub state
  const [activeMode, setActiveMode] = useState<'interview' | 'teach'>('interview');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');

  // Live session state
  const [sessionState, setSessionState] = useState<SessionState>('hub');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [alexStatus, setAlexStatus] = useState<'thinking' | 'speaking' | 'listening'>('listening');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [waveData, setWaveData] = useState<number[]>(Array(40).fill(4));
  const [userWaveData, setUserWaveData] = useState<number[]>(Array(40).fill(4));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioOutputRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const lastAudioTimeRef = useRef<number>(0);
  const directStartedRef = useRef(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const isMutedRef = useRef(false);
  const isCameraOffRef = useRef(false);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const pastTranscriptCountRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  // Keep transcriptRef & sessionIdRef in sync for callbacks
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isCameraOffRef.current = isCameraOff;
  }, [isCameraOff]);

  // SWR for past sessions
  const { data: sessionData, mutate: mutateSessions } = useSWR<{ sessions: SessionItem[] }>(
    '/api/sessions',
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const allSessions = sessionData?.sessions || [];

  // Strictly filter past sessions by active mode so they never mix
  const filteredSessions = allSessions.filter((s) => {
    const isTeachSession = s.interview_type === 'teach' || s.plan?.mode === 'teach';
    return activeMode === 'teach' ? isTeachSession : !isTeachSession;
  });

  // Sync role and query params
  useEffect(() => {
    if (user?.target_role && !searchParams.get('role')) {
      setTargetRole(user.target_role);
    }
    const modeParam = searchParams.get('mode');
    if (modeParam === 'teach' || modeParam === 'interview') {
      setActiveMode(modeParam);
    }
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      setCustomTopic(topicParam);
    }
    const resumeId = searchParams.get('resumeSessionId');
    if (resumeId) {
      setSessionId(resumeId);
    }
  }, [user, searchParams]);

  // Auto-scroll transcript
  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [transcript]);

  // Heartbeat to save transcript
  useEffect(() => {
    if (sessionState === 'live' && sessionId && transcript.length > 0) {
      const interval = setInterval(() => {
        fetch('/api/sessions/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            transcript_length: transcript.length,
            transcript: transcriptRef.current,
            duration_seconds: sessionTime,
          }),
          keepalive: true,
        }).catch(() => { });
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [sessionState, sessionId, transcript.length, sessionTime]);

  // Timer
  useEffect(() => {
    if (sessionState === 'live') {
      timerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionState]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Audio Playback (PCM 24kHz)
  const playPCMChunk = useCallback((base64Audio: string, onEnded?: () => void) => {
    try {
      if (!audioOutputRef.current || audioOutputRef.current.state === 'closed') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioOutputRef.current = new AC({ sampleRate: 24000 });
      }
      const ctx = audioOutputRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const sampleCount = Math.floor(len / 2);
      if (sampleCount === 0) return;

      const float32 = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        const b1 = binaryString.charCodeAt(i * 2);
        const b2 = binaryString.charCodeAt(i * 2 + 1);
        let val = b1 | (b2 << 8);
        if (val >= 32768) val -= 65536;
        float32[i] = val / 32768.0;
      }

      const buffer = ctx.createBuffer(1, sampleCount, 24000);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (onEnded) onEnded();
      };

      const now = ctx.currentTime;
      const startTime = Math.max(now + 0.02, lastAudioTimeRef.current);
      source.start(startTime);
      lastAudioTimeRef.current = startTime + buffer.duration;
    } catch (e) {
      console.error('Error in playPCMChunk:', e);
    }
  }, []);

  const stopAudioPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch { }
    });
    activeSourcesRef.current = [];
    if (audioOutputRef.current) {
      lastAudioTimeRef.current = audioOutputRef.current.currentTime;
    } else {
      lastAudioTimeRef.current = 0;
    }
    setAlexStatus('listening');
  }, []);

  // Wave animations
  const animateWave = useCallback((active: boolean) => {
    if (!active) {
      setWaveData(Array(40).fill(4));
      return;
    }
    const interval = setInterval(() => {
      if (alexStatus === 'speaking') {
        setWaveData((prev) =>
          prev.map((_, i) => Math.max(4, 15 + Math.sin(i * 0.7 + Date.now() * 0.01) * 22 + Math.random() * 8))
        );
      } else {
        setWaveData(Array(40).fill(4));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [alexStatus]);

  useEffect(() => {
    if (sessionState !== 'live') return;
    const interval = setInterval(() => {
      if (analyserRef.current && !isMuted) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const processed = Array.from(dataArray.slice(0, 40)).map((v) => Math.max(4, (v / 255) * 60));
        setUserWaveData(processed);
      } else {
        setUserWaveData(Array(40).fill(4));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [sessionState, isMuted]);

  // Connect to Gemini Live
  const connectToGemini = useCallback(
    async (apiKey: string, systemInstructionText: string, pastEntries: TranscriptEntry[] = []) => {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: 'v1beta' },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = await (ai.live as any).connect({
        model: MODEL,
        config: {
          systemInstruction: { parts: [{ text: systemInstructionText }] },
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            languageCode: 'en-US',
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        } as LiveConnectConfig,
        callbacks: {
          onopen: () => {
            toast.success('Connected to Gemini Live');
          },
          onsetup: () => {
            setSessionState('live');
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onmessage: (data: any) => {
            try {
              const response = data.serverContent;
              if (!response) return;

              if (response.interrupted) {
                stopAudioPlayback();
                return;
              }

              const modelTurn = response.modelTurn;
              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  if (part.text && !part.thought) {
                    setTranscript((prev) => {
                      const last = prev[prev.length - 1];
                      if (last?.role === 'ai') {
                        return [...prev.slice(0, -1), { ...last, text: last.text + part.text }];
                      }
                      return [...prev, { role: 'ai', text: part.text, ts: Date.now() }];
                    });
                  }
                  if (part.inlineData?.data) {
                    setAlexStatus('speaking');
                    const stopWave = animateWave(true);
                    playPCMChunk(part.inlineData.data, () => {
                      if (activeSourcesRef.current.length === 0) {
                        setAlexStatus('listening');
                        if (typeof stopWave === 'function') stopWave();
                      }
                    });
                  }
                }
              }

              if (response.outputTranscription?.text) {
                const chunk = response.outputTranscription.text;
                setTranscript((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'ai') {
                    return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
                  }
                  return [...prev, { role: 'ai', text: chunk, ts: Date.now() }];
                });
              }

              if (response.inputTranscription?.text) {
                const text = response.inputTranscription.text;
                setAlexStatus('listening');
                setTranscript((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'user') {
                    return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                  }
                  return [...prev, { role: 'user', text, ts: Date.now() }];
                });
              }

              if (response.turnComplete) {
                setAlexStatus('listening');
                animateWave(false);
              }
            } catch (err) {
              console.error('Error in onmessage handler:', err);
            }
          },
          onerror: () => {
            toast.error('Connection error. Check your Gemini API key in Settings.');
            setSessionState('hub');
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onclose: (e: any) => {
            if (sessionState === 'live') {
              toast.error(`Connection closed: ${e.reason || 'Session ended'}`);
            }
          },
        },
      });

      sessionRef.current = session;

      // Prefill conversation context if resuming
      if (pastEntries && pastEntries.length > 0) {
        session.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: 'The candidate has rejoined this active session to continue. Please warmly welcome them back in one concise sentence, mention what was discussed, and smoothly continue from where we left off.',
                },
              ],
            },
          ],
          turnComplete: true,
        });
      } else {
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: 'The candidate has joined. Please start.' }] }],
          turnComplete: true,
        });
      }
    },
    [animateWave, playPCMChunk, stopAudioPlayback, sessionState]
  );

  // START or CONTINUE session
  const startSession = async (
    overrideSessionId?: string,
    overrideTopic?: string,
    overrideRole?: string,
    overrideMode?: 'interview' | 'teach'
  ) => {
    setSessionState('connecting');
    try {
      // 1. Get API Key (from localStorage, /api/gemini-session token, or user profile)
      let apiKey: string | null = null;

      try {
        const localKey = localStorage.getItem('prepspace_gemini_key');
        if (localKey && localKey.trim() && !localKey.includes('•') && /^[\x00-\x7F]+$/.test(localKey.trim())) {
          apiKey = localKey.trim();
        }
      } catch { }

      if (!apiKey) {
        try {
          const keyRes = await fetch('/api/gemini-session');
          if (keyRes.ok) {
            const keyData = await keyRes.json();
            const fetched = keyData.apiKey || keyData.token || keyData.key;
            if (fetched && !fetched.includes('•') && /^[\x00-\x7F]+$/.test(fetched)) {
              apiKey = fetched;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch from /api/gemini-session', e);
        }
      }

      if (!apiKey) {
        try {
          const profRes = await fetch('/api/user/profile');
          if (profRes.ok) {
            const profData = await profRes.json();
            const p = profData.profile || profData.user;
            if (p?.gemini_api_key && !p.gemini_api_key.includes('•') && /^[\x00-\x7F]+$/.test(p.gemini_api_key)) {
              apiKey = p.gemini_api_key;
            }
          }
        } catch { }
      }

      if (!apiKey) {
        throw new Error('Please configure your Gemini API Key in Settings to start.');
      }

      // 2. Determine session parameters
      const currentMode = overrideMode || activeMode;
      if (overrideMode) setActiveMode(overrideMode);
      const role = overrideRole || searchParams.get('role') || targetRole;
      if (overrideRole) setTargetRole(overrideRole);
      const activeTopic = overrideTopic || customTopic || selectedTopic;
      if (overrideTopic) {
        setCustomTopic(overrideTopic);
        setSelectedTopic(overrideTopic);
      }
      const company = searchParams.get('company') || undefined;
      const round = searchParams.get('round') || undefined;

      let moduleTopics: string[] = [];
      try {
        const raw = searchParams.get('module_topics');
        if (raw) moduleTopics = JSON.parse(decodeURIComponent(raw));
      } catch { }

      // Re-use existing session ID if resuming, otherwise create a new session
      let activeSessionId = overrideSessionId || sessionId;
      let pastEntries: TranscriptEntry[] = [];

      if (activeSessionId) {
        // Try finding from SWR cached sessions first
        const found = allSessions.find((s) => s.id === activeSessionId);
        if (found) {
          const loaded =
            Array.isArray(found.question_log) && found.question_log.length > 0
              ? found.question_log
              : found.plan?.transcript || [];
          if (Array.isArray(loaded)) pastEntries = loaded as TranscriptEntry[];
        }

        // If not in cache or empty, fetch directly from /api/sessions/[id]
        if (pastEntries.length === 0) {
          try {
            const r = await fetch(`/api/sessions/${activeSessionId}`);
            if (r.ok) {
              const d = await r.json();
              if (Array.isArray(d.session?.transcript)) {
                pastEntries = d.session.transcript;
              }
            }
          } catch { }
        }

        if (pastEntries.length > 0) {
          setTranscript(pastEntries);
          pastTranscriptCountRef.current = pastEntries.length;
        } else {
          setTranscript([]);
          pastTranscriptCountRef.current = 0;
        }
      } else {
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interview_type: currentMode === 'teach' ? 'teach' : 'general',
            mode: currentMode,
            role,
            company,
            round,
            topic: activeTopic,
          }),
        });
        if (!sessionRes.ok) throw new Error('Failed to create session on server');
        const { session } = await sessionRes.json();
        activeSessionId = session.id;
        setTranscript([]);
        pastTranscriptCountRef.current = 0;
      }
      setSessionId(activeSessionId);
      sessionIdRef.current = activeSessionId;

      // 3. User Media (video for preview, mic for 16kHz capture)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => { });
      }

      // 4. Fast Audio Streaming & Playback Output Setup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;

      // Ensure output AudioContext is initialized and un-suspended within user gesture
      let outCtx = audioOutputRef.current;
      if (!outCtx || outCtx.state === 'closed') {
        outCtx = new AC({ sampleRate: 24000 });
        audioOutputRef.current = outCtx;
      }
      if (outCtx && outCtx.state === 'suspended') {
        await outCtx.resume().catch(() => {});
      }

      const audioContext = new AC({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {});
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 2048 samples = 128ms buffer for smooth, reliable speech streaming to Gemini VAD
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
        if (!sessionRef.current || isMutedRef.current) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        try {
          const blob = createAudioBlob(pcmData);
          sessionRef.current.sendRealtimeInput({ audio: blob });
        } catch { }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      // 5. Connect to Gemini Live with prior conversation context if continuing
      let pastConversationText = '';
      if (pastEntries && pastEntries.length > 0) {
        pastConversationText = pastEntries
          .filter((e) => e.text && e.text.trim().length > 0)
          .map((e) => `${e.role === 'ai' ? 'Alex' : 'Candidate'}: "${e.text.trim()}"`)
          .join('\n');
      }

      const instructions = buildSystemInstruction(
        currentMode,
        role,
        company,
        round,
        activeTopic,
        moduleTopics,
        pastConversationText
      );
      await connectToGemini(apiKey, instructions, pastEntries);

      setSessionStartTime(Date.now());
      setSessionState('live');
      setAlexStatus('thinking');
      mutateSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      toast.error(msg);
      setSessionState('hub');
    }
  };

  // Direct start or resume from URL
  useEffect(() => {
    const direct = searchParams.get('direct');
    const start = searchParams.get('start');
    const resumeId = searchParams.get('resumeSessionId');

    if ((direct === 'true' || start === 'true' || resumeId) && sessionState === 'hub' && !directStartedRef.current) {
      directStartedRef.current = true;
      startSession(resumeId || undefined);
    }
  }, [searchParams, sessionState]);

  // 1 FPS real-time video frame capture and transmission to Gemini Live
  useEffect(() => {
    if (sessionState !== 'live') {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = undefined;
      }
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    videoIntervalRef.current = setInterval(() => {
      if (!sessionRef.current || isCameraOffRef.current) return;
      const videoEl = videoRef.current;
      if (!videoEl || videoEl.readyState < 2 || videoEl.paused || videoEl.ended) return;

      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      if (!vw || !vh) return;

      const hasActiveTrack = streamRef.current
        ?.getVideoTracks()
        .some((t) => t.enabled && t.readyState === 'live');
      if (!hasActiveTrack) return;

      try {
        const scale = Math.min(640 / vw, 480 / vh, 1);
        const targetWidth = Math.round(vw * scale);
        const targetHeight = Math.round(vh * scale);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }

        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const commaIdx = dataUrl.indexOf(',');
          if (commaIdx !== -1) {
            const base64 = dataUrl.substring(commaIdx + 1);
            if (base64 && sessionRef.current) {
              sessionRef.current.sendRealtimeInput({
                media: {
                  data: base64,
                  mimeType: 'image/jpeg',
                },
              });
            }
          }
        }
      } catch {
        // Silently skip frame on transient failure
      }
    }, 1000); // Recommended 1 frame per second for multimodal live

    return () => {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = undefined;
      }
    };
  }, [sessionState]);

  // END session
  const endSession = useCallback(async () => {
    sessionRef.current?.close();

    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = undefined;
    }

    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch { }
      scriptProcessorRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => { });
    }
    if (audioOutputRef.current && audioOutputRef.current.state !== 'closed') {
      audioOutputRef.current.close().catch(() => { });
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }

    setSessionState('complete');

    // Mark session as COMPLETE in DB & persist the full transcript
    const currentTranscript = transcriptRef.current;
    const activeId = sessionIdRef.current || sessionId;
    if (activeId) {
      fetch(`/api/sessions/${activeId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration_seconds: sessionTime,
          transcript: currentTranscript,
        }),
        keepalive: true,
      }).then(() => {
        // Revalidate user profile so sidebar XP + streak refresh
        mutateUser();
      }).catch(() => { });
    }

    // Only generate performance report for interview sessions, not teach sessions
    if (activeId && currentTranscript.length > 1 && activeMode !== 'teach') {
      setIsGeneratingReport(true);
      const fullTranscript = currentTranscript
        .map((t) => {
          const relMs = Math.max(0, t.ts - sessionStartTime);
          const m = Math.floor(relMs / 60000).toString().padStart(2, '0');
          const s = Math.floor((relMs % 60000) / 1000).toString().padStart(2, '0');
          return `[${m}:${s}] ${t.role === 'ai' ? 'Alex' : 'You'}: ${t.text}`;
        })
        .join('\n\n');

      try {
        const res = await fetch('/api/sessions/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            transcript: fullTranscript,
            role: targetRole,
            interview_type: 'general',
            session_time: sessionTime,
          }),
        });
        if (res.ok) {
          const { report } = await res.json();
          setGeneratedReportId(report.id);
          toast.success('Session report is ready!');
        } else {
          toast.error('Failed to generate report, but session was saved.');
        }
      } catch {
        toast.error('Failed to generate report, but session was saved.');
      } finally {
        setIsGeneratingReport(false);
        mutateSessions();
      }
    } else {
      mutateSessions();
    }
  }, [sessionId, sessionStartTime, targetRole, activeMode, sessionTime, mutateSessions]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = undefined;
      }
    };
  }, []);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // ==========================================
  // RENDER: LIVE STUDIO / CONNECTING SCREEN
  // ==========================================
  if (sessionState === 'connecting' || sessionState === 'live') {
    const live = sessionState === 'live';
    return (
      <div className="flex min-h-full flex-col bg-canvas text-fg lg:h-dvh">
        {/* Top bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {live ? <span className="live-dot shrink-0" aria-hidden /> : <span className="h-2 w-2 shrink-0 rounded-full bg-fg-3" aria-hidden />}
            <h1 className="whitespace-nowrap font-display text-[15px] font-semibold">
              {activeMode === 'teach' ? 'Tutoring with Alex' : 'Live interview'}
            </h1>
            <span className="truncate text-xs text-fg-3">{live ? targetRole : 'Connecting…'}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-1 flex items-center gap-1.5 font-mono text-sm font-medium text-fg" role="timer" aria-label="Session time">
              <Clock size={14} className="text-fg-3" aria-hidden />
              <span>{formatTime(sessionTime)}</span>
            </div>

            <Button
              variant={isMuted ? 'danger' : 'secondary'}
              size="icon"
              aria-pressed={isMuted}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              onClick={() => {
                setIsMuted(v => !v);
                const tracks = streamRef.current?.getAudioTracks();
                tracks?.forEach(t => { t.enabled = isMuted; }); // toggle
              }}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>

            <Button
              variant={isCameraOff ? 'danger' : 'secondary'}
              size="icon"
              aria-pressed={isCameraOff}
              aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              onClick={() => {
                const nextOff = !isCameraOff;
                setIsCameraOff(nextOff);
                isCameraOffRef.current = nextOff;
                const tracks = streamRef.current?.getVideoTracks();
                tracks?.forEach(t => { t.enabled = !nextOff; });
              }}
            >
              {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
            </Button>

            <Button variant="primary" onClick={endSession} className="bg-bad text-[var(--text-on-accent)] hover:bg-bad/90">
              <PhoneOff size={15} aria-hidden /> End session
            </Button>
          </div>
        </div>

        {/* Stage */}
        <div className="grid min-h-0 flex-1 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="grid min-h-0 gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
            <Card padded={false} className={cn('relative flex min-h-[220px] items-center justify-center overflow-hidden transition-colors', alexStatus === 'speaking' && 'border-live/50')}>
              <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1 text-xs font-medium text-fg-2">
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', alexStatus === 'speaking' ? 'bg-live' : alexStatus === 'thinking' ? 'bg-signal' : 'bg-fg-3')}
                  style={alexStatus !== 'listening' ? { animation: 'pulse 1.4s ease-in-out infinite' } : undefined}
                  aria-hidden
                />
                Alex · {alexStatus}
              </div>
              <div className="h-full w-full">
                <AudioOrb status={alexStatus} waveData={waveData} />
              </div>
            </Card>

            <div className="relative min-h-[220px] overflow-hidden rounded-panel border border-line bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                aria-label="Your camera preview"
                className={cn('h-full w-full object-cover', isCameraOff && 'hidden')}
                style={{ transform: 'scaleX(-1)' }}
              />
              {isCameraOff && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-fg-3">
                  <VideoOff size={30} aria-hidden />
                  <span className="text-[13px]">Camera off</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-control bg-black/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                <span>You</span>
                {!isMuted && (
                  <span className="flex h-3.5 items-center gap-0.5" aria-hidden>
                    {userWaveData.slice(0, 12).map((h, i) => (
                      <span key={i} className="w-0.5 rounded-sm bg-live" style={{ height: `${Math.max(2, Math.min(14, h / 3))}px` }} />
                    ))}
                  </span>
                )}
                {isMuted && <MicOff size={11} className="text-bad" aria-label="Muted" />}
              </div>
            </div>
          </div>

          {/* Live transcript */}
          <Card padded={false} className="flex min-h-[280px] flex-col overflow-hidden lg:min-h-0">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13px] font-medium text-fg-2">
              {live && <span className="live-dot" aria-hidden />}
              Live transcript
            </div>
            <div ref={transcriptContainerRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Interview transcript">
              {transcript.length === 0 ? (
                <div className="m-auto max-w-xs text-center text-[13px] leading-relaxed text-fg-3">
                  <Sparkles size={20} className="mx-auto mb-2 opacity-60" aria-hidden />
                  Connecting the voice stream. When it is live, say hello to Alex.
                </div>
              ) : (
                transcript.map((entry, i) => (
                  <div key={i}>
                    {pastTranscriptCountRef.current > 0 && i === pastTranscriptCountRef.current && (
                      <div className="my-3 flex items-center gap-3 text-xs font-medium text-signal">
                        <span className="h-px flex-1 bg-line" />
                        <span>Session resumed from here</span>
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-panel border px-3.5 py-2.5 text-[13.5px] leading-relaxed',
                        entry.role === 'user' ? 'ml-auto border-signal/25 bg-signal/10 text-fg' : 'border-line bg-raised text-fg'
                      )}
                    >
                      <div className={cn('mb-0.5 text-xs font-semibold', entry.role === 'user' ? 'text-signal' : 'text-fg-3')}>
                        {entry.role === 'user' ? 'You' : 'Alex'}
                      </div>
                      {entry.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: SESSION COMPLETED SCREEN
  // ==========================================
  if (sessionState === 'complete') {
    const isTeach = activeMode === 'teach';
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-good/40 bg-good/10 text-good">
            <CheckCircle2 size={30} aria-hidden />
          </span>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-fg">{isTeach ? 'Lesson complete' : 'Session complete'}</h1>
          <p className="mt-2 text-[15px] text-fg-2">
            {isTeach ? 'Nice work with Alex.' : 'Nice work.'} You practised for <span className="font-mono text-fg">{formatTime(sessionTime)}</span>.
          </p>
          {!isTeach && (
            <p className="mt-1 text-sm text-fg-3" role="status">
              {isGeneratingReport ? 'Generating your evaluation…' : 'Your session is saved.'}
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!isTeach && (
              isGeneratingReport ? (
                <Button variant="secondary" loading disabled>Generating report…</Button>
              ) : generatedReportId ? (
                <ButtonLink href={`/reports/${generatedReportId}`} size="lg">
                  <FileText size={16} aria-hidden /> View evaluation report
                </ButtonLink>
              ) : null
            )}

            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setSessionState('hub');
                setTranscript([]);
                setSessionTime(0);
                setSessionId(null);
                setGeneratedReportId(null);
              }}
            >
              Back to studio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: STUDIO HUB (Default)
  // ==========================================
  const modes = [
    { id: 'interview' as const, icon: Mic, title: 'Interview', desc: 'Adaptive technical and behavioural questions with live feedback' },
    { id: 'teach' as const, icon: BookOpen, title: 'Teach me a topic', desc: 'Interactive walkthroughs of architecture and concepts' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      <PageHeader
        title="AI interview studio"
        description="Practise a live voice interview, or learn a topic step by step with Alex."
        action={
          <Button size="lg" onClick={() => startSession()}>
            <Play size={16} className="fill-current" aria-hidden /> Start {activeMode === 'interview' ? 'interview' : 'lesson'}
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Session type">
        {modes.map(({ id, icon: Icon, title, desc }) => {
          const on = activeMode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setActiveMode(id)}
              className={cn('flex items-start gap-3.5 rounded-panel border p-4 text-left transition-colors', on ? 'border-signal bg-signal/10' : 'border-line bg-panel hover:border-line-strong hover:bg-raised')}
            >
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-control', on ? 'bg-signal/15 text-signal' : 'bg-raised text-fg-3')}>
                <Icon size={18} aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-fg">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-fg-3">{desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Card className="mb-10 p-5 sm:p-6">
        {activeMode === 'interview' ? (
          <div className="space-y-5">
            <Field label="Target role">
              {a => <Input {...a} placeholder="Senior Backend Engineer" value={targetRole} onChange={e => setTargetRole(e.target.value)} />}
            </Field>
            <Field label="Topic or focus area (optional)">
              {a => <Input {...a} placeholder="Distributed caching, Kubernetes scaling, Stripe system design" value={customTopic} onChange={e => setCustomTopic(e.target.value)} />}
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[13px] font-medium text-fg">Pick a topic, or type your own</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested topics">
              {TEACH_TOPICS.map(topic => {
                const on = selectedTopic === topic;
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setSelectedTopic(topic); setCustomTopic(''); }}
                    className={cn('rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors', on ? 'border-signal bg-signal text-[var(--text-on-accent)]' : 'border-line bg-raised text-fg-2 hover:border-line-strong')}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
            <Input
              aria-label="Custom topic"
              placeholder="Or type any topic, for example LSM trees, Raft consensus or WebRTC"
              value={customTopic}
              onChange={e => { setCustomTopic(e.target.value); setSelectedTopic(''); }}
            />
          </div>
        )}
      </Card>

      <section aria-labelledby="past-sessions">
        <SectionHeader
          title={`Past ${activeMode === 'interview' ? 'interview' : 'tutoring'} sessions`}
          action={filteredSessions.length > 0 ? <Link href="/reports" className="text-sm font-medium text-signal hover:underline">View all reports</Link> : undefined}
        />
        <span id="past-sessions" className="sr-only">Past sessions</span>

        {filteredSessions.length === 0 ? (
          <EmptyState
            icon={<Mic size={20} aria-hidden />}
            title={`No ${activeMode === 'interview' ? 'interview' : 'tutoring'} sessions yet`}
            description={`Choose Start ${activeMode === 'interview' ? 'interview' : 'lesson'} above to open a voice session with Alex.`}
          />
        ) : (
          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-line">
              {filteredSessions.slice(0, 10).map(session => {
                const report = session.interview_reports?.[0];
                const isCompleted = session.state === 'COMPLETE';
                const sessionTitle = session.plan?.topic || session.plan?.role || (activeMode === 'teach' ? 'Topic tutoring' : 'Technical interview');
                const score = report?.overall_score;

                return (
                  <li key={session.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-raised text-signal">
                        {activeMode === 'teach' ? <BookOpen size={17} aria-hidden /> : <Mic size={17} aria-hidden />}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-fg">{sessionTitle}</div>
                        <div className="text-xs text-fg-3">{formatDate(session.created_at)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCompleted && report ? (
                        <div className="mr-1 text-right">
                          <div className={cn('font-mono text-lg font-semibold leading-none', typeof score === 'number' && (score >= 80 ? 'text-good' : score >= 60 ? 'text-live' : 'text-bad'))}>{score}%</div>
                          <div className="mt-1 text-[12px] text-fg-3">Score</div>
                        </div>
                      ) : (
                        <Badge tone="live">{session.state === 'IN_PROGRESS' ? 'In progress' : 'Incomplete'}</Badge>
                      )}

                      {report && (
                        <ButtonLink href={`/reports/${report.id}`} variant="secondary" size="sm">Report</ButtonLink>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          startSession(
                            session.id,
                            session.plan?.topic,
                            session.plan?.role,
                            (session.interview_type === 'teach' || session.plan?.mode === 'teach') ? 'teach' : 'interview'
                          )
                        }
                      >
                        <RotateCcw size={13} aria-hidden /> Continue
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

export default function AIInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container" aria-busy="true" aria-label="Loading studio">
          <Skeleton className="mb-3 h-9 w-72 max-w-full" />
          <Skeleton className="mb-8 h-4 w-96 max-w-full" />
          <Skeleton className="h-40 rounded-panel" />
        </div>
      }
    >
      <InterviewStudioContent />
    </Suspense>
  );
}

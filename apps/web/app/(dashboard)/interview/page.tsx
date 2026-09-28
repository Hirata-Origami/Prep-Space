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
  FileText
} from 'lucide-react';

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
  const [takeToReportLoading, setTakeToReportLoading] = useState(false);

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
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {/* Top bar */}
        <div style={{
          minHeight: '58px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px clamp(12px, 3vw, 24px)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 auto' }}>
            <div style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: sessionState === 'live' ? 'var(--accent-primary)' : 'var(--accent-amber)',
              boxShadow: sessionState === 'live' ? '0 0 8px var(--accent-primary)' : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {activeMode === 'teach' ? 'Alex · Tutoring' : 'Live Interview'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {targetRole}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>
              <Clock size={15} />
              <span>{formatTime(sessionTime)}</span>
            </div>

            {/* Mute toggle */}
            <button
              onClick={() => {
                setIsMuted(v => !v);
                const tracks = streamRef.current?.getAudioTracks();
                tracks?.forEach(t => { t.enabled = isMuted; }); // toggle
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: isMuted ? 'var(--accent-red-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${isMuted ? 'var(--accent-red)' : 'var(--border)'}`,
                color: isMuted ? 'var(--accent-red)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Camera toggle */}
            <button
              onClick={() => {
                const nextOff = !isCameraOff;
                setIsCameraOff(nextOff);
                isCameraOffRef.current = nextOff;
                const tracks = streamRef.current?.getVideoTracks();
                tracks?.forEach(t => { t.enabled = !nextOff; });
              }}
              title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
              style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: isCameraOff ? 'var(--accent-red-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${isCameraOff ? 'var(--accent-red)' : 'var(--border)'}`,
                color: isCameraOff ? 'var(--accent-red)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>

            <button
              onClick={endSession}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 18px', borderRadius: '8px',
                background: 'var(--accent-red)', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                boxShadow: '0 2px 12px rgba(var(--accent-red-rgb), 0.25)',
              }}
            >
              <PhoneOff size={15} />
              <span>End Session</span>
            </button>
          </div>
        </div>

        {/* Main layout: Video row on top, transcript below */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px', gap: '16px' }}>

          {/* Video Row — equal split between AI and User */}
          <div className="grid-responsive-2" style={{ height: 'auto', minHeight: '200px', flexShrink: 0 }}>

            {/* Alex AI Card with Glowing Audio Orb */}
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: `1px solid ${alexStatus === 'speaking' ? 'var(--accent-primary)' : 'var(--border)'}`,
              boxShadow: alexStatus === 'speaking' ? '0 0 20px var(--accent-primary-glow)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}>
              {/* Status badge */}
              <div style={{
                position: 'absolute', top: '12px', left: '12px',
                padding: '3px 10px', borderRadius: '100px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                fontSize: '12px', fontWeight: 700,
                color: alexStatus === 'speaking' ? 'var(--accent-primary)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '5px',
                
                zIndex: 2,
              }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: alexStatus === 'speaking' ? 'var(--accent-primary)'
                    : alexStatus === 'thinking' ? 'var(--accent-amber)' : 'var(--text-muted)',
                  animation: alexStatus !== 'listening' ? 'pulse 1.4s ease-in-out infinite' : 'none',
                }} />
                Alex · {alexStatus}
              </div>

              {/* Glowing Interactive Audio Orb */}
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AudioOrb status={alexStatus} waveData={waveData} />
              </div>
            </div>

            {/* User Camera Card */}
            <div style={{
              background: '#000',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: isCameraOff ? 'none' : 'block' }}
              />
              {isCameraOff && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '8px', color: 'var(--text-muted)',
                }}>
                  <VideoOff size={32} />
                  <span style={{ fontSize: '13px' }}>Camera off</span>
                </div>
              )}
              {/* User label + mic wave */}
              <div style={{
                position: 'absolute', bottom: '12px', left: '12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#fff',
              }}>
                <span>You</span>
                {!isMuted && (
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '14px' }}>
                    {userWaveData.slice(0, 12).map((h, i) => (
                      <div key={i} style={{ width: '2px', height: `${Math.min(14, h / 3)}px`, background: 'var(--accent-primary)', borderRadius: '1px' }} />
                    ))}
                  </div>
                )}
                {isMuted && <MicOff size={11} style={{ color: 'var(--accent-red)' }} />}
              </div>
            </div>
          </div>

          {/* Live Transcript Panel */}
          <div style={{
            flex: 1,
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)',
              
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', animation: sessionState === 'live' ? 'pulse 1.4s ease-in-out infinite' : 'none' }} />
              Live Transcript
            </div>
            <div
              ref={transcriptContainerRef}
              style={{
                flex: 1, padding: '16px 20px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}
            >
              {transcript.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', lineHeight: 1.6 }}>
                  <Sparkles size={20} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <br />Connecting voice stream…<br />Say hello to Alex!
                </div>
              ) : (
                transcript.map((entry, i) => (
                  <div key={i}>
                    {pastTranscriptCountRef.current > 0 && i === pastTranscriptCountRef.current && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        margin: '12px 0',
                        color: 'var(--accent-primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        
                        
                      }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        <span>✦ Session Continued · Resumed From Here ✦</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      </div>
                    )}
                    <div style={{
                      alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      marginLeft: entry.role === 'user' ? 'auto' : '0',
                      padding: '9px 13px',
                      borderRadius: '12px',
                      background: entry.role === 'user' ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
                      border: `1px solid ${entry.role === 'user' ? 'rgba(var(--accent-primary-rgb), 0.25)' : 'var(--border)'}`,
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                      lineHeight: 1.55,
                    }}>
                      <div style={{ fontSize: '12px', color: entry.role === 'user' ? 'var(--accent-primary)' : 'var(--text-muted)', marginBottom: '3px', fontWeight: 700, }}>
                        {entry.role === 'user' ? 'YOU' : 'ALEX'}
                      </div>
                      {entry.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 6vw, 40px) 16px' }}>
        <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--accent-primary-dim)',
            border: '2px solid var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            
            color: 'var(--accent-primary)',
          }}>
            <CheckCircle2 size={34} />
          </div>
          <h1 className="font-display mb-1.5 text-[26px] font-bold leading-tight tracking-tight text-fg sm:text-[32px]">
            {isTeach ? 'Lesson Complete!' : 'Session Concluded'}
          </h1>
          <p className="text-[15px] text-fg-2">
            {isTeach
              ? `Great learning session with Alex! Duration: ${formatTime(sessionTime)}.`
              : `Great work! Duration: ${formatTime(sessionTime)}.`}
          </p>
          {!isTeach && (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
              {isGeneratingReport ? 'Generating your performance evaluation…' : 'Your session has been saved.'}
            </p>
          )}
          {isTeach && <div style={{ marginBottom: '32px' }} />}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Report button — interview sessions only */}
            {!isTeach && (
              isGeneratingReport ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: '14px',
                }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.9s linear infinite' }} />
                  Generating report…
                </div>
              ) : generatedReportId ? (
                <Link
                  href={`/reports/${generatedReportId}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '12px 24px', borderRadius: '10px',
                    background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                    fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                    
                  }}
                >
                  <FileText size={16} />
                  View Evaluation Report
                </Link>
              ) : null
            )}

            <button
              onClick={() => {
                setSessionState('hub');
                setTranscript([]);
                setSessionTime(0);
                setSessionId(null);
                setGeneratedReportId(null);
              }}
              style={{
                padding: '12px 24px', borderRadius: '10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
            >
              ← Back to Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: STUDIO HUB (Default)
  // ==========================================
  return (
    <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="font-display mb-1.5 text-[26px] font-bold leading-tight tracking-tight text-fg sm:text-[32px]">
            AI Interview Studio
          </h1>
          <p className="text-[15px] text-fg-2">
            Practice real-time voice interviews or get step-by-step topic tutoring with Alex
          </p>
        </div>

        <button
          onClick={() => startSession()}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '15px',
            fontWeight: 700,
            padding: '12px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            border: 'none',
            color: 'var(--text-on-accent)',
            
          }}
        >
          <Play size={16} fill="currentColor" color="currentColor" />
          <span>Start {activeMode === 'interview' ? 'Interview' : 'Lesson'}</span>
        </button>
      </div>

      {/* Mode Tabs — borderless modern segmented pill switch */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '4px',
        background: 'var(--bg-elevated)',
        padding: '4px',
        borderRadius: '14px',
        marginBottom: '28px',
      }}>
        <button
          onClick={() => setActiveMode('interview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            background: activeMode === 'interview' ? 'var(--bg-surface)' : 'transparent',
            boxShadow: activeMode === 'interview' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s ease',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: activeMode === 'interview' ? 'var(--accent-primary-dim)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeMode === 'interview' ? 'var(--accent-primary)' : 'var(--text-muted)',
            flexShrink: 0,
          }}>
            <Mic size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: activeMode === 'interview' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              Interview
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Adaptive technical & behavioral questions with real-time feedback
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveMode('teach')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            background: activeMode === 'teach' ? 'var(--bg-surface)' : 'transparent',
            boxShadow: activeMode === 'teach' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s ease',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: activeMode === 'teach' ? 'var(--accent-primary-dim)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeMode === 'teach' ? 'var(--accent-primary)' : 'var(--text-muted)',
            flexShrink: 0,
          }}>
            <BookOpen size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: activeMode === 'teach' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              Teach me a topic
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Interactive walkthroughs breaking down architecture & concepts
            </div>
          </div>
        </button>
      </div>

      {/* Mode Configuration Card (NO "Select Interview Format" cards!) */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '36px',
      }}>
        {activeMode === 'interview' ? (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Target Role
              </label>
              <input
                className="input"
                placeholder="e.g. Senior Backend Engineer, Fullstack Developer..."
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Specific Topic or Focus Area (Optional)
              </label>
              <input
                className="input"
                placeholder="e.g. Distributed caching, Kubernetes scaling, Stripe system design..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Select a Topic or Enter Your Own
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {TEACH_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setCustomTopic('');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedTopic === topic ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: selectedTopic === topic ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedTopic === topic ? '0 2px 8px var(--accent-primary-glow)' : 'none',
                  }}
                >
                  {topic}
                </button>
              ))}
            </div>

            <input
              className="input"
              placeholder="Or type any custom topic (e.g. LSM Trees, Raft consensus, WebRTC)..."
              value={customTopic}
              onChange={(e) => {
                setCustomTopic(e.target.value);
                setSelectedTopic('');
              }}
              style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            />
          </div>
        )}
      </div>

      {/* Past Sessions (Filtered strictly by mode) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Past {activeMode === 'interview' ? 'Interview' : 'Topic Tutoring'} Sessions
          </h2>
          {filteredSessions.length > 0 && (
            <Link href="/reports" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              View all reports
            </Link>
          )}
        </div>

        {filteredSessions.length === 0 ? (
          <div style={{
            padding: '40px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '10px', color: 'var(--accent-primary)', display: 'flex', justifyContent: 'center' }}><Mic size={30} aria-hidden /></div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No {activeMode === 'interview' ? 'interview' : 'tutoring'} sessions yet
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              Click &quot;Start {activeMode === 'interview' ? 'Interview' : 'Lesson'}&quot; above to launch your voice session with Alex.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredSessions.slice(0, 10).map((session) => {
              const report = session.interview_reports?.[0];
              const isCompleted = session.state === 'COMPLETE';
              const sessionTitle = session.plan?.topic || session.plan?.role || (activeMode === 'teach' ? 'Topic Tutoring' : 'Technical Interview');

              return (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(var(--accent-primary-rgb), 0.08)',
                      border: '1px solid rgba(var(--accent-primary-rgb), 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}>
                      {activeMode === 'teach' ? <BookOpen size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {sessionTitle}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDate(session.created_at)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isCompleted && report ? (
                      <div style={{ textAlign: 'right', marginRight: '4px' }}>
                        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {report.overall_score}%
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', }}>
                          Score
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--accent-amber)', fontWeight: 600 }}>
                        {session.state === 'IN_PROGRESS' ? '● In Progress' : '● Incomplete'}
                      </div>
                    )}

                    {/* Report button if available */}
                    {report && (
                      <Link
                        href={`/reports/${report.id}`}
                        style={{
                          padding: '8px 14px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        Report
                      </Link>
                    )}

                    {/* Continue Button — always working */}
                    <button
                      onClick={() =>
                        startSession(
                          session.id,
                          session.plan?.topic,
                          session.plan?.role,
                          (session.interview_type === 'teach' || session.plan?.mode === 'teach') ? 'teach' : 'interview'
                        )
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: 'var(--accent-primary-dim)',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: '8px',
                        color: 'var(--accent-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={13} />
                      <span>Continue</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIInterviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-muted)' }}>Loading AI Studio...</div>}>
      <InterviewStudioContent />
    </Suspense>
  );
}

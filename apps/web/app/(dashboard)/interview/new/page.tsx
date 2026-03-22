'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { GoogleGenAI, Modality, StartSensitivity, EndSensitivity, MediaResolution } from '@google/genai';

type InterviewType = 'conceptual' | 'behavioral' | 'system_design' | 'coding_walkthrough';
type SessionState = 'setup' | 'connecting' | 'live' | 'complete';

const INTERVIEW_TYPES: { id: InterviewType; label: string; icon: string; desc: string }[] = [
  { id: 'conceptual', label: 'Conceptual', icon: '🧠', desc: 'Knowledge-based Q&A' },
  { id: 'behavioral', label: 'Behavioral (STAR)', icon: '🌟', desc: 'Situation/Task/Action/Result' },
  { id: 'system_design', label: 'System Design', icon: '🏗️', desc: 'Design distributed systems' },
  { id: 'coding_walkthrough', label: 'Coding Walkthrough', icon: '💻', desc: 'Explain your approach verbally' },
];

interface TranscriptEntry {
  role: 'ai' | 'user';
  text: string;
  ts: number;
}

const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';
const SAMPLE_RATE = 16000;
const VIDEO_FPS = 1; // 1 frame/sec for video analysis

function buildSystemInstruction(type: InterviewType, role: string): string {
  const typeGuide: Record<InterviewType, string> = {
    conceptual: 'Ask deep conceptual questions. Probe understanding, not just definitions. Ask 8-10 questions, progressively harder.',
    behavioral: 'Use the STAR method. Ask about specific past experiences. Probe for depth on impact and lessons learned.',
    system_design: 'Start with an open-ended design problem. Probe scalability, trade-offs, and failure modes.',
    coding_walkthrough: 'Ask the candidate to walk through their approach to coding problems. Probe for complexity analysis and edge cases.',
  };

  return `You are Alex, an expert technical interviewer at a top tech company. You are conducting a ${type.replace('_', ' ')} interview for the role: ${role}.

BEHAVIOR:
- Be professional yet personable. Speak concisely — your spoken responses should be 1-3 sentences max.
- ${typeGuide[type]}
- After the candidate answers, give a brief (1 sentence) reaction, then ask the next question.
- If the candidate is off-track, gently redirect.
- Keep track of the conversation flow and build on previous answers.
- You can see and hear the candidate via video/audio. React naturally if you notice they seem confused or confident.
- After 8-10 questions, wrap up the session warmly.

TRANSCRIPT:
- You will automatically receive real-time audio and video input from the candidate.
- Your responses will be transcribed and shown to the candidate.

START: Greet the candidate warmly, mention the interview type and role, and ask your first question immediately.`;
}

export default function LiveInterviewPage() {
  const [interviewType, setInterviewType] = useState<InterviewType>('conceptual');
  const [targetRole, setTargetRole] = useState('Frontend Engineer');
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [alexStatus, setAlexStatus] = useState<'thinking' | 'speaking' | 'listening'>('listening');
  const [waveData, setWaveData] = useState<number[]>(Array(40).fill(4));
  const [userWaveData, setUserWaveData] = useState<number[]>(Array(40).fill(4));
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs for media / WebSocket
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const aiBufferRef = useRef<string>('');
  const userBufferRef = useRef<string>('');
  const audioOutputRef = useRef<AudioContext | null>(null);
  const apiKeyRef = useRef<string | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Attach video stream when live
  useEffect(() => {
    if (sessionState === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.error("Video play err", e));
    }
  }, [sessionState]);

  // Timer
  useEffect(() => {
    if (sessionState === 'live') {
      timerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionState]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // === AUDIO OUTPUT: play PCM from Gemini ===
  const lastAudioTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const playPCMChunk = useCallback((pcm16Data: ArrayBuffer, onEnded?: () => void) => {
    if (!audioOutputRef.current) {
      audioOutputRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = audioOutputRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const int16 = new Int16Array(pcm16Data);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Track active sources for stopping
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      if (onEnded) onEnded();
    };

    // Schedule playback to start after the previous chunk ends to avoid gaps
    const startTime = Math.max(ctx.currentTime, lastAudioTimeRef.current);
    console.log("Audio scheduled at:", startTime, "Current time:", ctx.currentTime);
    source.start(startTime);
    lastAudioTimeRef.current = startTime + buffer.duration;
  }, []);

  // Stop all audio playback (e.g., on interruption)
  const stopAudioPlayback = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    activeSourcesRef.current = [];
    lastAudioTimeRef.current = 0;
    setAlexStatus('listening');
  }, []);

  // === WAVEFORM ANIMATION during speech ===
  const animateWave = useCallback((active: boolean) => {
    if (!active) {
      setWaveData(Array(40).fill(4));
      setUserWaveData(Array(40).fill(4));
      return;
    }

    const interval = setInterval(() => {
      // Alex fake wave (since we can't easily tap into the library's private audio destination)
      if (alexStatus === 'speaking') {
        setWaveData(prev => prev.map((_, i) => Math.max(4, 15 + Math.sin(i * 0.7 + Date.now() * 0.01) * 22 + Math.random() * 8)));
      } else {
        setWaveData(Array(40).fill(4));
      }

      // User real wave (we CAN tap into the local stream)
      if (userAnalyserRef.current) {
        const data = new Uint8Array(20);
        userAnalyserRef.current.getByteFrequencyData(data);
        const processed = Array.from(data).map(v => Math.max(4, (v / 255) * 60));
        // Interpolate to 40 bars
        const interpolated = [];
        for (let i = 0; i < 40; i++) interpolated.push(processed[Math.floor(i / 2)] || 4);
        setUserWaveData(interpolated);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [alexStatus]);

  // === CONNECT TO GEMINI LIVE ===
  const connectToGemini = useCallback(async (apiKey: string) => {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });
    const session = await (ai.live as any).connect({
      model: MODEL,
      config: {
        systemInstruction: { parts: [{ text: buildSystemInstruction(interviewType, targetRole) }] },
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
          }
        },
        proactiveAudio: true,
        thinkingConfig: {
          thinkingBudget: 1024,
          includeThoughts: true,
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      } as any,
      callbacks: {
        onopen: () => {
          console.log("WebSocket opened successfully");
          toast.success("Connected to Gemini Live");
        },
        onsetup: (data: any) => {
          console.log("Session connected (onsetup):", data);
          setSessionState('live');
          if (!audioCtxRef.current) {
            const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
          }
          if (!analyserRef.current && audioCtxRef.current) {
            analyserRef.current = audioCtxRef.current.createAnalyser();
          }
        },
        onmessage: (data: any) => {
          try {
            // DEEP DEBUG LOGGING
            console.log("RAW MESSAGE:", JSON.stringify(data));

            const response = data.serverContent;
            if (!response) {
              if (data.setupComplete) console.log("Setup complete message");
              return;
            }

            // Handle Interruption
            if (response.interrupted) {
              stopAudioPlayback();
              return;
            }

            // Handle Model Turn
            const modelTurn = response.modelTurn;
            if (modelTurn) {
              const parts = modelTurn.parts;
              if (parts) {
                for (const part of parts) {
                  const text = part.text;
                  if (text) {
                    const isThought = !!part.thought;
                    if (!isThought) {
                      setTranscript(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role === 'ai') {
                          return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                        }
                        return [...prev, { role: 'ai', text, ts: Date.now() }];
                      });
                    }
                  }

                  // Audio output
                  const inlineData = part.inlineData;
                  if (inlineData?.data && inlineData.mimeType?.startsWith('audio/pcm')) {
                    setAlexStatus('speaking');
                    const stopWave = animateWave(true);
                    const binaryString = atob(inlineData.data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                    playPCMChunk(bytes.buffer, () => {
                      if (activeSourcesRef.current.length === 0) {
                        setAlexStatus('listening');
                        if (typeof stopWave === 'function') stopWave();
                      }
                    });
                  }
                }
              }
            }

            // Alternative Transcript fields
            const outputTranscription = response.outputTranscription;
            if (outputTranscription?.text) {
              const chunk = outputTranscription.text;
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'ai') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
                }
                return [...prev, { role: 'ai', text: chunk, ts: Date.now() }];
              });
            }

            const inputTranscription = response.inputTranscription;
            if (inputTranscription?.text) {
              const chunk = inputTranscription.text;
              setAlexStatus('listening');
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
                }
                return [...prev, { role: 'user', text: chunk, ts: Date.now() }];
              });
            }

            if (response.turnComplete) {
              setAlexStatus('listening');
              animateWave(false);
            }
          } catch (err) {
            console.error("Error in onmessage handler:", err);
          }
        },
        onerror: (e: any) => {
          toast.error('Connection error. Check your Gemini API key in Settings.');
          setSessionState('setup');
        },
        onclose: (e: any) => {
          console.log("WebSocket closed:", e);
          if (sessionState === 'live') {
            toast.error(`Connection closed: ${e.reason || 'Unknown reason'}. Code: ${e.code}`);
          }
        }
      }
    });

    sessionRef.current = session;

    // Initial trigger to ensure the model greets the candidate
    session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: 'The candidate has joined. Please start the interview.' }] }],
      turnComplete: true
    });

    console.log("Session connected and initial trigger sent.");
  }, [interviewType, targetRole, animateWave, playPCMChunk, stopAudioPlayback, sessionState]);

  // === SEND AUDIO to Gemini (PCM16 @ 16kHz) ===
  const sendAudioChunk = useCallback((pcm16: Int16Array) => {
    const session = sessionRef.current;
    if (!session) return;

    // Check if session is actually open to avoid spamming "CLOSED state" errors
    // The SDK doesn't expose readyState directly, but we can catch errors
    try {
      // Robust base64 conversion for browser
      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const b64 = btoa(binary);

      session.sendRealtimeInput({
        audio: { mimeType: 'audio/pcm;rate=16000', data: b64 }
      });
    } catch (err) {
      console.warn("Failed to send audio chunk - connection might be closed", err);
    }
  }, []);

  // === SEND VIDEO FRAME to Gemini (JPEG) ===
  const sendVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !sessionRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 320;
    canvas.height = 240;
    try {
      ctx.drawImage(video, 0, 0, 320, 240);
      const b64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      sessionRef.current.sendRealtimeInput({
        video: { mimeType: 'image/jpeg', data: b64 }
      });
    } catch (err) {
      console.warn("Failed to send video frame:", err);
    }
  }, []);

  // === START SESSION ===
  const startSession = async () => {
    setSessionState('connecting');
    try {
      // 1. Get API key
      const keyRes = await fetch('/api/gemini-session');
      if (!keyRes.ok) {
        const { error } = await keyRes.json();
        toast.error(error);
        setSessionState('setup');
        return;
      }
      const { apiKey } = await keyRes.json();
      apiKeyRef.current = apiKey;

      // 2. Create session record
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_type: interviewType, role: targetRole }),
      });
      if (!sessionRes.ok) {
        throw new Error('Failed to create session on server');
      }
      const { session } = await sessionRes.json();
      setSessionId(session.id);

      // 3. Get camera + mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
        audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // 4. Set up AudioWorklet to capture PCM
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;

      // Setup user audio analyser for the glowing card
      if (!userAnalyserRef.current) {
        userAnalyserRef.current = ctx.createAnalyser();
        const source = ctx.createMediaStreamSource(stream);
        source.connect(userAnalyserRef.current);
        animateWave(true);
      }

      // Inline worklet processor with buffering to avoid overwhelming the server
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.buffer = new Int16Array(1600); // 100ms at 16kHz
            this.offset = 0;
          }
          process(inputs) {
            const input = inputs[0];
            if (input && input[0]) {
              const float32 = input[0];
              for (let i = 0; i < float32.length; i++) {
                this.buffer[this.offset++] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
                if (this.offset >= this.buffer.length) {
                  const data = this.buffer.buffer.slice(0);
                  this.port.postMessage(data, [data]);
                  this.offset = 0;
                }
              }
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const source = ctx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
      workletNode.port.onmessage = (e) => sendAudioChunk(new Int16Array(e.data));
      source.connect(workletNode);
      // Removed connection to destination as this is capture only
      workletNodeRef.current = workletNode;

      // Crucial: Resume AudioContext after user gesture
      if (ctx.state === 'suspended') await ctx.resume();

      // 5. Connect WebSocket to Gemini Live
      await connectToGemini(apiKey);

      // 6. Start sending video frames
      videoIntervalRef.current = setInterval(sendVideoFrame, 1000 / VIDEO_FPS);

      setSessionState('live');
      setAlexStatus('thinking');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to start session';
      toast.error(msg);
      setSessionState('setup');
    }
  };

  // === END SESSION ===
  const endSession = useCallback(async () => {
    // Close WebSocket
    sessionRef.current?.close();
    // Stop media
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(videoIntervalRef.current);
    clearInterval(timerRef.current);
    audioCtxRef.current?.close();
    audioOutputRef.current?.close();
    setSessionState('complete');

    // Generate report if we have a session and enough transcript
    if (sessionId && transcript.length > 2) {
      const fullTranscript = transcript.map(t => `${t.role === 'ai' ? 'Alex' : 'You'}: ${t.text}`).join('\n\n');
      try {
        await fetch('/api/sessions/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            transcript: fullTranscript,
            role: targetRole,
            interview_type: interviewType,
          }),
        });
      } catch { /* non-blocking */ }
    }
  }, [sessionId, transcript, targetRole, interviewType]);

  // === TOGGLE MIC ===
  const toggleMic = useCallback(() => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      const newMutedState = !isMuted;
      audioTrack.enabled = !newMutedState;
      setIsMuted(newMutedState);

      // If we are muting, signal the end of the audio stream to Gemini
      if (newMutedState && sessionRef.current) {
        console.log("Mic muted - sending audioStreamEnd");
        sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
      }
    }
  }, [isMuted]);

  // === TOGGLE CAMERA ===
  const toggleCamera = useCallback(() => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isCameraOff;
      setIsCameraOff(!isCameraOff);
    }
  }, [isCameraOff]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(videoIntervalRef.current);
      clearInterval(timerRef.current);
      audioCtxRef.current?.close();
      audioOutputRef.current?.close();
    };
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#080C14' }}>
      {/* Hidden canvas for video frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* SETUP SCREEN */}
      <AnimatePresence>
        {sessionState === 'setup' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            <div style={{ maxWidth: '700px', width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(77,255,160,0.08)', border: '1px solid rgba(77,255,160,0.2)', borderRadius: '100px', marginBottom: '20px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', animation: 'pulse-mint 2s infinite' }} />
                  <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>Gemini 2.5 Flash Lite · Live API</span>
                </div>
                <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>AI Interview Room</h1>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Live voice + video interview with Alex, your AI interviewer. Real-time transcription included.</p>
              </div>

              {/* Target role */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Target Role</label>
                <input className="input" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer at Google" style={{ width: '100%' }} />
              </div>

              {/* Interview type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {INTERVIEW_TYPES.map(t => (
                  <div key={t.id} onClick={() => setInterviewType(t.id)}
                    style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${interviewType === t.id ? 'rgba(77,255,160,0.4)' : 'var(--border)'}`, background: interviewType === t.id ? 'rgba(77,255,160,0.05)' : 'var(--bg-surface)', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: '24px' }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: interviewType === t.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{t.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Device check */}
              <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📹</span>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>Camera & microphone will be requested when you start. Video helps Alex read your body language and confidence.</div>
              </div>

              <button onClick={startSession} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '16px', padding: '15px' }}>
                🎙 Start Live Interview with Alex
              </button>
              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                ~25 min · Powered by Gemini 2.5 Flash Lite Live · Transcript auto-generated
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONNECTING SCREEN */}
      <AnimatePresence>
        {sessionState === 'connecting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', margin: '0 auto 24px', animation: 'spin-slow 1s linear infinite' }} />
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Connecting to Gemini Live…</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Setting up audio/video and WebSocket session</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIVE INTERVIEW ROOM */}
      {sessionState === 'live' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ height: '52px', background: 'rgba(14,20,33,0.95)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF4D6A', animation: 'pulse-mint 1.5s infinite' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FF4D6A', letterSpacing: '0.08em' }}>REC LIVE</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Q {questionCount} · {formatTime(sessionTime)}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '2px 10px', background: 'var(--bg-elevated)', borderRadius: '100px' }}>{targetRole}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '100px', background: 'rgba(77,255,160,0.1)', color: 'var(--accent-primary)', fontWeight: 700 }}>Gemini 2.5 Flash Lite</span>
              <button onClick={endSession} style={{ padding: '6px 14px', background: 'rgba(255,77,106,0.12)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: '6px', color: '#FF4D6A', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                End Session
              </button>
            </div>
          </div>

          {/* Main layout: stacked */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflow: 'hidden' }}>
            {/* Top: Video cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexShrink: 0 }}>
              {/* Alex (AI) */}
              <div style={{
                aspectRatio: '16/9',
                background: 'linear-gradient(135deg, rgba(123,97,255,0.1), rgba(77,255,160,0.05))',
                borderRadius: '16px',
                border: `2px solid ${alexStatus === 'speaking' ? '#7B61FF' : 'rgba(123,97,255,0.2)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: alexStatus === 'speaking' ? `0 0 ${Math.max(...waveData) * 1.5}px rgba(123,97,255,0.6)` : 'none',
                transition: 'box-shadow 0.1s, border-color 0.3s'
              }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', fontWeight: 900, color: '#fff',
                  boxShadow: alexStatus === 'speaking' ? '0 0 40px rgba(123,97,255,0.4)' : 'none',
                  transition: 'transform 0.1s, box-shadow 0.3s',
                  transform: alexStatus === 'speaking' ? `scale(${1 + (Math.max(...waveData) / 200)})` : 'scale(1)'
                }}>A</div>
                <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Alex · AI Interviewer</div>
                <div style={{
                  position: 'absolute', bottom: '12px', right: '16px', fontSize: '11px', padding: '3px 10px', borderRadius: '100px', fontWeight: 700,
                  background: alexStatus === 'speaking' ? 'rgba(123,97,255,0.3)' : alexStatus === 'listening' ? 'rgba(77,255,160,0.2)' : 'rgba(255,181,71,0.2)',
                  color: alexStatus === 'speaking' ? '#7B61FF' : alexStatus === 'listening' ? 'var(--accent-primary)' : '#FFB547'
                }}>
                  {alexStatus === 'speaking' ? '● Speaking' : alexStatus === 'listening' ? '● Listening' : '● Thinking…'}
                </div>
              </div>

              {/* User camera */}
              <div style={{
                aspectRatio: '16/9',
                background: '#0A0F1C',
                borderRadius: '16px',
                border: `2px solid ${isCameraOff ? 'var(--border)' : 'rgba(77,255,160,0.3)'}`,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: (alexStatus === 'listening' && !isMuted) ? `0 0 ${Math.max(...userWaveData) * 1.5}px rgba(77,255,160,0.5)` : 'none',
                transition: 'box-shadow 0.1s, border-color 0.3s'
              }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: isCameraOff ? 'none' : 'block', transform: 'scaleX(-1)' }} />
                {isCameraOff && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>👤</div>
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>You</div>
                {isMuted && <div style={{ position: 'absolute', top: '12px', right: '12px', width: '28px', height: '28px', background: '#FF4D6A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🔇</div>}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={toggleMic}
                style={{ width: '56px', height: '56px', borderRadius: '50%', border: '1px solid', background: isMuted ? 'rgba(255,77,106,0.15)' : 'var(--bg-elevated)', borderColor: isMuted ? 'rgba(255,77,106,0.4)' : 'var(--border)', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {isMuted ? '🔇' : '🎙'}
              </button>
              <button onClick={toggleCamera}
                style={{ width: '56px', height: '56px', borderRadius: '50%', border: '1px solid', background: isCameraOff ? 'rgba(255,77,106,0.15)' : 'var(--bg-elevated)', borderColor: isCameraOff ? 'rgba(255,77,106,0.4)' : 'var(--border)', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {isCameraOff ? '📷' : '📹'}
              </button>
              <button onClick={endSession}
                style={{ padding: '0 36px', height: '56px', borderRadius: '100px', background: '#FF4D6A', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                ⏹ End Interview
              </button>
            </div>

            {/* Bottom: Transcript block */}
            <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Transcript</div>
                <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>{alexStatus === 'speaking' ? 'Alex is speaking...' : alexStatus === 'listening' ? 'Listening to you...' : ''}</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {transcript.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Transcript will appear here as you talk...
                  </div>
                )}
                {transcript.map((msg, i) => (
                  <div key={i} style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: msg.role === 'ai' ? 'rgba(123,97,255,0.06)' : 'rgba(77,255,160,0.04)',
                    borderLeft: `3px solid ${msg.role === 'ai' ? '#7B61FF' : 'var(--accent-primary)'}`,
                    maxWidth: '85%',
                    alignSelf: msg.role === 'ai' ? 'flex-start' : 'flex-end'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: msg.role === 'ai' ? '#7B61FF' : 'var(--accent-primary)', marginBottom: '3px', textTransform: 'uppercase' }}>
                      {msg.role === 'ai' ? 'Alex' : 'You'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{msg.text}</div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE SCREEN */}
      {sessionState === 'complete' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>✅</div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px' }}>Interview Complete!</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '32px' }}>
              Great job! Your interview lasted {formatTime(sessionTime)} and covered {questionCount} questions.
              {sessionId ? ' Your AI report is being generated and will appear in Reports shortly.' : ''}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link href="/reports" className="btn-primary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 28px' }}>View Reports →</Link>
              <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 28px' }}>Dashboard</Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { GoogleGenAI, Modality, StartSensitivity, EndSensitivity } from '@google/genai';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

function buildSystemInstruction(type: InterviewType, role: string, company?: string, round?: string, customTopic?: string): string {
  const typeGuide: Record<InterviewType, string> = {
    conceptual: 'Ask deep conceptual questions. Probe understanding, not just definitions. Ask 8-10 questions, progressively harder.',
    behavioral: 'Use the STAR method. Ask about specific past experiences. Probe for depth on impact and lessons learned.',
    system_design: 'Start with an open-ended design problem. Probe scalability, trade-offs, and failure modes.',
    coding_walkthrough: 'Ask the candidate to walk through their approach to coding problems. Probe for complexity analysis and edge cases.',
  };

  const companyContext = company ? `You are an elite interviewer at ${company}. This is the ${round || 'technical'} round.` : `You are Alex, an expert technical interviewer at a top tech company. This is a ${type.replace('_', ' ')} interview.`;
  const topicContext = customTopic ? `The specific topic or focus area for this interview is: ${customTopic}. Ensure your questions revolve around this topic.` : '';

  return `Your name is Alex. ${companyContext} You are interviewing for the role: ${role}.
${topicContext}

BEHAVIOR:
- Be professional yet personable. Speak concisely — your spoken responses should be 1-3 sentences max.
- ${typeGuide[type]}
- After the candidate answers, give a brief (1 sentence) reaction, then ask the next question.
- If the candidate is off-track, gently redirect.
- Keep track of the conversation flow and build on previous answers.
- You can see and hear the candidate via video/audio. React naturally if you notice they seem confused or confident.
- After 8-10 questions, wrap up the session warmly.

START: Greet the candidate warmly, mention the interview stage${company ? ` at ${company}` : ''}, and ask your first question immediately.`;
}

function LiveInterviewPage() {
  const [interviewType, setInterviewType] = useState<InterviewType>('conceptual');
  const [customTopic, setCustomTopic] = useState('');
  const [targetRole, setTargetRole] = useState('Frontend Engineer');
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [alexStatus, setAlexStatus] = useState<'thinking' | 'speaking' | 'listening'>('listening');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [waveData, setWaveData] = useState<number[]>(Array(40).fill(4));
  const [userWaveData, setUserWaveData] = useState<number[]>(Array(40).fill(4));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs for media / WebSocket
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioOutputRef = useRef<AudioContext | null>(null);
  const mixDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

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
    
    // Connect to the mix destination for recording if it exists
    if (mixDestinationRef.current) {
      source.connect(mixDestinationRef.current);
    }

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
    }, 50);

    return () => clearInterval(interval);
  }, [alexStatus]);

  // Waveform visualization for user audio
  useEffect(() => {
    if (sessionState !== 'live') return;
    const interval = setInterval(() => {
      if (analyserRef.current && !isMuted) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Generate 40 bars for the wave
        const processed = Array.from(dataArray.slice(0, 40)).map(v => Math.max(4, (v / 255) * 60));
        setUserWaveData(processed);
      } else {
        setUserWaveData(Array(40).fill(4));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [sessionState, isMuted]);

  // === CONNECT TO GEMINI LIVE ===
  const connectToGemini = useCallback(async (apiKey: string, systemInstructionText: string) => {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });
    const session = await (ai.live as any).connect({
      model: MODEL,
      config: {
        systemInstruction: { parts: [{ text: systemInstructionText }] },
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
        automaticActivityDetection: {
          startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
          endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
          silenceDurationMs: 600,
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
          if (audioCtxRef.current) {
            // Setup for user audio analyser if needed here
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
              const text = inputTranscription.text;
              setAlexStatus('listening');
              setTranscript(prev => {
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

      // 2. Create session record
      const topicType = searchParams.get('topic') as InterviewType || interviewType;
      const role = searchParams.get('role') || targetRole;
      const company = searchParams.get('company') || undefined;
      const round = searchParams.get('round') || undefined;

      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_type: topicType, role, company, round }),
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
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioContext;

      // Setup user audio analyser for the glowing card
      const source = audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      await audioContext.audioWorklet.addModule('/pcm-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletNode.port.onmessage = (e) => sendAudioChunk(new Int16Array(e.data));
      source.connect(workletNode);
      // Removed connection to destination as this is capture only

      // Crucial: Resume AudioContext after user gesture
      if (audioContext.state === 'suspended') await audioContext.resume();

      // 5. Connect WebSocket to Gemini Live
      await connectToGemini(apiKey, buildSystemInstruction(topicType, role, company, round, customTopic));

      // 5b. Start internal audio recorder for the report
      try {
        if (!audioOutputRef.current) {
          audioOutputRef.current = new AudioContext({ sampleRate: 24000 });
        }
        
        // Ensure context is running
        if (audioOutputRef.current.state === 'suspended') {
          await audioOutputRef.current.resume();
        }

        const mixDest = audioOutputRef.current.createMediaStreamDestination();
        mixDestinationRef.current = mixDest;

        // Connect user's mic to the mix destination (but NOT to ctx.destination to avoid echo)
        const micSourceForMix = audioOutputRef.current.createMediaStreamSource(stream);
        micSourceForMix.connect(mixDest);
        
        // Start recording the mixed stream
        const mediaRecorder = new MediaRecorder(mixDest.stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorder.start(1000); // chunk every 1s
      } catch (err) {
        console.warn('Failed to start MediaRecorder for session audio', err);
      }

      setSessionStartTime(Date.now());

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

  const directStartedRef = useRef(false);

  // Direct start handling
  useEffect(() => {
    const direct = searchParams.get('direct');
    const topic = searchParams.get('topic');
    const role = searchParams.get('role');
    
    if (topic && !directStartedRef.current) setInterviewType(topic as InterviewType);
    if (role && !directStartedRef.current) setTargetRole(role);
    
    if (direct === 'true' && sessionState === 'setup' && !directStartedRef.current) {
      directStartedRef.current = true;
      startSession();
    }
  }, [searchParams, sessionState]);

  // === END SESSION ===
  const endSession = useCallback(async () => {
    // Close WebSocket
    sessionRef.current?.close();
    
    let audioUrl = null;
    // Stop recording and upload
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Wait for the final chunk
      await new Promise<void>(resolve => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
        } else resolve();
      });

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      try {
        const supabase = createClient();
        const fileName = `session_${sessionId}_${Date.now()}.webm`;
        const { error } = await supabase.storage.from('interview_audio').upload(fileName, audioBlob, { contentType: 'audio/webm' });
        
        if (!error) {
          const { data } = supabase.storage.from('interview_audio').getPublicUrl(fileName);
          audioUrl = data.publicUrl;
        } else {
          console.error('Audio upload error:', error);
        }
      } catch (err) {
        console.error('Failed to upload audio:', err);
      }
    }

    // Stop media
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(videoIntervalRef.current);
    clearInterval(timerRef.current);

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => { });
    }
    if (audioOutputRef.current && audioOutputRef.current.state !== 'closed') {
      audioOutputRef.current.close().catch(() => { });
    }

    setSessionState('complete');

    // Generate report if we have a session and enough transcript
    if (sessionId && transcript.length > 2) {
      setIsGeneratingReport(true);
      const fullTranscript = transcript.map(t => {
        const relMs = Math.max(0, t.ts - sessionStartTime);
        const m = Math.floor(relMs / 60000).toString().padStart(2, '0');
        const s = Math.floor((relMs % 60000) / 1000).toString().padStart(2, '0');
        return `[${m}:${s}] ${t.role === 'ai' ? 'Alex' : 'You'}: ${t.text}`;
      }).join('\n\n');
      
      try {
        const res = await fetch('/api/sessions/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            transcript: fullTranscript,
            role: targetRole,
            interview_type: interviewType,
            audio_url: audioUrl,
          }),
        });

        if (res.ok) {
          const { report } = await res.json();
          // If successful, we can redirect or show the link
          toast.success("Report generated successfully!");
          // Optional: automatic redirect after 2s
          setTimeout(() => {
            window.location.href = `/reports/${report.id}`;
          }, 1500);
        }
      } catch (err) {
        console.error("Report error:", err);
        toast.error("Failed to generate report, but your session was saved.");
      } finally {
        setIsGeneratingReport(false);
      }
    }
  }, [sessionId, transcript, targetRole, interviewType, sessionStartTime]);

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
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      if (audioOutputRef.current && audioOutputRef.current.state !== 'closed') {
        audioOutputRef.current.close().catch(() => {});
      }
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
              {/* Interview type selection grid */}
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

              {/* Specific Topic Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Specific Topic / Focus Area</label>
                <input className="input" placeholder="e.g., React context performance, System design for Twitter, handling conflicts" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} style={{ width: '100%', padding: '12px' }} />
              </div>

              {/* Device check */}
              <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📹</span>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>Camera & microphone will be requested when you start. Video helps Alex read your body language and confidence.</div>
              </div>

              <button onClick={startSession} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '16px', padding: '15px' }}>
                🎙 Start Interview
              </button>
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
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Connecting to AI Interviewer…</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Setting up audio/video and WebSocket session</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIVE INTERVIEW ROOM */}
      {sessionState === 'live' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', flexShrink: 0 }}>
            <button onClick={endSession} className="btn-primary" style={{ 
              background: 'rgba(255,77,106,0.1)', 
              color: '#FF4D6A', 
              border: '1px solid rgba(255,77,106,0.2)', 
              padding: '6px 20px', 
              fontSize: '13px', 
              fontWeight: 800 
            }}>
              End Interview
            </button>
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
              Great job! Your interview lasted {formatTime(sessionTime)}.
              {isGeneratingReport ? (
                <span style={{ display: 'block', marginTop: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                  Alex is analyzing your performance and generating a detailed report...
                </span>
              ) : sessionId ? ' Your AI report has been generated and you are being redirected.' : ''}
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

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading AI Studio...</div>}>
      <LiveInterviewPage />
    </Suspense>
  );
}

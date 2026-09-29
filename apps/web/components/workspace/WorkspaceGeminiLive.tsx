'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Radio,
  Send,
  VolumeX,
  X,
  FileText,
  Network,
  Maximize2,
  Minimize2,
  Pencil,
} from 'lucide-react';
import { Button, Card, Badge, Textarea } from '@/components/ui';
import { AudioOrb } from '@/components/interview/AudioOrb';
import { sanitizeDiagram, type Diagram, type LanguageId } from '@/lib/workspace/types';
import { GoogleGenAI } from '@google/genai';
import { cn } from '@/lib/cn';

interface WorkspaceGeminiLiveProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'write' | 'draw';
  title: string;
  language: LanguageId;
  content: string;
  diagram: Diagram;
  onInsertText: (text: string) => void;
  /** Called when AI suggests a new diagram during a Live session (draw mode). */
  onDiagram?: (d: Diagram) => void;
  /** When true, render inline as a column panel (replaces AI chat). When false, render as floating overlay. */
  inlineMode?: boolean;
}

const SAMPLE_RATE = 16000;
const LIVE_MODEL = 'models/gemini-3.8-live';

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

export function WorkspaceGeminiLive({
  isOpen,
  onClose,
  target,
  title,
  language,
  content,
  diagram,
  onInsertText,
  onDiagram,
  inlineMode = false,
}: WorkspaceGeminiLiveProps) {
  const [connecting, setConnecting] = useState(false);
  const [active, setActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [status, setStatus] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  const [waveData, setWaveData] = useState<number[]>(Array(40).fill(4));
  const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'ai'; text: string; ts: number }>>([]);
  const [expanded, setExpanded] = useState(false);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioOutputRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const lastAudioTimeRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Audio Playback
  const playPCMChunk = useCallback((base64PCM: string) => {
    try {
      if (!audioOutputRef.current || audioOutputRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioOutputRef.current = new AudioCtx({ sampleRate: 24000 });
      }
      const ctx = audioOutputRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const binary = atob(base64PCM);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, lastAudioTimeRef.current);
      source.start(startTime);
      lastAudioTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setStatus('speaking');

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setStatus('listening');
        }
      };
    } catch (e) {
      console.error('PCM playback error:', e);
    }
  }, []);

  const stopAudioPlayback = useCallback(() => {
    activeSourcesRef.current.forEach(s => {
      try { s.stop(); } catch { }
    });
    activeSourcesRef.current = [];
    if (audioOutputRef.current) lastAudioTimeRef.current = audioOutputRef.current.currentTime;
    setStatus('listening');
  }, []);

  // Waveform animation
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      if (status === 'speaking') {
        setWaveData(prev =>
          prev.map((_, i) => Math.max(4, 15 + Math.sin(i * 0.7 + Date.now() * 0.01) * 22 + Math.random() * 8))
        );
      } else if (status === 'listening' && !isMuted) {
        setWaveData(prev =>
          prev.map((_, i) => Math.max(4, 6 + Math.sin(i * 0.5 + Date.now() * 0.005) * 5 + Math.random() * 3))
        );
      } else {
        setWaveData(Array(40).fill(4));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [active, status, isMuted]);

  // Connect to Gemini Live session
  const startLive = useCallback(async () => {
    if (active || connecting) return;
    setConnecting(true);

    try {
      // Step 1: Fetch session token or user key
      const tokenRes = await fetch('/api/gemini-session');
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.apiKey) {
        throw new Error(tokenJson.error || 'Please connect your Gemini API key in Settings.');
      }

      // Step 2: Initialize Audio capture
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: SAMPLE_RATE },
      });
      mediaStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptNode;

      // Build context instruction
      const isDoc = target === 'write';
      const promptContext = isDoc
        ? `You are Alex, an expert AI software engineer, tutor, and document copilot in PrepSpace Workspace.
You are collaborating on a document titled "${title || 'Untitled'}" written in ${language}.
The document currently contains:
"""
${content.slice(0, 3000) || '(empty document)'}
"""
Candidate communicates in spoken English. Speak conversationally (1-3 sentences per turn), provide crisp, natural verbal answers, critique logic, suggest edge cases, or review code.`
        : `You are Alex, a Principal Distributed Systems Architect in PrepSpace Workspace.
You are collaborating on an architecture diagram titled "${title || 'System Architecture'}".
Current architecture diagram contains ${diagram.nodes.length} components:
${diagram.nodes.map(n => `- ${n.label} (${n.kind})`).join('\n')}

Speak conversationally (1-3 sentences per turn) about trade-offs, caching, fault tolerance, replication, and service boundaries.

When the user asks you to DRAW, CREATE, or UPDATE the diagram (e.g. "draw a microservices architecture", "add a cache", "show me an event-driven design"):
- Return a JSON code block like this:
\`\`\`json
{"nodes":[{"id":"lb","label":"Load Balancer","kind":"lb"},{"id":"api","label":"API Gateway","kind":"service"}],"edges":[{"from":"lb","to":"api","label":"routes"}]}
\`\`\`
- Valid node kinds: client, service, lb, db, cache, queue, storage, cdn, external, note
- Keep labels concise (1-4 words). Include 6-14 nodes for a complete design.
- The diagram will automatically appear on the canvas.
- After the JSON block, briefly explain the key design decisions.
- For conversational turns that don't involve drawing, just speak naturally without JSON.`;

      const ai = new GoogleGenAI({
        apiKey: tokenJson.apiKey,
        httpOptions: { apiVersion: 'v1beta' },
      });

      const session = await (ai.live as any).connect({
        model: LIVE_MODEL,
        config: {
          systemInstruction: { parts: [{ text: promptContext }] },
          responseModalities: ['audio'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            languageCode: 'en-US',
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setActive(true);
            setConnecting(false);
            toast.success('Connected to Gemini Live');
          },
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
                    const aiText = part.text as string;
                    setTranscript(prev => {
                      const last = prev[prev.length - 1];
                      if (last?.role === 'ai') {
                        return [...prev.slice(0, -1), { ...last, text: last.text + aiText }];
                      }
                      return [...prev, { role: 'ai', text: aiText, ts: Date.now() }];
                    });

                    // If in draw mode, try to extract a diagram from JSON blocks in AI response
                    if (target === 'draw' && onDiagram) {
                      try {
                        const jsonMatch = aiText.match(/```(?:json)?\s*({[\s\S]+?})\s*```|({[\s\S]*?"nodes"[\s\S]*?})/m);
                        if (jsonMatch) {
                          const raw = JSON.parse(jsonMatch[1] || jsonMatch[2]);
                          if (Array.isArray(raw.nodes) && raw.nodes.length >= 2) {
                            const d = sanitizeDiagram(raw);
                            if (d.nodes.length >= 2) {
                              onDiagram(d);
                              toast.success('Alex drew a diagram on the canvas ✏️');
                            }
                          }
                        }
                      } catch { /* not a diagram response */ }
                    }
                  }
                  if (part.inlineData?.data && part.inlineData?.mimeType?.includes('audio')) {
                    playPCMChunk(part.inlineData.data);
                  }
                }
              }
            } catch (err) {
              console.error('Error handling Gemini Live message:', err);
            }
          },
          onerror: (err: any) => {
            console.error('Gemini Live session error:', err);
            toast.error('Gemini Live disconnected');
            stopLive();
          },
          onclose: () => {
            setActive(false);
          },
        },
      });

      sessionRef.current = session;

      // Stream audio to Gemini
      scriptNode.onaudioprocess = e => {
        if (isMutedRef.current || !sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createAudioBlob(inputData);
        try {
          sessionRef.current.sendRealtimeInput([{ mimeType: pcmBlob.mimeType, data: pcmBlob.data }]);
        } catch { /* ignore */ }
      };

      source.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);
    } catch (err: unknown) {
      console.error('Failed to start Gemini Live:', err);
      const msg = err instanceof Error ? err.message : 'Could not connect to Gemini Live';
      toast.error(msg);
      setConnecting(false);
      setActive(false);
    }
  }, [active, connecting, target, title, language, content, diagram, isMuted, playPCMChunk, stopAudioPlayback]);

  // Clean shutdown
  const stopLive = useCallback(() => {
    stopAudioPlayback();
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch { }
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch { }
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (audioOutputRef.current && audioOutputRef.current.state !== 'closed') {
      audioOutputRef.current.close().catch(() => {});
      audioOutputRef.current = null;
    }
    setActive(false);
    setConnecting(false);
    setCameraOn(false);
  }, [stopAudioPlayback]);

  // Camera toggle
  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } } });
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraOn(true);
      } catch (e) {
        toast.error('Camera access denied');
      }
    }
  }, [cameraOn]);

  // Send text message to the live session
  const sendText = useCallback(() => {
    const msg = textInput.trim();
    if (!msg || !sessionRef.current) return;
    try {
      sessionRef.current.sendClientContent({ turns: [{ role: 'user', parts: [{ text: msg }] }] });
      setTranscript(prev => [...prev, { role: 'user', text: msg, ts: Date.now() }]);
      setTextInput('');
    } catch (e) {
      toast.error('Could not send message');
    }
  }, [textInput]);


  useEffect(() => {
    if (!isOpen && active) {
      stopLive();
    }
  }, [isOpen, active, stopLive]);

  if (!isOpen) return null;

  /* ── Inline mode: interview-style panel with camera, transcript, and text input ── */
  if (inlineMode) {
    return (
      <div className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-panel border border-line bg-panel">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-line bg-raised/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full transition-colors', active ? 'bg-live animate-pulse' : 'bg-fg-3')} />
            <span className="text-sm font-semibold text-fg">Gemini Live</span>
            <Badge tone={target === 'write' ? 'signal' : 'violet'} className="text-[10px]">
              {target === 'write' ? <FileText size={10} className="mr-1" /> : <Pencil size={10} className="mr-1" />}
              {target === 'write' ? 'Copilot' : 'Architect'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {/* Camera toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleCamera}
              aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
              className={cn('h-7 w-7', cameraOn ? 'text-live' : 'text-fg-3 hover:text-fg')}
              title={cameraOn ? 'Camera on' : 'Camera off'}
            >
              {cameraOn ? <Camera size={14} /> : <CameraOff size={14} />}
            </Button>
            {/* Mic toggle */}
            {active && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsMuted(m => !m)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className={cn('h-7 w-7', isMuted ? 'text-bad' : 'text-fg-3 hover:text-fg')}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { stopLive(); onClose(); }}
              aria-label="Close Gemini Live"
              className="h-7 w-7 text-fg-3 hover:text-fg"
            >
              <X size={15} />
            </Button>
          </div>
        </div>

        {/* ── Camera feed ── */}
        <div className={cn('relative overflow-hidden bg-black transition-all duration-200', cameraOn ? 'h-44' : 'h-0')}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            aria-label="Your camera"
          />
          {cameraOn && (
            <div className="absolute bottom-1.5 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
              Camera · You
            </div>
          )}
        </div>

        {/* ── Orb + start / end controls ── */}
        <div className="flex items-center gap-3 border-b border-line bg-raised/30 px-3 py-2.5">
          <div className="relative h-14 w-14 shrink-0">
            <AudioOrb status={status} waveData={waveData} className="h-full w-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-fg">
              {connecting ? 'Connecting…' : active ? (status === 'speaking' ? 'Alex is speaking…' : isMuted ? 'Microphone muted' : 'Listening…') : 'Gemini Live'}
            </div>
            <div className="text-[11px] text-fg-3 mt-0.5">
              {active ? 'Speak or type — Alex responds in real time' : 'Start a voice session below'}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!active ? (
              <Button size="sm" onClick={startLive} loading={connecting} className="gap-1.5 text-xs">
                <Radio size={12} aria-hidden /> Start
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={stopAudioPlayback} className="gap-1 text-xs">
                  <VolumeX size={12} /> Interrupt
                </Button>
                <Button size="sm" variant="danger" onClick={stopLive} className="text-xs">
                  End
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Transcript (grows to fill remaining height) ── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {transcript.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-xs text-fg-3 italic">
              {active
                ? 'Say something — or type a message below…'
                : 'Start a session to begin talking with Alex.'}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {transcript.map((t, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg px-3 py-2 leading-relaxed',
                    t.role === 'ai'
                      ? 'bg-signal/10 border border-signal/20 text-fg ml-4'
                      : 'bg-raised border border-line text-fg-2 mr-4'
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-[10px] uppercase tracking-wide text-fg-3">
                      {t.role === 'ai' ? '✦ Alex' : '⬤ You'}
                    </span>
                    {t.role === 'ai' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] px-1.5 text-signal hover:text-signal"
                          onClick={() => { onInsertText(t.text); toast.success('Inserted'); }}
                          title="Insert into document"
                        >
                          <FileText size={9} className="mr-0.5" /> Insert
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">{t.text}</div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* ── Text input bar ── */}
        <div className="border-t border-line bg-raised/50 p-2">
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="Message to Alex"
              rows={2}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={active ? 'Type a message to Alex…' : 'Start a session first, then type or speak'}
              disabled={!active}
              className="min-h-[48px] resize-none text-xs"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
            />
            <Button
              size="icon"
              onClick={sendText}
              disabled={!active || !textInput.trim()}
              aria-label="Send message"
              className="h-9 w-9 shrink-0"
            >
              <Send size={14} />
            </Button>
          </div>
          {target === 'draw' && active && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-fg-3">
              <Pencil size={9} />
              <span>Ask Alex to &quot;draw a microservices architecture&quot; and it will appear on the canvas.</span>
            </div>
          )}
        </div>
      </div>
    );
  }


  /* ── Floating overlay mode (original) ── */
  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
      <Card className="border-line-strong bg-panel shadow-2xl overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-raised/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-live animate-pulse' : 'bg-fg-3')} />
            <span className="text-sm font-semibold text-fg">Gemini Live</span>
            <Badge tone={target === 'write' ? 'signal' : 'violet'}>
              {target === 'write' ? <FileText size={11} className="mr-1" /> : <Network size={11} className="mr-1" />}
              {target === 'write' ? 'Document Copilot' : 'Canvas Architect'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExpanded(e => !e)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              className="h-7 w-7"
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                stopLive();
                onClose();
              }}
              aria-label="Close"
              className="h-7 w-7 text-fg-3 hover:text-fg"
            >
              <X size={15} />
            </Button>
          </div>
        </div>

        {/* Live Audio Visualizer / Orb */}
        <div className="flex flex-col items-center justify-center p-4">
          <div className="h-32 w-32 relative flex items-center justify-center">
            <AudioOrb status={status} waveData={waveData} className="w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[11px] font-medium tracking-wide text-fg-2 uppercase">
                {connecting ? 'Connecting…' : active ? (status === 'speaking' ? 'Alex Speaking' : 'Listening…') : 'Ready'}
              </span>
            </div>
          </div>

          <p className="mt-2 text-center text-xs text-fg-3 max-w-[280px]">
            {active
              ? 'Speak naturally to discuss code, debug errors, or review your system architecture.'
              : 'Press Start to begin a real-time voice session with Gemini Live.'}
          </p>

          {/* Controls */}
          <div className="mt-4 flex items-center gap-2">
            {!active ? (
              <Button onClick={startLive} loading={connecting} className="gap-2">
                <Radio size={15} aria-hidden />
                {connecting ? 'Connecting to Live…' : 'Start Live Session'}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant={isMuted ? 'danger' : 'secondary'}
                  onClick={() => setIsMuted(m => !m)}
                  className="gap-1.5"
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
                <Button size="sm" variant="ghost" onClick={stopAudioPlayback} className="gap-1.5">
                  <VolumeX size={14} /> Interrupt
                </Button>
                <Button size="sm" variant="danger" onClick={stopLive}>
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Live Transcript (expandable) */}
        {expanded && active && (
          <div className="border-t border-line bg-raised/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-fg">Live Conversation</span>
              <span className="text-[11px] text-fg-3">{transcript.length} turns</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
              {transcript.length === 0 ? (
                <div className="text-fg-3 italic py-2 text-center">Spoken transcripts appear here in real-time…</div>
              ) : (
                transcript.map((t, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded p-2 leading-relaxed',
                      t.role === 'ai' ? 'bg-signal/10 text-fg' : 'bg-panel border border-line text-fg-2'
                    )}
                  >
                    <div className="font-semibold text-[10px] uppercase mb-0.5 text-fg-3">
                      {t.role === 'ai' ? 'Alex (Gemini Live)' : 'You'}
                    </div>
                    <div>{t.text}</div>
                    {t.role === 'ai' && (
                      <div className="mt-1.5 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 text-signal hover:text-signal"
                          onClick={() => {
                            onInsertText(t.text);
                            toast.success('Inserted into document');
                          }}
                        >
                          <FileText size={11} className="mr-1" /> Insert into doc
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

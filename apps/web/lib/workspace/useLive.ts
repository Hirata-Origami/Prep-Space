'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, Type, type LiveConnectConfig } from '@google/genai';
import { mergeIntoExisting } from './layout';
import { sanitizeDiagram, NODE_KINDS, type Diagram, type LanguageId } from './types';
import { diagramToText } from './text';

/** Same live model the interview studio uses. */
export const LIVE_MODEL = 'models/gemini-3.8-live';
const IN_RATE = 16000;
const OUT_RATE = 24000;

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'error';

export interface LiveEntry {
  id: number;
  role: 'user' | 'ai' | 'action';
  text: string;
}

/** What the model can see and change. The page owns the real state; this hook reads and writes through it. */
export interface WorkspaceBridge {
  getState: () => { title: string; language: LanguageId; code: string; diagram: Diagram };
  setCode: (code: string) => void;
  setDiagram: (diagram: Diagram) => void;
  /** Runs the code in the editor and resolves with what it printed. Present only when the language can run. */
  runCode?: () => Promise<string>;
  /** Called when the model draws or writes, so the page can switch to the relevant view. */
  onAction?: (kind: 'diagram' | 'code') => void;
}

interface LiveSession {
  sendRealtimeInput: (input: { audio: { data: string; mimeType: string } }) => void;
  sendClientContent: (input: { turns: { role: string; parts: { text: string }[] }[]; turnComplete?: boolean }) => void;
  sendToolResponse: (input: { functionResponses: { id?: string; name?: string; response: Record<string, unknown> }[] }) => void;
  close: () => void;
}

interface ToolCall {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
}

const KIND_IDS = NODE_KINDS.map(k => k.id);

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'draw_diagram',
        description:
          'Draw or change the architecture diagram on the candidate\'s canvas. Call it whenever they ask you to draw, sketch, add, remove or rename something in a diagram. ' +
          'Always send the complete graph you want to see. Existing shapes keep their positions when their ids are reused.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'One short sentence describing what you drew or changed.' },
            nodes: {
              type: Type.ARRAY,
              description: 'Every shape in the diagram. Use short lowercase ids and reuse the ids of shapes already on the canvas.',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING, description: '1 to 4 words naming the technology or role.' },
                  kind: { type: Type.STRING, enum: KIND_IDS, description: 'The shape type.' },
                  group: { type: Type.STRING, description: 'Optional boundary this component sits inside, for example "VPC", "Region us-east" or "Kubernetes cluster". Components with the same group share one dashed box.' },
                },
                required: ['id', 'label', 'kind'],
              },
            },
            edges: {
              type: Type.ARRAY,
              description: 'Arrows between shapes, from caller to callee or in the direction data flows.',
              items: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.STRING },
                  to: { type: Type.STRING },
                  label: { type: Type.STRING, description: 'Optional, only when it adds meaning.' },
                },
                required: ['from', 'to'],
              },
            },
          },
          required: ['nodes', 'edges'],
        },
      },
      {
        name: 'run_code',
        description: 'Run the code that is in the candidate\'s editor and get back what it printed or the error. Only JavaScript, TypeScript, Python and SQL can run. Use it to check your own fix or to see why their code fails, then explain the result briefly.',
      },
      {
        name: 'write_editor',
        description:
          'Put code, SQL or notes into the candidate\'s editor. Use it when they ask you to write, fix or add something. Speak a short summary; do not read the code aloud.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: 'The text to place in the editor.' },
            mode: { type: Type.STRING, enum: ['replace', 'append'], description: 'replace swaps the whole editor, append adds to the end.' },
            summary: { type: Type.STRING, description: 'One short sentence describing the change.' },
          },
          required: ['content', 'mode'],
        },
      },
    ],
  },
];

function encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function pcmBlob(data: Float32Array) {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm' };
}

const systemPrompt = (state: ReturnType<WorkspaceBridge['getState']>) => `Your name is Alex. You are a senior engineer coaching a candidate live while they work in a shared workspace: a code and notes editor plus an architecture diagram canvas.

HOW TO BEHAVE
- Speak in short natural turns, one to three sentences. This is a conversation, not a lecture.
- The candidate speaks English. Ignore background noise, typing and anything that is not clearly addressed to you.
- You can see what they write. Their editor and diagram are sent to you as context messages; treat the latest one as the truth.
- When they ask you to draw, sketch, add, remove or rename anything in the diagram, call draw_diagram with the complete graph, then say in a sentence what you drew.
- When they ask you to write, fix or extend code, SQL or notes, call write_editor, then summarise the change in a sentence. Never read code aloud.
- If they ask a question, answer it. If they describe a design, probe trade-offs the way an interviewer would, but let them lead.
- You can run the candidate's code with run_code (JavaScript, TypeScript, Python and SQL only). Prefer running it to guessing. For other languages, say any predicted output is a prediction.
- Never invent facts about their work.

WHAT IS OPEN NOW
Document: ${state.title || 'Untitled'}
Editor language: ${state.language === 'markdown' ? 'notes' : state.language}
${contextBlock(state)}

Start by greeting them in one short sentence and asking what they want to work on.`;

function contextBlock(state: ReturnType<WorkspaceBridge['getState']>): string {
  const code = state.code.trim();
  const diagram = diagramToText(state.diagram);
  return [
    code ? `Editor contents:\n${code.slice(0, 5000)}` : 'The editor is empty.',
    diagram ? `Diagram (ids in brackets):\n${describeWithIds(state.diagram)}` : 'The diagram is empty.',
  ].join('\n\n');
}

function describeWithIds(d: Diagram): string {
  const label = new Map(d.nodes.map(n => [n.id, n.label]));
  const nodes = d.nodes.map(n => `- [${n.id}] ${n.label} (${n.kind}${n.group ? `, in ${n.group}` : ''})`).join('\n');
  const edges = d.edges.map(e => `- [${e.from}] ${label.get(e.from)} -> [${e.to}] ${label.get(e.to)}${e.label ? ` (${e.label})` : ''}`).join('\n');
  return `${nodes}${edges ? `\nConnections:\n${edges}` : ''}`;
}

/** A live voice and text session with Gemini that can read and change the workspace. */
export function useWorkspaceLive(bridge: WorkspaceBridge) {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LiveEntry[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const bridgeRef = useRef(bridge);
  const sessionRef = useRef<LiveSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextTimeRef = useRef(0);
  const mutedRef = useRef(false);
  const idRef = useRef(1);
  const lastSyncRef = useRef('');
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const activeRef = useRef(false);

  useEffect(() => {
    bridgeRef.current = bridge;
  });

  const addEntry = useCallback((role: LiveEntry['role'], text: string, merge = true) => {
    setEntries(prev => {
      const last = prev[prev.length - 1];
      if (merge && last && last.role === role) return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      return [...prev, { id: idRef.current++, role, text }];
    });
  }, []);

  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch { /* already stopped */ }
    });
    sourcesRef.current = [];
    nextTimeRef.current = outCtxRef.current?.currentTime ?? 0;
    setSpeaking(false);
  }, []);

  const play = useCallback((base64: string) => {
    const ctx = outCtxRef.current;
    if (!ctx) return;
    const bin = atob(base64);
    const n = Math.floor(bin.length / 2);
    if (!n) return;
    const f32 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
      if (v >= 32768) v -= 65536;
      f32[i] = v / 32768;
    }
    const buffer = ctx.createBuffer(1, n, OUT_RATE);
    buffer.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    sourcesRef.current.push(src);
    src.onended = () => {
      sourcesRef.current = sourcesRef.current.filter(s => s !== src);
      if (!sourcesRef.current.length) setSpeaking(false);
    };
    const at = Math.max(ctx.currentTime + 0.02, nextTimeRef.current);
    src.start(at);
    nextTimeRef.current = at + buffer.duration;
    setSpeaking(true);
  }, []);

  const runTool = useCallback(async (call: ToolCall) => {
    const b = bridgeRef.current;
    const args = call.args ?? {};
    let output = 'Done.';
    try {
      if (call.name === 'draw_diagram') {
        const state = b.getState();
        const next = sanitizeDiagram({ nodes: args.nodes, edges: args.edges });
        if (next.nodes.length < 1) throw new Error('No shapes were provided.');
        const merged = mergeIntoExisting(state.diagram, next);
        b.setDiagram(merged);
        b.onAction?.('diagram');
        const summary = typeof args.summary === 'string' && args.summary ? args.summary : `Drew ${merged.nodes.length} shapes`;
        addEntry('action', summary, false);
        output = `The diagram now has ${merged.nodes.length} shapes and ${merged.edges.length} arrows.`;
      } else if (call.name === 'write_editor') {
        const content = typeof args.content === 'string' ? args.content : '';
        if (!content.trim()) throw new Error('Nothing to write.');
        const state = b.getState();
        b.setCode(args.mode === 'append' && state.code.trim() ? `${state.code.trimEnd()}\n\n${content}\n` : content);
        b.onAction?.('code');
        addEntry('action', typeof args.summary === 'string' && args.summary ? args.summary : 'Updated the editor', false);
        output = 'The editor was updated.';
      } else if (call.name === 'run_code') {
        if (!b.runCode) throw new Error('This language cannot be run here. Only JavaScript, TypeScript, Python and SQL can.');
        addEntry('action', 'Ran the code', false);
        output = await b.runCode();
      } else {
        output = 'Unknown tool.';
      }
    } catch (e) {
      output = e instanceof Error ? e.message : 'The change failed.';
    }
    lastSyncRef.current = ''; // the workspace changed under the model, so the next sync must go out
    return { id: call.id, name: call.name, response: { output } };
  }, [addEntry]);

  const teardown = useCallback(() => {
    activeRef.current = false;
    clearTimeout(syncTimer.current);
    try { sessionRef.current?.close(); } catch { /* already closed */ }
    sessionRef.current = null;
    try { procRef.current?.disconnect(); } catch { /* not connected */ }
    procRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    inCtxRef.current?.close().catch(() => {});
    outCtxRef.current?.close().catch(() => {});
    inCtxRef.current = null;
    outCtxRef.current = null;
    analyserRef.current = null;
    sourcesRef.current = [];
    setSpeaking(false);
    setMicLevel(0);
  }, []);

  const stop = useCallback(() => {
    teardown();
    setStatus('idle');
  }, [teardown]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setStatus('connecting');
    setError(null);
    try {
      const res = await fetch('/api/gemini-session');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Add your Gemini API key in Settings to talk to Alex.');
      const apiKey: string | undefined = json.apiKey || json.token || json.key;
      if (!apiKey) throw new Error('Add your Gemini API key in Settings to talk to Alex.');

      const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // both contexts are created inside the click that started the session so browsers let them run
      const out = new AC({ sampleRate: OUT_RATE });
      outCtxRef.current = out;
      await out.resume().catch(() => {});

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: IN_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        throw new Error('Microphone access was blocked. Allow it in the address bar, or use the text box instead.');
      }
      streamRef.current = stream;

      const inCtx = new AC({ sampleRate: IN_RATE });
      inCtxRef.current = inCtx;
      await inCtx.resume().catch(() => {});
      const source = inCtx.createMediaStreamSource(stream);
      const analyser = inCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const proc = inCtx.createScriptProcessor(2048, 1, 1);
      procRef.current = proc;
      proc.onaudioprocess = ev => {
        if (!sessionRef.current || mutedRef.current) return;
        try {
          sessionRef.current.sendRealtimeInput({ audio: pcmBlob(ev.inputBuffer.getChannelData(0)) });
        } catch { /* the socket may be closing */ }
      };
      source.connect(proc);
      proc.connect(inCtx.destination);

      const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
      const state = bridgeRef.current.getState();
      const session = (await (ai.live as unknown as { connect: (p: unknown) => Promise<LiveSession> }).connect({
        model: LIVE_MODEL,
        config: {
          systemInstruction: { parts: [{ text: systemPrompt(state) }] },
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, languageCode: 'en-US' },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: TOOLS as unknown as LiveConnectConfig['tools'],
        } as LiveConnectConfig,
        callbacks: {
          onopen: () => {},
          onmessage: (msg: {
            serverContent?: {
              interrupted?: boolean;
              turnComplete?: boolean;
              modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
              inputTranscription?: { text?: string };
              outputTranscription?: { text?: string };
            };
            toolCall?: { functionCalls?: ToolCall[] };
          }) => {
            try {
              const sc = msg.serverContent;
              if (sc) {
                if (sc.interrupted) stopPlayback();
                for (const p of sc.modelTurn?.parts ?? []) if (p.inlineData?.data) play(p.inlineData.data);
                if (sc.inputTranscription?.text) addEntry('user', sc.inputTranscription.text);
                if (sc.outputTranscription?.text) addEntry('ai', sc.outputTranscription.text);
              }
              const calls = msg.toolCall?.functionCalls;
              if (calls?.length) {
                void Promise.all(calls.map(runTool)).then(functionResponses => sessionRef.current?.sendToolResponse({ functionResponses }));
              }
            } catch (e) {
              console.error('Live message error', e);
            }
          },
          onerror: () => {
            setError('The connection dropped. Check your Gemini key in Settings and try again.');
            setStatus('error');
            teardown();
          },
          onclose: () => {
            if (activeRef.current) {
              setStatus('idle');
              teardown();
            }
          },
        },
      })) as LiveSession;

      sessionRef.current = session;
      lastSyncRef.current = `${state.code}|${JSON.stringify(state.diagram)}`;
      session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'I have joined. Please greet me.' }] }], turnComplete: true });
      setStatus('live');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start the live session.';
      teardown();
      setError(message);
      setStatus('error');
    }
  }, [addEntry, play, runTool, stopPlayback, teardown]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !mutedRef.current; });
  }, []);

  /** A typed message. It shows in the transcript and the model answers by voice. */
  const sendText = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean || !sessionRef.current) return false;
    stopPlayback();
    addEntry('user', clean, false);
    sessionRef.current.sendClientContent({ turns: [{ role: 'user', parts: [{ text: clean }] }], turnComplete: true });
    return true;
  }, [addEntry, stopPlayback]);

  /**
   * Tells the model what the candidate has written or drawn since the last message. Sent without
   * asking for a reply, so it only updates what Alex can see.
   */
  const syncContext = useCallback(() => {
    if (!sessionRef.current) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const state = bridgeRef.current.getState();
      const signature = `${state.code}|${JSON.stringify(state.diagram)}`;
      if (!sessionRef.current || signature === lastSyncRef.current) return;
      lastSyncRef.current = signature;
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: `[Workspace update. Do not reply to this message.]\n${contextBlock(state)}` }] }],
        turnComplete: false,
      });
    }, 2500);
  }, []);

  // mic level for the meter
  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => {
      const a = analyserRef.current;
      if (!a || mutedRef.current) return setMicLevel(0);
      const data = new Uint8Array(a.frequencyBinCount);
      a.getByteFrequencyData(data);
      setMicLevel(Math.min(1, data.reduce((s, v) => s + v, 0) / data.length / 90));
    }, 80);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => () => teardown(), [teardown]);

  return { status, error, entries, speaking, muted, micLevel, start, stop, toggleMute, sendText, syncContext };
}

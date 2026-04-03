'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

export default function PeerSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState(false);
  
  // Chat state
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const startTranscription = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Web Speech API is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(prev => (prev + ' ' + final).trim() + interim);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech error:', event.error);
    };
    
    recognition.onend = () => {
      if (recording) recognition.start(); // Auto-restart
    };

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
    toast.success('Live transcription enabled.');
  };

  const stopTranscription = () => {
    setRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const askCopilot = async () => {
    if (!query.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    const currentQuery = query;
    setQuery('');
    setDrawerOpen(true);
    setIsLoading(true);

    try {
      // Send the last ~2000 chars of transcript context
      const contextTranscript = transcript.slice(-2000);
      const res = await fetch('/api/coach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuery, transcript: contextTranscript })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get help');
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to CoPilot.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      
      {/* LEFT: JISTI MEET */}
      <motion.div 
        animate={{ width: drawerOpen ? '75%' : '100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ height: '100%', position: 'relative' }}
      >
        <iframe
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          src={`https://meet.jit.si/${sessionId}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
        
        {/* Invisible hit-box to trigger drawer opening when hovering right edge */}
        {!drawerOpen && (
          <div 
            onMouseEnter={() => setDrawerOpen(true)}
            style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '100%', cursor: 'e-resize', background: 'linear-gradient(to right, transparent, rgba(77,255,160,0.1))' }}
          />
        )}
      </motion.div>

      {/* RIGHT: AI COPILOT */}
      <motion.div
        animate={{ width: drawerOpen ? '25%' : '0%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🤖 AI Co-Pilot</h2>
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
           <h3 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Microphone Capture</h3>
           {recording ? (
             <button onClick={stopTranscription} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: '#FF4D6A', color: '#FF4D6A' }}>
               ⏹ Stop Listening
             </button>
           ) : (
             <button onClick={startTranscription} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
               🎙 Start Listening
             </button>
           )}
           <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', padding: '8px', background: 'var(--bg-elevated)', borderRadius: '6px', height: '60px', overflowY: 'auto' }}>
              {transcript || 'No transcript generated yet...'}
           </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && (
             <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '40px' }}>
               Ask me for help, hints, or to resolve a logic dispute with your peer. I'll read the live transcript context!
             </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', background: m.role === 'user' ? 'rgba(77,255,160,0.1)' : 'var(--bg-elevated)', border: m.role === 'user' ? '1px solid rgba(77,255,160,0.2)' : '1px solid var(--border)', padding: '10px 14px', borderRadius: '10px', color: m.role === 'user' ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: '13px', lineHeight: 1.5 }}>
              {m.text}
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Gathering context...
            </div>
          )}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && askCopilot()}
              className="input" 
              placeholder="Ask for a hint..." 
              style={{ flex: 1, padding: '10px' }} 
            />
            <button onClick={askCopilot} className="btn-primary" style={{ padding: '10px', minWidth: '40px', justifyContent: 'center' }}>
              ↗
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

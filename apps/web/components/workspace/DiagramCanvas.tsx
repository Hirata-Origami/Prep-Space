'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cable, Download, LayoutTemplate, Maximize2, MousePointer2, Pencil, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Dropdown, DropdownContent, DropdownItem, DropdownTrigger, Tooltip } from '@/components/ui';
import { autoLayout, bounds } from '@/lib/workspace/layout';
import { DEFAULT_SIZE, NODE_KINDS, type DEdge, type DNode, type Diagram, type NodeKind } from '@/lib/workspace/types';
import { cn } from '@/lib/cn';

type Tool = 'select' | 'connect' | 'pen';
type Selection = { type: 'node' | 'edge' | 'stroke'; id: string } | null;

interface View {
  x: number;
  y: number;
  k: number;
}

interface DiagramCanvasProps {
  diagram: Diagram;
  onChange: (next: Diagram) => void;
  readOnly?: boolean;
}

const KIND_COLOR: Record<NodeKind, string> = {
  client: 'var(--accent-cyan)',
  lb: 'var(--accent-violet)',
  service: 'var(--accent-primary)',
  db: 'var(--accent-green)',
  cache: 'var(--accent-amber)',
  queue: 'var(--accent-violet)',
  storage: 'var(--accent-green)',
  cdn: 'var(--accent-cyan)',
  external: 'var(--text-muted)',
  note: 'var(--accent-amber)',
};

const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;

/** Point where the line from a node's centre towards (tx, ty) leaves its rectangle. */
function anchor(n: DNode, tx: number, ty: number) {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min(n.w / 2 / Math.abs(dx || 1e-6), n.h / 2 / Math.abs(dy || 1e-6));
  return { x: cx + dx * s, y: cy + dy * s };
}

function edgeGeometry(e: DEdge, byId: Map<string, DNode>) {
  const a = byId.get(e.from);
  const b = byId.get(e.to);
  if (!a || !b) return null;
  const p1 = anchor(a, b.x + b.w / 2, b.y + b.h / 2);
  const p2 = anchor(b, a.x + a.w / 2, a.y + a.h / 2);
  return { p1, p2, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
}

function NodeShape({ n, selected, pending }: { n: DNode; selected: boolean; pending: boolean }) {
  const color = KIND_COLOR[n.kind];
  const stroke = selected || pending ? 'var(--accent-primary)' : color;
  const common = { stroke, strokeWidth: selected || pending ? 2.5 : 1.5, fill: 'var(--bg-surface)' };
  const fillTint = <rect x={0} y={0} width={n.w} height={n.h} rx={10} fill={color} opacity={0.1} />;

  let shape: React.ReactNode;
  if (n.kind === 'db') {
    const r = 9;
    shape = (
      <>
        <path d={`M0 ${r} v${n.h - 2 * r} a${n.w / 2} ${r} 0 0 0 ${n.w} 0 v${-(n.h - 2 * r)}`} {...common} />
        <ellipse cx={n.w / 2} cy={r} rx={n.w / 2} ry={r} {...common} />
        <path d={`M0 ${r} v${n.h - 2 * r} a${n.w / 2} ${r} 0 0 0 ${n.w} 0 v${-(n.h - 2 * r)}`} fill={color} opacity={0.1} stroke="none" />
      </>
    );
  } else if (n.kind === 'queue') {
    shape = (
      <>
        <rect width={n.w} height={n.h} rx={n.h / 2} {...common} />
        <rect width={n.w} height={n.h} rx={n.h / 2} fill={color} opacity={0.1} />
        {[0.3, 0.42, 0.54].map(f => <line key={f} x1={n.w * f} x2={n.w * f} y1={n.h * 0.28} y2={n.h * 0.72} stroke={color} opacity={0.45} />)}
      </>
    );
  } else if (n.kind === 'cache') {
    shape = (
      <>
        <rect width={n.w} height={n.h} rx={10} {...common} strokeDasharray="6 4" />
        {fillTint}
      </>
    );
  } else if (n.kind === 'lb') {
    const p = `${n.w / 2},0 ${n.w},${n.h / 2} ${n.w / 2},${n.h} 0,${n.h / 2}`;
    shape = (
      <>
        <polygon points={p} {...common} />
        <polygon points={p} fill={color} opacity={0.1} />
      </>
    );
  } else if (n.kind === 'note') {
    shape = <rect width={n.w} height={n.h} rx={4} fill="var(--accent-amber-dim)" stroke={stroke} strokeDasharray="3 3" strokeWidth={selected ? 2.5 : 1} />;
  } else if (n.kind === 'cdn' || n.kind === 'client') {
    shape = (
      <>
        <rect width={n.w} height={n.h} rx={n.kind === 'client' ? 6 : n.h / 2} {...common} />
        <rect width={n.w} height={n.h} rx={n.kind === 'client' ? 6 : n.h / 2} fill={color} opacity={0.1} />
      </>
    );
  } else {
    shape = (
      <>
        <rect width={n.w} height={n.h} rx={10} {...common} strokeDasharray={n.kind === 'external' ? '2 4' : undefined} />
        {fillTint}
      </>
    );
  }

  // wrap long labels onto up to 3 lines
  const words = n.label.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  const max = Math.max(8, Math.floor(n.w / 7.2));
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 3);
  const lh = 15;
  return (
    <g>
      {shape}
      <text x={n.w / 2} y={n.h / 2 - ((shown.length - 1) * lh) / 2} textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize={13} fontWeight={500} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {shown.map((l, i) => <tspan key={i} x={n.w / 2} dy={i === 0 ? 0 : lh}>{l}</tspan>)}
      </text>
    </g>
  );
}

function IconBtn({ label, onClick, disabled, active, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
        className={cn('flex h-8 w-8 items-center justify-center rounded-control transition-colors disabled:opacity-40', active ? 'bg-signal text-[var(--text-on-accent)]' : 'text-fg-2 hover:bg-raised')}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function DiagramCanvas({ diagram, onChange, readOnly = false }: DiagramCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [selected, setSelected] = useState<Selection>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [draft, setDraft] = useState<[number, number][] | null>(null);
  const [editing, setEditing] = useState<{ type: 'node' | 'edge'; id: string; value: string } | null>(null);
  const history = useRef<Diagram[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const drag = useRef<
    | { type: 'node'; id: string; dx: number; dy: number; moved: boolean }
    | { type: 'pan'; sx: number; sy: number; vx: number; vy: number }
    | { type: 'pen' }
    | null
  >(null);
  const fitted = useRef(false);

  const byId = new Map(diagram.nodes.map(n => [n.id, n]));

  const commit = useCallback(
    (next: Diagram) => {
      history.current.push(diagram);
      if (history.current.length > 50) history.current.shift();
      setCanUndo(true);
      onChange(next);
    },
    [diagram, onChange]
  );

  const undo = () => {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (prev) {
      onChange(prev);
      setSelected(null);
    }
  };

  const toWorld = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.k, y: (clientY - r.top - view.y) / view.k };
  };

  const fit = useCallback(
    (d: Diagram = diagram) => {
      const el = wrapRef.current;
      if (!el) return;
      const b = bounds(d);
      const k = Math.min(1.4, Math.max(0.2, Math.min(el.clientWidth / b.w, el.clientHeight / b.h)));
      setView({ k, x: (el.clientWidth - b.w * k) / 2 - b.x * k, y: (el.clientHeight - b.h * k) / 2 - b.y * k });
    },
    [diagram]
  );

  // fit once when a document with content first appears
  useEffect(() => {
    if (!fitted.current && (diagram.nodes.length || diagram.strokes.length)) {
      fitted.current = true;
      fit();
    }
  }, [diagram, fit]);

  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const px = cx ?? el.clientWidth / 2;
    const py = cy ?? el.clientHeight / 2;
    setView(v => {
      const k = Math.min(3, Math.max(0.2, v.k * factor));
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      return { k, x: px - wx * k, y: py - wy * k };
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) {
      setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      return;
    }
    const r = svgRef.current!.getBoundingClientRect();
    zoomBy(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - r.left, e.clientY - r.top);
  };

  const addNode = (kind: NodeKind) => {
    const el = wrapRef.current;
    const size = DEFAULT_SIZE[kind];
    const cx = el ? (el.clientWidth / 2 - view.x) / view.k : 200;
    const cy = el ? (el.clientHeight / 2 - view.y) / view.k : 150;
    const stagger = (diagram.nodes.length % 5) * 22 - 44;
    const label = NODE_KINDS.find(k => k.id === kind)!.label;
    const node: DNode = { id: uid('n'), label, kind, x: Math.round(cx - size.w / 2 + stagger), y: Math.round(cy - size.h / 2 + stagger), ...size };
    commit({ ...diagram, nodes: [...diagram.nodes, node] });
    setSelected({ type: 'node', id: node.id });
    setEditing({ type: 'node', id: node.id, value: label });
  };

  const removeSelected = useCallback(() => {
    if (!selected || readOnly) return;
    if (selected.type === 'node') commit({ ...diagram, nodes: diagram.nodes.filter(n => n.id !== selected.id), edges: diagram.edges.filter(e => e.from !== selected.id && e.to !== selected.id) });
    else if (selected.type === 'edge') commit({ ...diagram, edges: diagram.edges.filter(e => e.id !== selected.id) });
    else commit({ ...diagram, strokes: diagram.strokes.filter(s => s.id !== selected.id) });
    setSelected(null);
  }, [selected, readOnly, commit, diagram]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    else if (e.key === 'Escape') { setConnectFrom(null); setSelected(null); setTool('select'); }
  };

  const onNodeDown = (e: React.PointerEvent, n: DNode) => {
    e.stopPropagation();
    if (readOnly) return;
    if (tool === 'connect') {
      if (!connectFrom) setConnectFrom(n.id);
      else if (connectFrom !== n.id) {
        if (!diagram.edges.some(x => x.from === connectFrom && x.to === n.id)) {
          const edge: DEdge = { id: uid('e'), from: connectFrom, to: n.id };
          commit({ ...diagram, edges: [...diagram.edges, edge] });
          setSelected({ type: 'edge', id: edge.id });
        }
        setConnectFrom(null);
      }
      return;
    }
    if (tool !== 'select') return;
    setSelected({ type: 'node', id: n.id });
    const w = toWorld(e.clientX, e.clientY);
    drag.current = { type: 'node', id: n.id, dx: w.x - n.x, dy: w.y - n.y, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    wrapRef.current?.focus();
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    wrapRef.current?.focus();
    if (tool === 'pen' && !readOnly) {
      const w = toWorld(e.clientX, e.clientY);
      drag.current = { type: 'pen' };
      setDraft([[Math.round(w.x), Math.round(w.y)]]);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    setSelected(null);
    setConnectFrom(null);
    drag.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.type === 'pan') setView(v => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }));
    else if (d.type === 'pen') {
      const w = toWorld(e.clientX, e.clientY);
      setDraft(p => (p ? [...p, [Math.round(w.x), Math.round(w.y)]] : p));
    } else {
      const w = toWorld(e.clientX, e.clientY);
      if (!d.moved) {
        history.current.push(diagram);
        setCanUndo(true);
        d.moved = true;
      }
      onChange({ ...diagram, nodes: diagram.nodes.map(n => (n.id === d.id ? { ...n, x: Math.round(w.x - d.dx), y: Math.round(w.y - d.dy) } : n)) });
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.type === 'pen' && draft && draft.length > 1) {
      commit({ ...diagram, strokes: [...diagram.strokes, { id: uid('s'), points: draft }] });
    }
    setDraft(null);
  };

  const startEdit = (type: 'node' | 'edge', id: string) => {
    if (readOnly) return;
    const value = type === 'node' ? byId.get(id)?.label ?? '' : diagram.edges.find(e => e.id === id)?.label ?? '';
    setEditing({ type, id, value });
  };

  const finishEdit = () => {
    if (!editing) return;
    const value = editing.value.trim();
    if (editing.type === 'node') commit({ ...diagram, nodes: diagram.nodes.map(n => (n.id === editing.id ? { ...n, label: value || n.label } : n)) });
    else commit({ ...diagram, edges: diagram.edges.map(e => (e.id === editing.id ? { ...e, label: value || undefined } : e)) });
    setEditing(null);
  };

  /* ── export ── */
  const buildSvg = (): { svg: string; w: number; h: number } => {
    const css = getComputedStyle(document.documentElement);
    const token = (v: string) => css.getPropertyValue(v.replace(/var\((--[\w-]+)\)/, '$1')).trim() || '#888';
    const b = bounds(diagram);
    const el = svgRef.current!;
    const clone = el.querySelector('g[data-scene]')!.cloneNode(true) as SVGGElement;
    clone.removeAttribute('transform');
    clone.querySelectorAll('[data-ui]').forEach(n => n.remove());
    let markup = clone.outerHTML.replace(/var\((--[\w-]+)\)/g, (_m, name) => token(name));
    markup = markup.replace(/ style="[^"]*"/g, '');
    const bg = token('--bg-base');
    const font = 'system-ui, -apple-system, Segoe UI, sans-serif';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" font-family="${font}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${bg}"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${token('--text-muted')}"/></marker></defs>${markup}</svg>`;
    return { svg, w: b.w, h: b.h };
  };

  const download = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const exportSvg = () => download(new Blob([buildSvg().svg], { type: 'image/svg+xml' }), 'diagram.svg');

  const exportPng = () => {
    const { svg, w, h } = buildSvg();
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const c = document.createElement('canvas');
      c.width = w * scale;
      c.height = h * scale;
      const ctx = c.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob(blob => blob && download(blob, 'diagram.png'));
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const editingBox = (() => {
    if (!editing) return null;
    if (editing.type === 'node') {
      const n = byId.get(editing.id);
      return n ? { x: n.x * view.k + view.x, y: n.y * view.k + view.y, w: n.w * view.k, h: n.h * view.k } : null;
    }
    const e = diagram.edges.find(x => x.id === editing.id);
    const g = e && edgeGeometry(e, byId);
    return g ? { x: g.mid.x * view.k + view.x - 60, y: g.mid.y * view.k + view.y - 14, w: 120, h: 28 } : null;
  })();

  const empty = !diagram.nodes.length && !diagram.strokes.length && !draft;

  return (
    <div className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-panel border border-line bg-panel">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
          <IconBtn label="Select and move" active={tool === 'select'} onClick={() => { setTool('select'); setConnectFrom(null); }}><MousePointer2 size={15} aria-hidden /></IconBtn>
          <IconBtn label="Connect two shapes" active={tool === 'connect'} onClick={() => { setTool('connect'); setConnectFrom(null); }}><Cable size={15} aria-hidden /></IconBtn>
          <IconBtn label="Freehand pen" active={tool === 'pen'} onClick={() => { setTool('pen'); setConnectFrom(null); }}><Pencil size={15} aria-hidden /></IconBtn>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <Dropdown>
            <DropdownTrigger asChild>
              <Button size="sm" variant="secondary">Add shape</Button>
            </DropdownTrigger>
            <DropdownContent align="start">
              {NODE_KINDS.map(k => <DropdownItem key={k.id} onSelect={() => addNode(k.id)}>{k.label}</DropdownItem>)}
            </DropdownContent>
          </Dropdown>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <IconBtn label="Undo" onClick={undo} disabled={!canUndo}><Undo2 size={15} aria-hidden /></IconBtn>
          <IconBtn label="Tidy layout" onClick={() => commit(autoLayout(diagram))} disabled={!diagram.nodes.length}><LayoutTemplate size={15} aria-hidden /></IconBtn>
          <IconBtn label="Delete selected" onClick={removeSelected} disabled={!selected}><Trash2 size={15} aria-hidden /></IconBtn>
          <span className="ml-auto flex items-center gap-1">
            <IconBtn label="Zoom out" onClick={() => zoomBy(0.85)}><ZoomOut size={15} aria-hidden /></IconBtn>
            <span className="w-10 text-center font-mono text-xs text-fg-3">{Math.round(view.k * 100)}%</span>
            <IconBtn label="Zoom in" onClick={() => zoomBy(1.15)}><ZoomIn size={15} aria-hidden /></IconBtn>
            <IconBtn label="Fit to screen" onClick={() => fit()}><Maximize2 size={15} aria-hidden /></IconBtn>
            <Dropdown>
              <DropdownTrigger asChild>
                <Button size="sm" variant="ghost" disabled={empty}><Download size={14} aria-hidden /> Export</Button>
              </DropdownTrigger>
              <DropdownContent align="end">
                <DropdownItem onSelect={exportSvg}>SVG image</DropdownItem>
                <DropdownItem onSelect={exportPng}>PNG image</DropdownItem>
              </DropdownContent>
            </Dropdown>
          </span>
        </div>
      )}

      <div
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        className={cn('relative min-h-0 flex-1 touch-none overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-signal/50', tool === 'pen' ? 'cursor-crosshair' : tool === 'connect' ? 'cursor-alias' : 'cursor-grab')}
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: `${24 * view.k}px ${24 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      >
        <svg ref={svgRef} className="absolute inset-0 h-full w-full" onPointerDown={onBackgroundDown} onPointerMove={onMove} onPointerUp={onUp} role="img" aria-label="System diagram">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--text-muted)" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--accent-primary)" />
            </marker>
          </defs>
          <g data-scene transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {diagram.strokes.map(s => {
              const on = selected?.type === 'stroke' && selected.id === s.id;
              const d = `M${s.points.map(p => p.join(' ')).join(' L')}`;
              return (
                <g key={s.id}>
                  <path d={d} fill="none" stroke={on ? 'var(--accent-primary)' : 'var(--accent-amber)'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  <path data-ui d={d} fill="none" stroke="transparent" strokeWidth={14} onPointerDown={e => { e.stopPropagation(); if (tool === 'select' && !readOnly) setSelected({ type: 'stroke', id: s.id }); }} />
                </g>
              );
            })}
            {draft && <path d={`M${draft.map(p => p.join(' ')).join(' L')}`} fill="none" stroke="var(--accent-amber)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}

            {diagram.edges.map(e => {
              const g = edgeGeometry(e, byId);
              if (!g) return null;
              const on = selected?.type === 'edge' && selected.id === e.id;
              return (
                <g key={e.id}>
                  <line x1={g.p1.x} y1={g.p1.y} x2={g.p2.x} y2={g.p2.y} stroke={on ? 'var(--accent-primary)' : 'var(--text-muted)'} strokeWidth={on ? 2.5 : 1.6} markerEnd={on ? 'url(#arrow-active)' : 'url(#arrow)'} />
                  <line data-ui x1={g.p1.x} y1={g.p1.y} x2={g.p2.x} y2={g.p2.y} stroke="transparent" strokeWidth={14} onPointerDown={ev => { ev.stopPropagation(); if (!readOnly && tool === 'select') setSelected({ type: 'edge', id: e.id }); }} onDoubleClick={() => startEdit('edge', e.id)} />
                  {e.label && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={g.mid.x - e.label.length * 3.4 - 6} y={g.mid.y - 10} width={e.label.length * 6.8 + 12} height={20} rx={5} fill="var(--bg-base)" opacity={0.92} />
                      <text x={g.mid.x} y={g.mid.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="var(--text-secondary)">{e.label}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {diagram.nodes.map(n => (
              <g key={n.id} transform={`translate(${n.x} ${n.y})`} onPointerDown={ev => onNodeDown(ev, n)} onDoubleClick={() => startEdit('node', n.id)} className={readOnly ? undefined : tool === 'select' ? 'cursor-move' : 'cursor-pointer'}>
                <NodeShape n={n} selected={selected?.type === 'node' && selected.id === n.id} pending={connectFrom === n.id} />
              </g>
            ))}
          </g>
        </svg>

        {editing && editingBox && (
          <input
            autoFocus
            onFocus={e => e.currentTarget.select()}
            aria-label={editing.type === 'node' ? 'Shape label' : 'Arrow label'}
            value={editing.value}
            onChange={e => setEditing({ ...editing, value: e.target.value })}
            onBlur={finishEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') finishEdit();
              if (e.key === 'Escape') setEditing(null);
              e.stopPropagation();
            }}
            style={{ left: editingBox.x, top: editingBox.y, width: Math.max(editingBox.w, 110), height: Math.max(editingBox.h, 30) }}
            className="absolute z-10 rounded-control border border-signal bg-panel px-2 text-center text-sm text-fg outline-none"
          />
        )}

        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="max-w-xs">
              <p className="text-sm font-medium text-fg-2">Blank canvas</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-3">Add shapes yourself, or describe the system to the AI on the right and it will draw it.</p>
            </div>
          </div>
        )}
        {connectFrom && <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-fg-2">Pick the shape this arrow points to. Esc cancels.</div>}
      </div>
    </div>
  );
}

import type { DEdge, DNode, Diagram } from './types';

const GAP_X = 90;
const GAP_Y = 36;

/** Longest-path layering with cycles broken, so any graph the model returns can be placed. */
function layers(nodes: DNode[], edges: DEdge[]): Map<string, number> {
  const out = new Map<string, string[]>();
  nodes.forEach(n => out.set(n.id, []));
  edges.forEach(e => out.get(e.from)?.push(e.to));

  // keep only forward edges: a DFS back edge closes a cycle and is ignored for layering
  const state = new Map<string, 1 | 2>();
  const forward = new Map<string, string[]>();
  nodes.forEach(n => forward.set(n.id, []));
  const visit = (id: string) => {
    state.set(id, 1);
    for (const to of out.get(id) ?? []) {
      if (state.get(to) === 1) continue;
      forward.get(id)!.push(to);
      if (!state.get(to)) visit(to);
    }
    state.set(id, 2);
  };
  const hasIncoming = new Set(edges.map(e => e.to));
  nodes.filter(n => !hasIncoming.has(n.id)).forEach(n => !state.get(n.id) && visit(n.id));
  nodes.forEach(n => !state.get(n.id) && visit(n.id));

  const layer = new Map<string, number>();
  nodes.forEach(n => layer.set(n.id, 0));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const [from, tos] of forward) {
      for (const to of tos) {
        if ((layer.get(to) ?? 0) < (layer.get(from) ?? 0) + 1) {
          layer.set(to, (layer.get(from) ?? 0) + 1);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return layer;
}

/** Left-to-right layered layout. Returns nodes with x/y assigned; keeps sizes. */
export function autoLayout(diagram: Diagram): Diagram {
  const { nodes, edges } = diagram;
  if (!nodes.length) return diagram;
  const layer = layers(nodes, edges);
  const columns: DNode[][] = [];
  nodes.forEach(n => {
    const l = layer.get(n.id) ?? 0;
    (columns[l] ??= []).push(n);
  });

  const pos = new Map<string, { x: number; y: number }>();
  const centerY = new Map<string, number>();
  let x = 40;
  columns.forEach((col, ci) => {
    if (!col) return;
    // order by the average height of already placed neighbours to cut crossings
    const score = (n: DNode) => {
      const ys = edges.filter(e => e.to === n.id && centerY.has(e.from)).map(e => centerY.get(e.from)!);
      return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : Number.POSITIVE_INFINITY;
    };
    const ordered = ci === 0 ? col : [...col].sort((a, b) => score(a) - score(b));
    const colW = Math.max(...ordered.map(n => n.w));
    let y = 40;
    ordered.forEach(n => {
      pos.set(n.id, { x: x + (colW - n.w) / 2, y });
      centerY.set(n.id, y + n.h / 2);
      y += n.h + GAP_Y;
    });
    x += colW + GAP_X;
  });

  // centre every column vertically
  const heights = columns.map(col => (col ? col.reduce((s, n) => s + n.h, 0) + GAP_Y * (col.length - 1) : 0));
  const maxH = Math.max(...heights);
  columns.forEach((col, ci) => {
    if (!col) return;
    const shift = (maxH - heights[ci]) / 2;
    col.forEach(n => {
      const p = pos.get(n.id)!;
      pos.set(n.id, { x: p.x, y: p.y + shift });
    });
  });

  return { ...diagram, nodes: nodes.map(n => ({ ...n, x: Math.round(pos.get(n.id)!.x), y: Math.round(pos.get(n.id)!.y) })) };
}

const overlaps = (a: DNode, b: DNode) => a.x < b.x + b.w + 20 && b.x < a.x + a.w + 20 && a.y < b.y + b.h + 16 && b.y < a.y + a.h + 16;

/**
 * Merges a model-edited diagram into what the user has. Existing nodes keep their positions;
 * new ones are placed beside the nodes they connect to, then nudged clear of anything overlapping.
 */
export function mergeIntoExisting(existing: Diagram, next: Diagram): Diagram {
  if (!existing.nodes.length) return { ...autoLayout(next), strokes: existing.strokes };
  const laidOut = autoLayout(next);
  const old = new Map(existing.nodes.map(n => [n.id, n]));
  const placed: DNode[] = [];

  for (const n of laidOut.nodes) {
    const prev = old.get(n.id);
    if (prev) placed.push({ ...prev, label: n.label, kind: n.kind });
  }
  for (const n of laidOut.nodes.filter(n => !old.has(n.id))) {
    const neighbours = laidOut.edges
      .flatMap(e => (e.to === n.id ? [e.from] : e.from === n.id ? [e.to] : []))
      .map(id => placed.find(p => p.id === id))
      .filter((p): p is DNode => !!p);
    let x: number;
    let y: number;
    if (neighbours.length) {
      const incoming = laidOut.edges.some(e => e.to === n.id);
      x = incoming ? Math.max(...neighbours.map(p => p.x + p.w)) + GAP_X : Math.min(...neighbours.map(p => p.x)) - GAP_X - n.w;
      y = neighbours.reduce((s, p) => s + p.y, 0) / neighbours.length;
    } else {
      x = Math.max(0, ...placed.map(p => p.x + p.w)) + GAP_X;
      y = 40;
    }
    const node: DNode = { ...n, x: Math.round(x), y: Math.round(y) };
    for (let i = 0; i < 40 && placed.some(p => overlaps(node, p)); i++) node.y += node.h + GAP_Y;
    placed.push(node);
  }
  const order = new Map(laidOut.nodes.map((n, i) => [n.id, i]));
  placed.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { nodes: placed, edges: laidOut.edges, strokes: existing.strokes };
}

/** Bounding box of a diagram, with padding. */
export function bounds(d: Diagram, pad = 40) {
  const xs: number[] = [];
  const ys: number[] = [];
  d.nodes.forEach(n => { xs.push(n.x, n.x + n.w); ys.push(n.y, n.y + n.h); });
  d.strokes.forEach(s => s.points.forEach(([px, py]) => { xs.push(px); ys.push(py); }));
  if (!xs.length) return { x: 0, y: 0, w: 800, h: 500 };
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

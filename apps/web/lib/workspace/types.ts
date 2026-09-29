/** Shared shapes for workspace documents: written notes or code beside a diagram. */

export type NodeKind = 'client' | 'service' | 'lb' | 'db' | 'cache' | 'queue' | 'storage' | 'cdn' | 'external' | 'note';

export const NODE_KINDS: { id: NodeKind; label: string }[] = [
  { id: 'client', label: 'Client' },
  { id: 'lb', label: 'Load balancer' },
  { id: 'service', label: 'Service' },
  { id: 'db', label: 'Database' },
  { id: 'cache', label: 'Cache' },
  { id: 'queue', label: 'Queue' },
  { id: 'storage', label: 'Object storage' },
  { id: 'cdn', label: 'CDN' },
  { id: 'external', label: 'External API' },
  { id: 'note', label: 'Note' },
];

export interface DNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface DStroke {
  id: string;
  points: [number, number][];
}

export interface Diagram {
  nodes: DNode[];
  edges: DEdge[];
  strokes: DStroke[];
}

export const EMPTY_DIAGRAM: Diagram = { nodes: [], edges: [], strokes: [] };

export const LANGUAGES = [
  { id: 'markdown', label: 'Notes' },
  { id: 'sql', label: 'SQL' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
  { id: 'cpp', label: 'C++' },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]['id'];

export interface WorkspaceDoc {
  id: string;
  title: string;
  language: LanguageId;
  content: string;
  diagram: Diagram;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SIZE: Record<NodeKind, { w: number; h: number }> = {
  client: { w: 130, h: 56 },
  lb: { w: 130, h: 56 },
  service: { w: 150, h: 60 },
  db: { w: 130, h: 72 },
  cache: { w: 130, h: 60 },
  queue: { w: 150, h: 56 },
  storage: { w: 140, h: 64 },
  cdn: { w: 120, h: 56 },
  external: { w: 140, h: 56 },
  note: { w: 170, h: 70 },
};

const isKind = (k: unknown): k is NodeKind => NODE_KINDS.some(n => n.id === k);

/** Coerces untrusted JSON (from the database or a model) into a valid diagram. */
export function sanitizeDiagram(input: unknown, limit = 60): Diagram {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof Diagram, unknown>>;
  const nodes: DNode[] = [];
  const seen = new Set<string>();
  for (const n of Array.isArray(raw.nodes) ? raw.nodes : []) {
    if (!n || typeof n !== 'object') continue;
    const o = n as Record<string, unknown>;
    const id = String(o.id ?? '').trim().slice(0, 40);
    if (!id || seen.has(id)) continue;
    const kind = isKind(o.kind) ? o.kind : 'service';
    const size = DEFAULT_SIZE[kind];
    seen.add(id);
    nodes.push({
      id,
      label: String(o.label ?? id).slice(0, 80),
      kind,
      x: Number.isFinite(Number(o.x)) ? Number(o.x) : 0,
      y: Number.isFinite(Number(o.y)) ? Number(o.y) : 0,
      w: Number.isFinite(Number(o.w)) && Number(o.w) > 40 ? Number(o.w) : size.w,
      h: Number.isFinite(Number(o.h)) && Number(o.h) > 30 ? Number(o.h) : size.h,
    });
    if (nodes.length >= limit) break;
  }
  const edges: DEdge[] = [];
  const edgeKeys = new Set<string>();
  for (const e of Array.isArray(raw.edges) ? raw.edges : []) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const from = String(o.from ?? '');
    const to = String(o.to ?? '');
    const key = `${from}>${to}>${o.label ?? ''}`;
    if (!seen.has(from) || !seen.has(to) || from === to || edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ id: String(o.id ?? `e${edges.length}_${from}_${to}`).slice(0, 60), from, to, label: o.label ? String(o.label).slice(0, 40) : undefined });
  }
  const strokes: DStroke[] = [];
  for (const s of Array.isArray(raw.strokes) ? raw.strokes.slice(0, 200) : []) {
    const o = s as Record<string, unknown>;
    if (!o || !Array.isArray(o.points)) continue;
    const points = (o.points as unknown[])
      .map(p => (Array.isArray(p) ? ([Number(p[0]), Number(p[1])] as [number, number]) : null))
      .filter((p): p is [number, number] => !!p && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .slice(0, 2000);
    if (points.length > 1) strokes.push({ id: String(o.id ?? `s${strokes.length}`), points });
  }
  return { nodes, edges, strokes };
}

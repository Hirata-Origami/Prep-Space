import type { GenerativeModel } from '@google/generative-ai';
import { withRetry } from '@/lib/gemini';
import { parseJsonReply } from '@/lib/resume/merge';
import { NODE_KINDS, sanitizeDiagram, type Diagram, type LanguageId } from './types';

import type { JudgeVerdict } from './practice';

export type CodeAction = 'review' | 'explain' | 'fix' | 'solve' | 'optimize' | 'tests' | 'problem' | 'judge';
export type DiagramAction = 'draw' | 'edit' | 'critique' | 'writeup';

export const CODE_ACTIONS: CodeAction[] = ['review', 'explain', 'fix', 'solve', 'optimize', 'tests', 'problem', 'judge'];
export const DIAGRAM_ACTIONS: DiagramAction[] = ['draw', 'edit', 'critique', 'writeup'];

const CODE_TASK: Record<CodeAction, string> = {
  review: 'Review this code like a senior interviewer. Point out bugs, edge cases, complexity, and readability. Be specific and cite lines or names.',
  explain: 'Explain what this code does step by step in plain language, then state its time and space complexity.',
  fix: 'Find the bugs and return a corrected version. Explain each fix in one line.',
  solve: 'Write a complete, clean solution to the problem described. Explain the approach and state time and space complexity.',
  optimize: 'Improve the performance or clarity of this code. Explain what changed and the new complexity. For SQL, discuss indexes and the query plan.',
  problem:
    'Write ONE fresh interview practice problem in this language (for SQL: a schema, sample rows and a question). Match the difficulty or topic in the request, otherwise medium. Give a short statement, one or two examples, and constraints. Do not reveal the solution. Put starter code (a function signature, or the CREATE TABLE and INSERT statements for SQL) in "code".',
  tests: 'Write focused test cases (including edge cases) for this code. For SQL, provide sample data and the expected result.',
  judge:
    'Judge this candidate solution strictly and fairly against interview standards. Check correctness across edge cases, compute actual time and space complexity, and compare against optimal.',
};

const codePrompt = (action: CodeAction, language: LanguageId, code: string, instruction: string) => `You are a staff engineer coaching a candidate in a technical interview workspace.
Language: ${language === 'markdown' ? 'plain notes' : language}
Task: ${CODE_TASK[action]}
${instruction ? `Candidate's request: ${instruction}\n` : ''}
Never claim to have executed the code. If you predict output, say it is a prediction.

--- CODE ---
${code || '(empty)'}
--- END ---

Return ONLY this JSON:
{
  "message": "markdown explanation. Short paragraphs and bullet lists. Use fenced code blocks only for tiny snippets.",
  "code": "the full replacement code when the task produces code (fix, solve, optimize, tests, problem); otherwise an empty string"
}`;

export async function runCodeAction(
  model: GenerativeModel,
  action: CodeAction,
  language: LanguageId,
  code: string,
  instruction: string
): Promise<{ message: string; code: string }> {
  const result = await withRetry(() => model.generateContent([{ text: codePrompt(action, language, code.slice(0, 20000), instruction.slice(0, 2000)) }]));
  const parsed = parseJsonReply<{ message?: string; code?: string }>(result.response.text());
  return { message: (parsed.message ?? '').trim(), code: (parsed.code ?? '').replace(/^```\w*\n?|```$/g, '').trimEnd() };
}

const judgePrompt = (language: LanguageId, code: string, problemContext: string) => `You are an automated technical interview judge for a candidate practicing ${language === 'markdown' ? 'code' : language}.
Evaluate the candidate's solution for correctness, edge case handling, and algorithmic complexity.

Problem statement or context:
${problemContext || 'Infer the problem from comments, function names, and starter doc.'}

--- CANDIDATE CODE ---
${code}
--- END ---

Simulate running at least 4 test cases:
- Test 1: Standard primary happy-path case
- Test 2: Secondary variation / typical input
- Test 3: Edge case (e.g. empty collection, single item, 0, null, or extreme values)
- Test 4: Boundary or large input scale case

Return ONLY this JSON structure:
{
  "status": "passed" | "failed" | "partial",
  "score": 0-100,
  "timeComplexity": "e.g. O(N)",
  "spaceComplexity": "e.g. O(1)",
  "optimalComplexity": "e.g. Time: O(N), Space: O(1)",
  "testResults": [
    {
      "id": 1,
      "input": "e.g. nums = [2,7,11,15], target = 9",
      "expected": "e.g. [0, 1]",
      "actual": "e.g. [0, 1]",
      "passed": true,
      "note": "brief observation or why it passed/failed"
    }
  ],
  "feedback": "2-3 short bullet points in markdown summarizing correctness, code quality, and edge case resilience.",
  "message": "Concise verdict summary (e.g. 'Passed all 4 test cases with optimal O(N) time complexity!')"
}`;

export async function runJudgeAction(
  model: GenerativeModel,
  language: LanguageId,
  code: string,
  problemContext: string
): Promise<JudgeVerdict & { message: string }> {
  const result = await withRetry(() =>
    model.generateContent([{ text: judgePrompt(language, code.slice(0, 20000), problemContext.slice(0, 3000)) }])
  );
  const parsed = parseJsonReply<{
    status?: 'passed' | 'failed' | 'partial';
    score?: number;
    timeComplexity?: string;
    spaceComplexity?: string;
    optimalComplexity?: string;
    testResults?: JudgeVerdict['testResults'];
    feedback?: string;
    message?: string;
  }>(result.response.text());

  const status = parsed.status === 'passed' || parsed.status === 'partial' ? parsed.status : 'failed';
  const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : (status === 'passed' ? 100 : status === 'partial' ? 60 : 20);

  return {
    status,
    score,
    timeComplexity: parsed.timeComplexity || 'O(?)',
    spaceComplexity: parsed.spaceComplexity || 'O(?)',
    optimalComplexity: parsed.optimalComplexity || 'Not specified',
    testResults: Array.isArray(parsed.testResults) ? parsed.testResults : [],
    feedback: parsed.feedback || '',
    message: parsed.message || (status === 'passed' ? 'All tests passed!' : 'Some tests failed.'),
    xpAwarded: status === 'passed' ? 100 : status === 'partial' ? 40 : 10,
  };
}


const KIND_LIST = NODE_KINDS.map(k => k.id).join(', ');

function describeDiagram(d: Diagram): string {
  if (!d.nodes.length) return '(empty diagram)';
  return JSON.stringify({
    nodes: d.nodes.map(n => ({ id: n.id, label: n.label, kind: n.kind })),
    edges: d.edges.map(e => ({ from: e.from, to: e.to, label: e.label })),
  });
}

const DIAGRAM_RULES = `Diagram rules:
- Node kinds: ${KIND_LIST}. Pick the kind that matches the component (a queue is "queue", Postgres is "db", Redis is "cache", S3 is "storage", browsers and apps are "client").
- Node ids are short lowercase slugs. Labels are 1 to 4 words and name the actual technology or role (for example "Postgres (users)" or "Order service").
- Edges go from the caller to the callee or in the direction data flows. Label an edge only when it adds meaning ("REST", "publish events", "read-through").
- Prefer 6 to 16 nodes. Every node must connect to something. Use "note" nodes sparingly for a key constraint or number.`;

export async function runDiagramAction(
  model: GenerativeModel,
  action: DiagramAction,
  instruction: string,
  diagram: Diagram,
  notes: string
): Promise<{ message: string; diagram?: Diagram; writeup?: string }> {
  const current = describeDiagram(diagram);

  if (action === 'critique' || action === 'writeup') {
    const task =
      action === 'critique'
        ? 'Critique this system design the way a staff engineer would in a design review: single points of failure, bottlenecks, missing components, data consistency, scaling, and cost. Name what is good, then what to change.'
        : 'Write a concise design write-up in markdown for this diagram: requirements assumed, high-level flow, each component and why it exists, data model sketch, scaling and failure handling, and trade-offs.';
    const result = await withRetry(() =>
      model.generateContent([{ text: `${task}\n\nDiagram:\n${current}\n\nCandidate's notes:\n${notes.slice(0, 6000) || '(none)'}\n${instruction ? `\nRequest: ${instruction}\n` : ''}\nReturn ONLY JSON: {"message": "markdown"}` }])
    );
    const parsed = parseJsonReply<{ message?: string }>(result.response.text());
    const text = (parsed.message ?? '').trim();
    return action === 'writeup' ? { message: 'Write-up ready. Insert it into your notes.', writeup: text } : { message: text };
  }

  const editing = action === 'edit' && diagram.nodes.length > 0;
  const prompt = `You draw system architecture diagrams for interview preparation.
${editing ? `Here is the current diagram. Apply the requested change and return the WHOLE updated graph. Keep existing ids and labels unless the change requires otherwise.\nCurrent diagram: ${current}` : 'Create a new diagram from the description.'}

Request: ${instruction || 'Draw a sensible architecture for what the notes describe.'}
${notes.trim() && !editing ? `\nCandidate's notes:\n${notes.slice(0, 6000)}\n` : ''}
${DIAGRAM_RULES}

Return ONLY this JSON:
{
  "message": "2-3 sentences: what you drew and the key design choice",
  "nodes": [ { "id": "web", "label": "Web app", "kind": "client" } ],
  "edges": [ { "from": "web", "to": "lb", "label": "HTTPS" } ]
}`;
  const result = await withRetry(() => model.generateContent([{ text: prompt }]));
  const parsed = parseJsonReply<{ message?: string; nodes?: unknown; edges?: unknown }>(result.response.text());
  const next = sanitizeDiagram({ nodes: parsed.nodes, edges: parsed.edges });
  if (next.nodes.length < 2) throw new Error('The model did not return a usable diagram. Try describing the system in a bit more detail.');
  return { message: (parsed.message ?? 'Diagram updated.').trim(), diagram: next };
}

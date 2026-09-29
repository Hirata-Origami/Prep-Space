import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { parseJsonReply } from '@/lib/resume/merge';
import { PRACTICE_TRACKS, DIFFICULTY_CONFIG, type DifficultyLevel } from '@/lib/workspace/practice';
import { LANGUAGES, type LanguageId } from '@/lib/workspace/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id, xp').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ submissions: [], stats: { total: 0, passed: 0, easy: 0, medium: 0, hard: 0 } });

  const empty = { total: 0, solved: 0, passed: 0, easy: 0, medium: 0, hard: 0, userXp: dbUser.xp ?? 0 };
  try {
    const { data: rows, error } = await supabase
      .from('coding_submissions')
      .select('id, workspace_doc_id, title, language, track, difficulty, status, score, time_complexity, space_complexity, created_at')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      const missing = /relation|does not exist|schema cache/i.test(error.message);
      return NextResponse.json({ submissions: [], solvedTracks: {}, stats: empty, setupNeeded: missing }, { status: missing ? 200 : 500 });
    }

    const subs = rows ?? [];
    // a problem counts once, however many times it was passed
    const solved = new Map<string, (typeof subs)[number]>();
    for (const s of subs) if (s.status === 'passed' && !solved.has(`${s.title}|${s.language}`)) solved.set(`${s.title}|${s.language}`, s);
    const solvedList = [...solved.values()];
    const solvedTracks: Record<string, number> = {};
    for (const s of solvedList) solvedTracks[s.track] = (solvedTracks[s.track] ?? 0) + 1;

    return NextResponse.json({
      submissions: subs.slice(0, 50),
      solvedTracks,
      stats: {
        total: subs.length,
        solved: solvedList.length,
        passed: solvedList.length,
        easy: solvedList.filter(s => s.difficulty === 'easy').length,
        medium: solvedList.filter(s => s.difficulty === 'medium').length,
        hard: solvedList.filter(s => s.difficulty === 'hard').length,
        userXp: dbUser.xp ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ submissions: [], solvedTracks: {}, stats: empty });
  }
}

interface StartProblemBody {
  trackId: string;
  difficulty: DifficultyLevel;
  language?: LanguageId;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id, gemini_api_key').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

  const body = (await request.json()) as StartProblemBody;
  const track = PRACTICE_TRACKS.find(t => t.id === body.trackId) ?? PRACTICE_TRACKS[0];
  const difficulty = body.difficulty in DIFFICULTY_CONFIG ? body.difficulty : 'medium';
  const defaultLang: LanguageId = track.category === 'sql' ? 'sql' : 'python';
  const language: LanguageId = body.language && LANGUAGES.some(l => l.id === body.language) ? body.language : defaultLang;

  let model;
  try {
    model = getModel(dbUser.gemini_api_key, 'FLASH');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini API key configured' }, { status: 400 });
  }

  const prompt = `You are a staff engineer creating a realistic technical interview practice problem.
Track: ${track.name} (${track.category.toUpperCase()})
Difficulty: ${difficulty.toUpperCase()}
Target Language: ${language}
Topics to cover: ${track.topics.join(', ')}

Create ONE high-quality problem statement suited for this track and difficulty.
- For algorithms: Provide problem title, brief story/objective, 2 sample test cases with input and expected output, constraints, and starter code (function signature with type hints/comments).
- For SQL: Provide problem title, table schema DDL (CREATE TABLE and sample INSERT statements), question prompt with expected output format, and starter query comment.
- The workspace runs the code in the browser: JavaScript, TypeScript and Python run natively, and SQL runs on SQLite. So write SQL that SQLite accepts (date(), strftime, no INTERVAL, no ILIKE, no DATE_TRUNC), and end algorithm starter code with two or three example calls that print their results, so pressing Run shows something useful.

Return ONLY this JSON structure:
{
  "title": "Short descriptive problem title (e.g. 'Trapping Rain Water' or 'Monthly Active User Retention')",
  "descriptionMarkdown": "Markdown formatted problem description, examples, and constraints.",
  "starterCode": "Clean starter code ready in the editor."
}`;

  try {
    const result = await withRetry(() => model.generateContent([{ text: prompt }]));
    const parsed = parseJsonReply<{ title?: string; descriptionMarkdown?: string; starterCode?: string }>(
      result.response.text()
    );

    const title = parsed.title?.trim() || `${track.name} Challenge`;
    const docTitle = `[${difficulty.toUpperCase()}] ${title}`;
    const starter = (parsed.starterCode ?? '').replace(/^```\w*\n?|```$/g, '').trim();
    const description = (parsed.descriptionMarkdown ?? '').trim();

    // every language gets a header in its own comment syntax, so the file runs as written
    const mark = language === 'sql' ? '--' : language === 'python' ? '#' : '//';
    const header = [docTitle, `Track: ${track.name}  Difficulty: ${difficulty}`, '', ...description.split('\n')].map(l => `${mark} ${l}`.trimEnd());
    const initialContent = `${header.join('\n')}\n\n${starter || `${mark} Write your solution here`}\n`;

    // Create the workspace document
    const { data: doc, error: docError } = await supabase
      .from('workspace_docs')
      .insert({
        user_id: dbUser.id,
        title: docTitle,
        language,
        content: initialContent,
        diagram: { nodes: [], edges: [], strokes: [] },
      })
      .select('id')
      .single();

    if (docError || !doc) {
      throw new Error(docError?.message || 'Could not create workspace document');
    }

    return NextResponse.json({ id: doc.id, title: docTitle });
  } catch (e) {
    console.error('Practice problem generation error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not generate problem' }, { status: 500 });
  }
}

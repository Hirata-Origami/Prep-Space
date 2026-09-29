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

  try {
    const { data: submissions, error } = await supabase
      .from('coding_submissions')
      .select('id, workspace_doc_id, title, language, track, difficulty, status, score, time_complexity, space_complexity, created_at')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // If table does not exist yet
      return NextResponse.json({ submissions: [], stats: { total: 0, passed: 0, easy: 0, medium: 0, hard: 0 } });
    }

    const subs = submissions ?? [];
    const passedSubs = subs.filter(s => s.status === 'passed');
    const stats = {
      total: subs.length,
      passed: passedSubs.length,
      easy: passedSubs.filter(s => s.difficulty === 'easy').length,
      medium: passedSubs.filter(s => s.difficulty === 'medium').length,
      hard: passedSubs.filter(s => s.difficulty === 'hard').length,
      userXp: dbUser.xp ?? 0,
    };

    return NextResponse.json({ submissions: subs, stats });
  } catch {
    return NextResponse.json({ submissions: [], stats: { total: 0, passed: 0, easy: 0, medium: 0, hard: 0 } });
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

    const initialContent = language === 'sql'
      ? `/* ============================================================
 * ${docTitle}
 * Track: ${track.name} | Difficulty: ${difficulty}
 * ============================================================
${description.split('\n').map(l => ` * ${l}`).join('\n')}
 */

${starter || '-- Write your SQL query here\n'}`
      : `# ============================================================
# ${docTitle}
# Track: ${track.name} | Difficulty: ${difficulty}
# ============================================================
"""
${description}
"""

${starter || '# Write your solution here\n'}`;

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

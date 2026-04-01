import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, gemini_api_key, github_username')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const username = body.username || dbUser.github_username;

  if (!username) {
    return NextResponse.json({ error: 'GitHub username is required' }, { status: 400 });
  }

  try {
    // 1. Fetch user's repos
    const repoRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`);
    const repos = await repoRes.json();
    
    if (!Array.isArray(repos)) {
      throw new Error(repos.message || 'Failed to fetch repos');
    }

    // 2. Extract basic info and attempt to fetch READMEs
    const repoContexts = await Promise.all(repos.map(async (r: any) => {
      let readmeText = '';
      try {
        const readmeRes = await fetch(`https://raw.githubusercontent.com/${username}/${r.name}/${r.default_branch}/README.md`);
        if (readmeRes.ok) {
          readmeText = await readmeRes.text();
          // Truncate readme to avoid hitting context limits
          readmeText = readmeText.substring(0, 500);
        }
      } catch (e) {
        // ignore readme errors
      }

      return `Repository: ${r.name}
Description: ${r.description || 'N/A'}
Language: ${r.language || 'N/A'}
Stars: ${r.stargazers_count}
README snippet:
${readmeText}`;
    }));

    const contextStr = repoContexts.join('\n\n');

    // 3. Summarize using Gemini
    const model = getModel(dbUser.gemini_api_key, 'FLASH');
    const prompt = `Analyze these GitHub repositories and generate a professional project summary for a tech resume.
Format the output as a JSON array of objects, where each object represents a project and has:
- title: Project name
- description: 1-2 sentence professional summary of what it is
- bullets: Array of 2-3 bullet points suitable for a resume (focus on impact, tech stack, and technical complexity)
- url: GitHub URL
- tech_stack: Array of technologies used

REPOSITORIES:
${contextStr}

Return ONLY valid JSON array.`;

    const result = await withRetry(() => model.generateContent(prompt));
    const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    const projects = JSON.parse(responseText);

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('GitHub indexing error:', error);
    return NextResponse.json({ error: error.message || 'Failed to index GitHub' }, { status: 500 });
  }
}

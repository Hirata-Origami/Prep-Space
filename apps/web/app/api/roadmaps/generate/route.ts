import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a senior technical recruiter and career coach with deep expertise in FAANG/top-tier tech interviews. Given a job description or role name, generate a comprehensive interview preparation roadmap as valid JSON.

Return ONLY valid JSON with this exact shape:
{
  "title": "string — e.g. 'Frontend Engineer at Google'",
  "role": "string — normalized role name",
  "description": "string — comprehensive 3-5 sentence summary of what this role entails and the exact technical standards required to pass the interview",
  "modules": [
    {
      "title": "string — e.g. 'Advanced React Patterns'",
      "description": "string — highly detailed 4-6 sentence deep dive into exactly what to study, common pitfalls, and specific concepts to master",
      "skills": ["skill1", "skill2"],
      "interview_topics": ["specific topic 1 tested in interviews", "specific topic 2", "specific topic 3"],
      "estimated_hours": number,
      "coverage_note": "string — what % of the domain this module covers and what interviews it prepares for",
      "resources": ["Specific Book/Course 1", "Documentation Link 2"]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Include EXACTLY 16-20 highly comprehensive modules ordered by priority/dependency
2. Modules must collectively cover AT LEAST 90% of all knowledge required to crack this role's interviews
3. A candidate who masters all modules should be able to crack interviews at top tech companies with ease
4. Each module MUST have specific "interview_topics" — the exact subtopics an interviewer would test
5. Be EXTREMELY DETAILED in descriptions — include algorithm names, specific APIs, architectural patterns, behavioral frameworks
6. Cover fundamentals, advanced topics, system design, behavioral, and role-specific domains
7. DO NOT repeat topics across modules — each module must cover distinct ground`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { jobDescription, role, refine, comments, selected_module_ids, current_roadmap } = body;

  if (!jobDescription && !role) {
    return NextResponse.json({ error: 'Provide either jobDescription or role' }, { status: 400 });
  }

  // Get user's personal Gemini key
  const { data: profile } = await supabase
    .from('users')
    .select('gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  let model;
  try {
    model = getModel(profile?.gemini_api_key, 'FLASH_LITE');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No Gemini API key configured';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let prompt: string;

  if (refine && current_roadmap) {
    // Refinement mode: update based on user comments
    const selectedModulesText = selected_module_ids?.length
      ? `The user has specifically selected these modules to update: ${JSON.stringify(
          current_roadmap.modules?.filter((m: any, i: number) => selected_module_ids.includes(i.toString()))?.map((m: any) => m.title)
        )}.`
      : 'The user wants to refine the overall roadmap.';

    prompt = `You are refining an existing roadmap. Here is the current roadmap:
${JSON.stringify(current_roadmap, null, 2)}

${selectedModulesText}

User's refinement comments: "${comments}"

Based on these comments, update the roadmap accordingly. Return the COMPLETE updated roadmap in the same JSON format.
- If specific modules were selected, focus updates on those modules but keep others the same
- If it's a global comment, apply changes across the whole roadmap
- Maintain the same 16-20 module structure
- Return ONLY valid JSON, no markdown`;
  } else {
    prompt = jobDescription
      ? `Generate a roadmap for this job description:\n\n${jobDescription}`
      : `Generate a comprehensive interview preparation roadmap for the role: ${role}`;
  }

  try {
    const result = await withRetry(() => model.generateContent([
      { text: refine ? `You are refining a roadmap. Return ONLY valid JSON.` : SYSTEM_PROMPT },
      { text: prompt },
    ]));

    const text = result.response.text();
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const roadmapData = JSON.parse(jsonStr);

    return NextResponse.json({ roadmap: roadmapData });
  } catch (e: unknown) {
    console.error('Gemini generation error:', e);
    return NextResponse.json(
      { error: 'Failed to generate roadmap. Please try again.' },
      { status: 500 }
    );
  }
}

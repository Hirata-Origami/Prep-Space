import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a senior technical recruiter and career coach. Given a job description or role name, generate a structured interview preparation roadmap as valid JSON.

Return ONLY valid JSON with this exact shape:
{
  "title": "string — e.g. 'Frontend Engineer at Google'",
  "role": "string — normalized role name",
  "description": "string — comprehensive 3-5 sentence summary of what this role entails and the exact technical standards required to pass the interview",
  "modules": [
    {
      "title": "string — e.g. 'Advanced React Patterns'",
      "description": "string — highly detailed 4-6 sentence deep dive into exactly what to study, common pitfalls, and specific concepts (like useMemo, reconciliation, etc) to master",
      "skills": ["skill1", "skill2"],
      "estimated_hours": number,
      "resources": ["Specific Book/Course 1", "Documentation Link 2"]
    }
  ]
}

Include EXACTLY 8-12 highly comprehensive modules ordered by priority. YOU MUST BE EXTREMELY DETAILED in the 'description' field of each module — do not just give generic advice. Provide specific technical examples, algorithm names, architectural patterns, or behavioral frameworks relevant to the specific role.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { jobDescription, role, mode } = body;

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

  const prompt = jobDescription
    ? `Generate a roadmap for this job description:\n\n${jobDescription}`
    : `Generate a roadmap for the role: ${role}`;

  try {
    const result = await withRetry(() => model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: prompt },
    ]));

    const text = result.response.text();
    // Strip markdown code fences if present
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


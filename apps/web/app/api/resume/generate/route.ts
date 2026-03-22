import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

const RESUME_PROMPT = `You are an expert technical recruiter and resume writer.
Your goal is to generate an ATS-optimized JSON resume based on the user's target role and their performance across past AI mock interviews.

Return ONLY valid JSON matching this schema:
{
  "summary": "Professional summary tailored to the target role and emphasizing strengths (3-4 sentences)",
  "skills": ["Skill 1", "Skill 2", ...],
  "experience_bullets": [
    "Action-oriented bullet point emphasizing a strength",
    "Another strong achievement-focused bullet"
  ]
}`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { targetRole, targetCompany } = await request.json();

  if (!targetRole) {
    return NextResponse.json({ error: 'Target role is required' }, { status: 400 });
  }

  // Fetch user profile for name and gemini key
  const { data: profileData } = await supabase
    .from('users')
    .select('id, full_name, gemini_api_key')
    .eq('supabase_uid', user.id);
  
  const profile = profileData?.[0];

  let model;
  try {
    model = getModel(profile?.gemini_api_key, 'FLASH_LITE');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No Gemini API key';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Fetch past interview reports to understand strengths
  const { data: reportsData } = await supabase
    .from('reports')
    .select('analysis')
    .eq('user_id', profile?.id || 0)
    .order('created_at', { ascending: false })
    .limit(3);

  // Extract strengths and skills from reports
  const strengths: string[] = [];
  const reportedSkills: string[] = [];
  
  if (reportsData && reportsData.length > 0) {
    reportsData.forEach((row: any) => {
      const analysis = row.analysis || {};
      if (Array.isArray(analysis.strengths)) {
        strengths.push(...analysis.strengths);
      }
      if (analysis.scores) {
        Object.entries(analysis.scores).forEach(([skill, score]) => {
          if (typeof score === 'number' && score >= 75) {
            reportedSkills.push(skill.replace('_', ' '));
          }
        });
      }
    });
  }

  const userContext = `
Target Role: ${targetRole}
Target Company: ${targetCompany || 'Various'}
Candidate Name: ${profile?.full_name || 'Candidate'}

Interview Data (AI Assessed Performance):
Strengths Demonstrated: ${strengths.length > 0 ? strengths.join(', ') : 'Solid general foundational knowledge'}
Verified High-Proficiency Areas: ${reportedSkills.length > 0 ? reportedSkills.join(', ') : 'Problem solving, communication'}

Task: Generate a highly tailored resume JSON object emphasizing these strengths to match the Target Role.
`;

  try {
    const result = await withRetry(() => model.generateContent([
      { text: RESUME_PROMPT },
      { text: userContext }
    ]));

    const text = result.response.text();
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const resumeData = JSON.parse(jsonStr);

    return NextResponse.json({ resume: resumeData });
  } catch (e: unknown) {
    console.error('Resume generation error:', e);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}

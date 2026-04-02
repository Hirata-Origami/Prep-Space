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
    .select('id, gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { company_name, role, jd, experience_level, comments } = body;

  if (!company_name) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 });
  }

  let model;
  try {
    model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No Gemini API key configured';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const prompt = `Research the real interview process at ${company_name} for a ${role || 'Software Engineer'} position.

Based on widely-known interview patterns at ${company_name}, generate a detailed company profile.
${jd ? `Job Description: ${jd}` : ''}
${experience_level ? `Experience Level: ${experience_level}` : ''}
${comments ? `Special focus: ${comments}` : ''}

Return ONLY this JSON:
{
  "name": "${company_name}",
  "logo_emoji": "pick a relevant emoji",
  "industry": "string",
  "size": "startup|mid|large|enterprise",
  "interview_culture": "2-3 sentence description of their interview culture and what they value",
  "difficulty_rating": number between 1-10,
  "rounds": ["Round Name 1", "Round Name 2", "..."],
  "round_topics": {
    "Round Name 1": ["Specific Topic 1", "Specific Topic 2", "Specific Topic 3"],
    "Round Name 2": ["Specific Topic 1", "Specific Topic 2"]
  },
  "known_patterns": ["Known pattern 1 about their interview style", "Known pattern 2"],
  "community_pass_rate": number between 30-80
}

Make rounds realistic. Include 3-5 rounds with specific topics for each round based on real interview patterns at this company.`;

  try {
    const result = await withRetry(() => model.generateContent([
      { text: 'You are an expert on tech company interview processes. Return ONLY valid JSON, no markdown.' },
      { text: prompt },
    ]));

    const text = result.response.text();
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const companyData = JSON.parse(jsonStr);

    return NextResponse.json({ company: companyData });
  } catch (e: unknown) {
    console.error('Company generation error:', e);
    return NextResponse.json({ error: 'Failed to generate company profile' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { normalizeProjects } from '@/lib/resume/templates';
import type { ResumeData } from '@/lib/hooks/useResume';

export const dynamic = 'force-dynamic';

/** POST { resume_data, jd_text, company, role, tone } -> a short cover letter grounded in the resume. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { resume_data?: ResumeData; jd_text?: string; company?: string; role?: string; tone?: string };
  const data = body.resume_data;
  if (!data?.profile?.name) return NextResponse.json({ error: 'Add your name and experience to the resume first.' }, { status: 400 });
  if (!body.jd_text || body.jd_text.trim().length < 40) return NextResponse.json({ error: 'Paste the job description first.' }, { status: 400 });

  const { data: dbUser } = await supabase.from('users').select('gemini_api_key').eq('supabase_uid', user.id).single();
  let model;
  try {
    model = getModel(dbUser?.gemini_api_key, 'FLASH_LITE');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini API key configured' }, { status: 400 });
  }

  const { workExperience, projects } = normalizeProjects(data);
  const catalog = (data.github?.projects ?? []).slice(0, 12).map(r => ({ repo: r.name, summary: r.summary, techStack: r.techStack, highlights: r.highlights }));
  const tone = body.tone === 'warm' ? 'warm and personable' : body.tone === 'bold' ? 'confident and direct' : 'professional and concise';

  const prompt = `Write a cover letter for ${data.profile.name} applying for ${body.role || 'this role'}${body.company ? ` at ${body.company}` : ''}.

TONE: ${tone}. LENGTH: 220 to 300 words, 3 short paragraphs plus a closing line.

HARD RULES
- Use only facts in the candidate material. Do not invent employers, metrics, technologies or motivations about the company.
- Open with the specific role and one reason the candidate fits. Do not open with "I am writing to apply".
- Pick the 2 or 3 items from the material that best prove what the job asks for. Name them.
- Do not repeat the resume line by line. No buzzword lists. Plain text, no markdown, no placeholders like [Company].

CANDIDATE
Summary: ${data.profile.summary ?? ''}
Experience: ${JSON.stringify(workExperience.map(e => ({ role: e.role, company: e.company, bullets: e.bullets })))}
Projects: ${JSON.stringify(projects.map(p => ({ title: p.title, context: p.context, bullets: p.bullets })))}
${catalog.length ? `Other verified projects: ${JSON.stringify(catalog)}` : ''}

JOB DESCRIPTION
"""
${body.jd_text.slice(0, 8000)}
"""

Return only the letter text, starting with "Dear Hiring Team," and ending with the candidate's name.`;

  try {
    const result = await withRetry(() => model.generateContent([{ text: prompt }]));
    return NextResponse.json({ letter: result.response.text().trim() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not write the letter' }, { status: 500 });
  }
}

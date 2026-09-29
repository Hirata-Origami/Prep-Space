import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { generateResumeLatex, normalizeProjects } from '@/lib/resume/templates';
import { applyAiEdits, coerceTemplateId, parseJsonReply, type AiEdits } from '@/lib/resume/merge';
import type { ResumeData } from '@/lib/hooks/useResume';

export const dynamic = 'force-dynamic';

/**
 * POST /api/resume/generate
 *
 * mode "preserve" (default when no target role is given): builds the LaTeX from the
 * candidate's own data, no model involved, so the output matches what they wrote.
 * mode "enhance": asks Gemini to reword bullets and the summary. Edits are merged by
 * rules that refuse to drop bullets, figures, links or context lines.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const templateId = coerceTemplateId(body.templateId);
  const targetRole: string = body.targetRole || body.profile?.targetRole || '';
  const targetCompany: string = body.targetCompany || body.profile?.targetCompany || '';
  const mode: 'preserve' | 'enhance' = body.mode === 'enhance' ? 'enhance' : 'preserve';

  const resumeData: ResumeData = {
    templateId,
    profile: { name: '', email: '', phone: '', linkedin: '', github: '', ...(body.profile ?? {}), targetRole, targetCompany },
    experience: body.experience ?? [],
    projects: body.projects ?? [],
    education: body.education ?? [],
    skills: body.skills ?? '',
    skills_categorized: body.skills_categorized,
    achievements: body.achievements ?? '',
    certifications: body.certifications ?? '',
    latex_code: '',
  };

  let finalData = resumeData;
  let enhanced = false;
  let warning: string | undefined;

  if (mode === 'enhance') {
    if (!targetRole) {
      return NextResponse.json({ error: 'Target role is required to enhance a resume' }, { status: 400 });
    }

    const { data: profileData } = await supabase
      .from('users')
      .select('id, gemini_api_key')
      .eq('supabase_uid', user.id);
    const dbUser = profileData?.[0];

    let model;
    try {
      model = getModel(dbUser?.gemini_api_key, 'FLASH_LITE');
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini API key' }, { status: 400 });
    }

    // Strengths from recent interview reports help the model choose what to emphasise
    const strengths: string[] = [];
    const { data: reportsData } = await supabase
      .from('reports')
      .select('analysis')
      .eq('user_id', dbUser?.id || 0)
      .order('created_at', { ascending: false })
      .limit(3);
    (reportsData ?? []).forEach((row: { analysis?: { strengths?: unknown } }) => {
      if (Array.isArray(row.analysis?.strengths)) strengths.push(...(row.analysis.strengths as string[]));
    });

    const { workExperience, projects } = normalizeProjects(resumeData);
    const prompt = `You are an ATS resume editor. Improve the wording of this candidate's resume for a ${targetRole} role${targetCompany ? ` at ${targetCompany}` : ''}.

HARD RULES
1. Do not invent anything: no employers, projects, technologies, numbers, dates, links, or achievements.
2. Return EVERY experience entry and EVERY project, in the same order as the input, using the same count.
3. Each entry keeps at least as many bullets as the input. Every number, technology, product name, client and partner mentioned in a bullet must still appear.
4. You may rewrite a bullet for stronger verbs and clarity, and may add a measurable outcome only when the input already states it.
5. Summary: 3-4 sentences using only facts present in the resume.
6. Plain text only. No markdown, no asterisks.
7. skills_additions may only list skills that are clearly used in the bullets below.

TARGET ROLE: ${targetRole}
INTERVIEW STRENGTHS: ${strengths.length ? strengths.join('; ') : 'none recorded'}

RESUME
${JSON.stringify({
  summary: resumeData.profile.summary ?? '',
  experience: workExperience.map(e => ({ role: e.role, company: e.company, bullets: e.bullets })),
  projects: projects.map(p => ({ title: p.title, context: p.context ?? '', bullets: p.bullets })),
}, null, 1)}

Return ONLY this JSON:
{
  "summary": "string",
  "experience": [{ "bullets": "one bullet per line" }],
  "projects": [{ "bullets": "one bullet per line" }],
  "skills_additions": { "languages": "", "frameworks": "", "cloud_and_databases": "", "tools_and_architecture": "", "area_of_interest": "" }
}`;

    try {
      const result = await withRetry(() => model.generateContent([{ text: prompt }]));
      const edits = parseJsonReply<AiEdits>(result.response.text());
      finalData = applyAiEdits(resumeData, edits);
      enhanced = true;
    } catch (e) {
      console.warn('Resume enhancement failed, using original data:', e);
      warning = 'AI enhancement was unavailable, so your resume was built exactly as written.';
    }
  }

  const latexCode = generateResumeLatex(finalData, templateId);
  finalData = { ...finalData, latex_code: latexCode };

  return NextResponse.json({ latex_code: latexCode, resume_data: finalData, enhanced, warning });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import mammoth from 'mammoth';
import { generateResumeLatex, normalizeProjects } from '@/lib/resume/templates';
import { applyAiEdits, coerceTemplateId, parseJsonReply, type AiEdits } from '@/lib/resume/merge';
import type { ResumeData, ResumeTemplateId } from '@/lib/hooks/useResume';
import { applySelection, chooseProjects, type Selection } from '@/lib/github/select';

export const dynamic = 'force-dynamic';

/**
 * POST /api/resume/optimize
 *
 * Tailors the candidate's resume to a job description and saves the result as a
 * named version. The master resume is never overwritten, and nothing is invented:
 * the model may reword and emphasise, and edits that drop facts are rejected.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, gemini_api_key, target_role, target_company')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const apiKey = dbUser.gemini_api_key || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Please set your Gemini API key in Settings.' }, { status: 400 });
  }

  try {
    let jdText = '';
    let targetCompany = '';
    let targetRole = '';
    let selectedRole = '';
    let templateId: ResumeTemplateId = 'modern-two-column';
    let clientResumeData: Partial<ResumeData> | null = null;
    let useGithub = false;
    let maxProjects = 4;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as (Blob & { name?: string }) | null;
      jdText = (formData.get('jd_text') as string) || '';
      targetCompany = (formData.get('company') as string) || '';
      targetRole = (formData.get('role') as string) || '';
      selectedRole = (formData.get('selected_role') as string) || '';
      templateId = coerceTemplateId(formData.get('template_id'));
      useGithub = formData.get('use_github') === '1';
      maxProjects = Math.max(2, Math.min(6, Number(formData.get('max_projects')) || 4));
      const rawResume = formData.get('resume_data') as string | null;
      if (rawResume) {
        try { clientResumeData = JSON.parse(rawResume); } catch { /* ignore malformed client data */ }
      }

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name?.toLowerCase() || '';
        const mimeType = file.type;

        if (fileName.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
          const mammothResult = await mammoth.extractRawText({ buffer });
          jdText = mammothResult.value + (jdText ? '\n\n' + jdText : '');
        } else if (fileName.endsWith('.pdf') || mimeType.includes('pdf')) {
          const model = getModel(apiKey, 'FLASH_LITE');
          const pdfExtract = await withRetry(() =>
            model.generateContent([
              { text: 'Extract all readable text from this PDF job description. Return plain text only.' },
              { inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } },
            ])
          );
          jdText = pdfExtract.response.text() + (jdText ? '\n\n' + jdText : '');
        } else {
          jdText = buffer.toString('utf-8') + (jdText ? '\n\n' + jdText : '');
        }
      }
    } else {
      const body = await req.json();
      jdText = body.jd_text || '';
      targetCompany = body.company || '';
      targetRole = body.role || '';
      selectedRole = body.selected_role || '';
      templateId = coerceTemplateId(body.template_id);
      clientResumeData = body.resume_data || null;
      useGithub = !!body.use_github;
      maxProjects = Math.max(2, Math.min(6, Number(body.max_projects) || 4));
    }

    if (!jdText || jdText.trim().length < 20) {
      return NextResponse.json(
        { error: 'Please provide a valid Job Description or upload a JD document.' },
        { status: 400 }
      );
    }

    const model = getModel(apiKey, 'FLASH_LITE');

    // Step 1: If role not yet selected, detect company and roles from JD
    if (!selectedRole && !targetRole) {
      const roleDetectionPrompt = `Analyze the following Job Description:
"""
${jdText.substring(0, 10000)}
"""

Return ONLY a valid JSON object (no markdown):
{
  "company": "string",
  "roles": ["string"]
}`;
      const roleResult = await withRetry(() => model.generateContent([{ text: roleDetectionPrompt }]));

      try {
        const parsed = parseJsonReply<{ company?: string; roles?: string[] }>(roleResult.response.text());
        const roles = Array.isArray(parsed.roles) ? parsed.roles : [];
        const detectedCompany = parsed.company || targetCompany || 'Company';

        if (roles.length > 1) {
          return NextResponse.json({
            requires_selection: true,
            roles_detected: roles,
            company: detectedCompany,
            jd_text: jdText,
          });
        }
        if (roles.length === 1) targetRole = roles[0];
        if (!targetCompany && detectedCompany) targetCompany = detectedCompany;
      } catch {
        console.warn('Role detection parsing failed');
      }
    }

    const finalRole = selectedRole || targetRole || dbUser.target_role || 'Software Engineer';
    const finalCompany = targetCompany || dbUser.target_company || 'Target Company';

    // Step 2: Start from what the client sent, falling back to the saved master resume
    const { data: resumeRecord } = await supabase
      .from('resumes')
      .select('profile_sections')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const saved = (resumeRecord?.profile_sections || {}) as Partial<ResumeData>;
    const source: Partial<ResumeData> = { ...saved, ...(clientResumeData || {}) };
    const base: ResumeData = {
      templateId,
      profile: { name: '', email: '', phone: '', linkedin: '', github: '', ...(saved.profile || {}), ...(clientResumeData?.profile || {}) },
      experience: source.experience ?? [],
      projects: source.projects ?? [],
      education: source.education ?? [],
      skills: source.skills ?? '',
      skills_categorized: source.skills_categorized,
      achievements: source.achievements ?? '',
      certifications: source.certifications ?? '',
      github: source.github,
      latex_code: '',
    };

    // Step 3: Ask Gemini to tailor wording to the JD, under the no-loss / no-invention rules
    const { workExperience, projects } = normalizeProjects(base);
    const optimizePrompt = `You are an ATS resume editor. Tailor this candidate's resume to the job below by rewording and re-emphasising what is already true.

TARGET ROLE: ${finalRole}
TARGET COMPANY: ${finalCompany}

JOB DESCRIPTION
"""
${jdText.substring(0, 12000)}
"""

HARD RULES
1. Do not invent anything: no employers, projects, technologies, numbers, dates, links, or achievements. If the JD asks for something the candidate has not done, leave it out.
2. Return EVERY experience entry and EVERY project, in the same order as the input, using the same count.
3. Each entry keeps at least as many bullets as the input. Every number, technology, product name, client and partner mentioned in a bullet must still appear.
4. Use the JD's own wording for skills and responsibilities the candidate genuinely has. Put the most relevant bullet first.
5. Summary: 3-4 sentences aimed at ${finalRole}, using only facts present in the resume.
6. Plain text only. No markdown, no asterisks.
7. skills_additions may only list skills that appear in the JD AND are clearly used in the resume text below.

RESUME
${JSON.stringify({
  summary: base.profile.summary ?? '',
  experience: workExperience.map(e => ({ role: e.role, company: e.company, bullets: e.bullets })),
  projects: projects.map(p => ({ title: p.title, context: p.context ?? '', bullets: p.bullets })),
  skills: base.skills_categorized ?? base.skills,
}, null, 1)}

Return ONLY this JSON:
{
  "summary": "string",
  "experience": [{ "bullets": "one bullet per line" }],
  "projects": [{ "bullets": "one bullet per line" }],
  "skills_additions": { "languages": "", "frameworks": "", "cloud_and_databases": "", "tools_and_architecture": "", "area_of_interest": "" }
}`;

    let tailored: ResumeData = base;
    let usedAi = false;
    try {
      const result = await withRetry(() => model.generateContent([{ text: optimizePrompt }]));
      tailored = applyAiEdits(base, parseJsonReply<AiEdits>(result.response.text()));
      usedAi = true;
    } catch (e) {
      console.warn('Tailoring failed, using existing data:', e);
    }

    // Step 3b: Pick the best projects for this job from the resume and the indexed GitHub repositories
    let selection: Selection | null = null;
    const catalog = base.github?.projects ?? [];
    if (useGithub && catalog.length > 0) {
      try {
        selection = await chooseProjects({ model, jd: jdText, role: finalRole, company: finalCompany, data: base, catalog, max: maxProjects });
        tailored = { ...tailored, projects: applySelection(base, selection, catalog) };
      } catch (e) {
        console.warn('Project selection failed, keeping the existing projects:', e);
      }
    }

    // Step 4: Generate LaTeX via the deterministic template engine
    const latexCode = generateResumeLatex(tailored, templateId);
    const versionName = `${finalCompany} — ${finalRole}`;

    // Step 5: Save as a version. The master resume in `resumes` is left untouched.
    const { data: savedVersion, error: saveError } = await supabase
      .from('resume_versions')
      .insert({
        user_id: dbUser.id,
        version_name: versionName,
        company: finalCompany,
        role: finalRole,
        jd_text: jdText.substring(0, 5000),
        latex_code: latexCode,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save resume version:', saveError);
    }

    return NextResponse.json({
      success: true,
      version_name: versionName,
      company: finalCompany,
      role: finalRole,
      latex_code: latexCode,
      resume_data: { ...tailored, latex_code: latexCode },
      version_id: savedVersion?.id,
      tailored: usedAi,
      project_selection: selection,
    });

  } catch (err: unknown) {
    console.error('Resume optimization error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Optimization failed' },
      { status: 500 }
    );
  }
}

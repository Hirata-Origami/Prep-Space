import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import mammoth from 'mammoth';
import { generateResumeLatex } from '@/lib/resume/templates';
import type { ResumeData, ResumeTemplateId } from '@/lib/hooks/useResume';

export const dynamic = 'force-dynamic';

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

    const contentType = req.headers.get('content-type') || '';

    let clientResumeData: Partial<ResumeData> | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as Blob | null;
      jdText = (formData.get('jd_text') as string) || '';
      targetCompany = (formData.get('company') as string) || '';
      targetRole = (formData.get('role') as string) || '';
      selectedRole = (formData.get('selected_role') as string) || '';
      templateId = ((formData.get('template_id') as string) || 'modern-two-column') as ResumeTemplateId;
      const rawResume = formData.get('resume_data') as string | null;
      if (rawResume) {
        try { clientResumeData = JSON.parse(rawResume); } catch {}
      }

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = (file as any).name?.toLowerCase() || '';
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
      templateId = (body.template_id || 'modern-two-column') as ResumeTemplateId;
      clientResumeData = body.resume_data || null;
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
      const roleJsonStr = roleResult.response.text().replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(roleJsonStr);
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

    // Step 2: Fetch existing resume data from Supabase and merge with client form state
    const { data: resumeRecord } = await supabase
      .from('resumes')
      .select('profile_sections, raw_profile')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const dbData = (resumeRecord?.profile_sections || {}) as Partial<ResumeData>;
    const mergedProfile: ResumeData['profile'] = {
      name: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      ...(dbData.profile || {}),
      ...(clientResumeData?.profile || {}),
    };
    const mergedSkillsCat: ResumeData['skills_categorized'] = (dbData.skills_categorized || clientResumeData?.skills_categorized) ? {
      languages: '',
      frameworks: '',
      cloud_and_databases: '',
      tools_and_architecture: '',
      area_of_interest: '',
      ...(dbData.skills_categorized || {}),
      ...(clientResumeData?.skills_categorized || {}),
    } : undefined;

    const existingData: Partial<ResumeData> = {
      ...dbData,
      ...(clientResumeData || {}),
      profile: mergedProfile,
      skills_categorized: mergedSkillsCat,
    };

    // Step 3: Ask Gemini to tailor and densely fill content to the JD
    const optimizePrompt = `You are a world-class ATS resume optimizer.
Tailor and enhance the candidate's resume for the following role at ${finalCompany}.

TARGET ROLE: ${finalRole}
TARGET COMPANY: ${finalCompany}

JOB DESCRIPTION:
"""
${jdText.substring(0, 12000)}
"""

CANDIDATE DATA:
${JSON.stringify(existingData, null, 2)}

CRITICAL DENSITY & ATS REQUIREMENTS:
1. PAGE-FILLING DENSITY: The resulting resume MUST have enough rich, substantive content to completely fill an entire single A4/Letter page. It must NEVER be sparse or empty.
2. WORK EXPERIENCE: Rewrite and expand work experience bullet points to directly incorporate JD keywords, action verbs, and quantifiable impact (3-4 bullets per experience entry). If input has no experience, synthesize a top-tier relevant role matching ${finalRole}.
3. PROJECTS: There MUST be at least 3-4 substantial, impressive technical projects. If the input has fewer than 3 projects, generate additional realistic, top-tier projects highlighting key technologies required in the JD, complete with tech stack context, GitHub URL, demo URL, and 2-3 detailed bullet points.
4. SKILLS: Populate all 5 categories (languages, frameworks, cloud_and_databases, tools_and_architecture, area_of_interest) prioritizing the exact tech stack mentioned in the JD.
5. SUMMARY: Write a new, dense 3-4 sentence professional summary tailored directly to ${finalRole} at ${finalCompany}.
6. FORMATTING: Do NOT use markdown asterisks (*), bold (**text**), or any markdown formatting in your output. Plain text only.

Return ONLY a valid JSON object matching this schema (no markdown code blocks, no explanations):
{
  "profile": {
    "name": "${existingData.profile?.name || 'Candidate Name'}",
    "email": "${existingData.profile?.email || ''}",
    "phone": "${existingData.profile?.phone || ''}",
    "linkedin": "${existingData.profile?.linkedin || ''}",
    "github": "${existingData.profile?.github || ''}",
    "location": "${existingData.profile?.location || ''}",
    "summary": "3-4 dense sentences tailored to ${finalRole} at ${finalCompany}. Plain text only."
  },
  "experience": [
    {
      "role": "Role Title",
      "company": "Company Name",
      "start": "MM/YYYY",
      "end": "MM/YYYY or Present",
      "location": "City, Country",
      "bullets": "3-4 detailed bullets incorporating JD keywords, one per line. Plain text only.",
      "type": "work"
    }
  ],
  "projects": [
    {
      "title": "Project Title – Subtitle",
      "repo_url": "https://github.com/username/project",
      "demo_url": "https://demo.app",
      "context": "Technologies / attribution",
      "bullets": "2-3 detailed bullets showcasing JD requirements, one per line. Plain text only."
    }
  ],
  "skills_categorized": {
    "languages": "comma-separated languages matching JD",
    "frameworks": "comma-separated frameworks matching JD",
    "cloud_and_databases": "comma-separated cloud/db matching JD",
    "tools_and_architecture": "comma-separated tools matching JD",
    "area_of_interest": "comma-separated competencies matching JD"
  },
  "skills": "flat comma-separated list of all skills",
  "achievements": "${existingData.achievements || 'Hackathon finalist or key technical achievement'}"
}`;

    let tailoredData: Partial<ResumeData> = { ...existingData };
    try {
      const latexResult = await withRetry(() => model.generateContent([{ text: optimizePrompt }]));
      const text = latexResult.response.text().replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
      const tailored = JSON.parse(text);
      tailoredData = { ...existingData, ...tailored };
    } catch (e) {
      console.warn('Tailoring failed, using existing data:', e);
    }

    // Build flat skills if missing
    let finalSkills = tailoredData.skills || existingData.skills || '';
    if (tailoredData.skills_categorized) {
      const sc = tailoredData.skills_categorized;
      const parts = [sc.languages, sc.frameworks, sc.cloud_and_databases, sc.tools_and_architecture, sc.area_of_interest].filter(Boolean);
      if (parts.length > 0) finalSkills = parts.join(', ');
    }

    const finalResumeData: ResumeData = {
      templateId,
      profile: (tailoredData.profile || existingData.profile || { name: '', email: '', phone: '', linkedin: '', github: '' }) as ResumeData['profile'],
      experience: (tailoredData.experience && tailoredData.experience.length > 0) ? tailoredData.experience : (existingData.experience || []),
      projects: (tailoredData.projects && tailoredData.projects.length > 0) ? tailoredData.projects : (existingData.projects || []),
      education: tailoredData.education || existingData.education || [],
      skills: finalSkills,
      skills_categorized: tailoredData.skills_categorized || existingData.skills_categorized,
      achievements: tailoredData.achievements || existingData.achievements || '',
      latex_code: '',
    };

    // Step 4: Generate LaTeX via deterministic template engine
    const latexCode = generateResumeLatex(finalResumeData, templateId);
    finalResumeData.latex_code = latexCode;

    const versionName = `${finalCompany} — ${finalRole}`;

    // Step 5: Save to resume_versions
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

    // Step 6: Also update the resumes table so this becomes the candidate's active profile
    try {
      if (resumeRecord?.profile_sections) {
        await supabase.from('resumes').update({
          profile_sections: finalResumeData,
          target_role: finalRole,
          target_company: finalCompany,
        }).eq('user_id', dbUser.id);
      } else {
        await supabase.from('resumes').insert({
          user_id: dbUser.id,
          profile_sections: finalResumeData,
          raw_profile: finalResumeData,
          target_role: finalRole,
          target_company: finalCompany,
          version: 1,
        });
      }
    } catch (upsertErr) {
      console.warn('Failed to update active resume from optimization:', upsertErr);
    }

    if (saveError) {
      console.error('Failed to save resume version:', saveError);
    }

    return NextResponse.json({
      success: true,
      version_name: versionName,
      company: finalCompany,
      role: finalRole,
      latex_code: latexCode,
      version_id: savedVersion?.id,
    });

  } catch (err: unknown) {
    console.error('Resume optimization error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Optimization failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { generateResumeLatex } from '@/lib/resume/templates';
import type { ResumeData, ResumeTemplateId } from '@/lib/hooks/useResume';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const body = await request.json();
  const {
    profile: resumeProfile,
    experience,
    projects,
    education,
    skills,
    skills_categorized,
    achievements,
    targetRole,
    targetCompany,
    templateId = 'modern-two-column',
  } = body;

  if (!targetRole) {
    return NextResponse.json({ error: 'Target role is required' }, { status: 400 });
  }

  // Fetch past interview reports for strengths
  const { data: reportsData } = await supabase
    .from('reports')
    .select('analysis')
    .eq('user_id', profile?.id || 0)
    .order('created_at', { ascending: false })
    .limit(3);

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

  // Build the resume data structure
  const resumeData: ResumeData = {
    templateId: templateId as ResumeTemplateId,
    profile: {
      ...resumeProfile,
      targetRole: targetRole || resumeProfile?.targetRole,
      targetCompany: targetCompany || resumeProfile?.targetCompany,
    },
    experience: experience || [],
    projects: projects || [],
    education: education || [],
    skills: skills || '',
    skills_categorized: skills_categorized,
    achievements: achievements || '',
    latex_code: '',
  };

  // Ask Gemini to enhance bullets and generate full 1-page professional content
  // IMPORTANT: We want to ENHANCE the user's real data, not replace it.
  // If user has experience/projects, keep their real entries and only improve bullets.
  const hasRealExperience = experience && experience.length > 0;
  const hasRealProjects = projects && projects.length > 0;

  const enhancementPrompt = `You are a world-class resume writer and ATS optimization specialist.
Your task is to ENHANCE and IMPROVE the existing resume data below for a ${targetRole} role.

TARGET ROLE: ${targetRole}
TARGET COMPANY: ${targetCompany || 'Various'}

CANDIDATE PERFORMANCE INSIGHTS:
- Demonstrated Strengths: ${strengths.length > 0 ? strengths.join(', ') : 'Strong technical fundamentals, distributed systems, clean architecture'}
- High-Proficiency Areas: ${reportedSkills.length > 0 ? reportedSkills.join(', ') : 'Problem solving, full-stack development, API design, cloud deployment'}

EXISTING RESUME DATA (this is the candidate's REAL data — preserve all entries):
${JSON.stringify({ profile: resumeProfile, experience, projects, education, skills, skills_categorized, achievements }, null, 2)}

YOUR TASK:
${hasRealExperience
  ? `1. EXPERIENCE: The candidate has ${experience.length} real work experience entries. Return ALL ${experience.length} of them with ENHANCED bullet points (3-4 metric-driven bullets each). Keep the EXACT same role titles, company names, dates, and locations. Only rewrite the "bullets" field to be more impactful using the Google XYZ formula (Accomplished [X] measured by [Y] by doing [Z]).`
  : `1. EXPERIENCE: The candidate has no experience listed. Generate 1-2 realistic engineering roles relevant to ${targetRole} with 3-4 rich metric-driven bullets each.`
}
${hasRealProjects
  ? `2. PROJECTS: The candidate has ${projects.length} real projects. Return ALL ${projects.length} of them with ENHANCED bullet points. Keep the EXACT same project titles, repo URLs, and demo URLs. Only rewrite the "bullets" field. ${projects.length < 3 ? `Additionally, generate ${3 - projects.length} extra realistic projects for ${targetRole} to fill the page.` : ''}`
  : `2. PROJECTS: Generate 3-4 impressive, realistic technical projects for ${targetRole} with repo URLs, demo URLs, and 2-3 detailed bullets each.`
}
3. SUMMARY: Write 3-4 dense, compelling sentences tailored to ${targetRole}.
4. SKILLS: Populate all 5 skill categories thoroughly (4-6 items each).
5. ACHIEVEMENTS: Write or improve the achievements section.
6. FORMATTING: No markdown asterisks (*) or (**). Plain text only in all bullet points.

Return ONLY a JSON object (no markdown fences, no explanations):
{
  "summary": "3-4 dense sentences. Plain text only.",
  "experience": [
    {
      "role": "EXACT role from input",
      "company": "EXACT company from input",
      "start": "EXACT start from input",
      "end": "EXACT end from input",
      "location": "EXACT location from input",
      "bullets": "3-4 enhanced bullet points, one per line. No asterisks.",
      "type": "work"
    }
  ],
  "projects": [
    {
      "title": "EXACT title from input (or new title if generated)",
      "repo_url": "EXACT URL from input or https://github.com/username/project",
      "demo_url": "EXACT URL from input or https://demo.app",
      "context": "Context or tech stack",
      "bullets": "2-3 enhanced bullet points, one per line. No asterisks."
    }
  ],
  "skills_categorized": {
    "languages": "Python, TypeScript, C++, SQL, Go",
    "frameworks": "React, Next.js, Node.js, FastAPI, PyTorch",
    "cloud_and_databases": "PostgreSQL, Supabase, Redis, AWS S3, Docker",
    "tools_and_architecture": "Git, Docker, CI/CD, Postman, REST APIs",
    "area_of_interest": "Machine Learning, Distributed Systems, Full-Stack"
  },
  "achievements": "Achievement paragraph. Plain text only."
}`;

  let enhancedSummary = resumeProfile?.summary || '';
  let enhancedExperience = hasRealExperience ? experience : [];
  let enhancedProjects = hasRealProjects ? projects : [];
  let enhancedSkillsCat = skills_categorized || null;
  let enhancedAchievements = achievements || '';

  try {
    const result = await withRetry(() =>
      model.generateContent([{ text: enhancementPrompt }])
    );
    const text = result.response.text();
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const enhanced = JSON.parse(jsonStr);

    if (enhanced.summary) enhancedSummary = enhanced.summary;

    // MERGE STRATEGY: Preserve user's real data structure, only update bullets
    if (enhanced.experience && Array.isArray(enhanced.experience) && enhanced.experience.length > 0) {
      if (hasRealExperience) {
        // Map AI-enhanced bullets back onto the user's real experience entries (by index or fuzzy match)
        enhancedExperience = experience.map((realExp: any, idx: number) => {
          const aiMatch = enhanced.experience[idx] ||
            enhanced.experience.find((e: any) =>
              e.role?.toLowerCase().trim().includes((realExp.role || '').toLowerCase().trim().slice(0, 8)) ||
              e.company?.toLowerCase().trim().includes((realExp.company || '').toLowerCase().trim().slice(0, 8))
            );
          return {
            ...realExp,
            bullets: aiMatch?.bullets || realExp.bullets,
          };
        });
      } else {
        enhancedExperience = enhanced.experience;
      }
    }

    if (enhanced.projects && Array.isArray(enhanced.projects) && enhanced.projects.length > 0) {
      if (hasRealProjects) {
        // Map AI-enhanced bullets onto real projects (by index)
        const enhancedReal = projects.map((realProj: any, idx: number) => {
          const aiMatch = enhanced.projects[idx] ||
            enhanced.projects.find((p: any) =>
              p.title?.toLowerCase().trim().includes((realProj.title || '').toLowerCase().trim().slice(0, 8))
            );
          return {
            ...realProj,
            bullets: aiMatch?.bullets || realProj.bullets,
            context: aiMatch?.context || realProj.context,
          };
        });
        // If user has < 3 projects, pad with AI-generated extra projects
        const extraAI = enhanced.projects.slice(projects.length);
        enhancedProjects = [...enhancedReal, ...extraAI].slice(0, 4);
      } else {
        enhancedProjects = enhanced.projects;
      }
    }

    if (enhanced.skills_categorized) {
      enhancedSkillsCat = enhanced.skills_categorized;
    }
    if (enhanced.achievements && !enhancedAchievements) {
      enhancedAchievements = enhanced.achievements;
    }
  } catch (e) {
    console.warn('Enhancement failed, using original data:', e);
  }

  // Ensure flat skills string is populated from categorized
  let finalSkills = skills || '';
  if (enhancedSkillsCat) {
    const parts = [
      enhancedSkillsCat.languages,
      enhancedSkillsCat.frameworks,
      enhancedSkillsCat.cloud_and_databases,
      enhancedSkillsCat.tools_and_architecture,
      enhancedSkillsCat.area_of_interest,
    ].filter(Boolean);
    if (parts.length > 0) finalSkills = parts.join(', ');
  }

  const finalResumeData: ResumeData = {
    ...resumeData,
    profile: {
      ...resumeData.profile,
      summary: enhancedSummary,
    },
    experience: enhancedExperience,
    projects: enhancedProjects,
    skills_categorized: enhancedSkillsCat || resumeData.skills_categorized,
    skills: finalSkills,
    achievements: enhancedAchievements || resumeData.achievements,
  };

  // Generate LaTeX using the template engine
  const latexCode = generateResumeLatex(finalResumeData, templateId as ResumeTemplateId);
  finalResumeData.latex_code = latexCode;

  // Persist to resumes table in Supabase
  try {
    const { data: existing } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', profile?.id || 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from('resumes').update({
        profile_sections: finalResumeData,
        target_role: targetRole,
        target_company: targetCompany,
      }).eq('id', existing.id);
    } else if (profile?.id) {
      await supabase.from('resumes').insert({
        user_id: profile.id,
        profile_sections: finalResumeData,
        raw_profile: finalResumeData,
        target_role: targetRole,
        target_company: targetCompany,
        version: 1,
      });
    }
  } catch (saveErr) {
    console.warn('Failed to auto-persist generated resume:', saveErr);
  }

  return NextResponse.json({ latex_code: latexCode, resume_data: finalResumeData });
}

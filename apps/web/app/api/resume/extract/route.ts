import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';
import mammoth from 'mammoth';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser?.gemini_api_key) {
    return NextResponse.json({ error: 'Please save your Gemini API key in Settings first.' }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as (File & { name?: string }) | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || '';
    const fileName = (file as any).name?.toLowerCase() || '';

    const model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');

    const extractionPrompt = `You are an expert ATS resume parser.
Extract the following complete JSON structure from the provided resume. 
Return ONLY valid JSON. No markdown code blocks, no explanation.

{
  "profile": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string (full URL if present)",
    "github": "string (full URL if present)",
    "location": "string (city, state/country)",
    "summary": "string (professional summary paragraph, if present)"
  },
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string (e.g. 2020–2024 or May 2024)",
      "score": "string (e.g. CGPA: 8.31/10.00 or Percentage: 96.33% – include as shown in resume)"
    }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "start": "string",
      "end": "string (or Present)",
      "location": "string",
      "bullets": "string (each bullet on a new line, no asterisks or markdown)",
      "type": "work"
    }
  ],
  "projects": [
    {
      "title": "string",
      "repo_url": "string (GitHub URL if present)",
      "demo_url": "string (live demo URL if present)",
      "context": "string (client attribution or project context if present, e.g. 'Built for XYZ Company' or 'Open source contribution')",
      "bullets": "string (each bullet on a new line, no asterisks or markdown)"
    }
  ],
  "skills_categorized": {
    "languages": "string (comma-separated programming languages)",
    "frameworks": "string (comma-separated frameworks and libraries)",
    "cloud_and_databases": "string (comma-separated cloud platforms and databases)",
    "tools_and_architecture": "string (comma-separated tools, DevOps, architecture patterns)",
    "area_of_interest": "string (comma-separated interests or competencies)"
  },
  "skills": "string (all skills as a comma-separated flat list)",
  "achievements": "string (awards, hackathons, honors, recognitions as a paragraph or newline-separated)"
}

Important rules:
- Use plain text for bullets. Do NOT use asterisks (*), markdown bold (**), or markdown italic.
- If a section is not present in the resume, use null or empty string.
- For education, always return an array even if there is only one entry.
- For projects, extract only actual projects (not work experience).
- For skills_categorized, group thoughtfully based on what appears in the resume.`;

    let parsedData: any = null;

    // --- FILE TYPE DETECTION ---
    const isTexOrTxt = fileName.endsWith('.tex') || fileName.endsWith('.txt') || mimeType.includes('text/');
    const isDocx = fileName.endsWith('.docx') || mimeType.includes('wordprocessingml');
    const isPdf = fileName.endsWith('.pdf') || mimeType.includes('pdf');

    if (isTexOrTxt) {
      // Direct text decode for .tex and .txt files - Gemini understands raw LaTeX perfectly
      const rawText = buffer.toString('utf-8');

      const result = await model.generateContent([
        { text: extractionPrompt },
        { text: `RESUME CONTENT (${fileName || 'resume'}):\n\n${rawText.substring(0, 25000)}` },
      ]);
      const jsonStr = result.response.text().replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(jsonStr);

    } else if (isDocx) {
      // Extract raw text from .docx using mammoth
      const mammothResult = await mammoth.extractRawText({ buffer });
      const docText = mammothResult.value;

      const result = await model.generateContent([
        { text: extractionPrompt },
        { text: `RESUME CONTENT:\n\n${docText.substring(0, 15000)}` },
      ]);
      const jsonStr = result.response.text().replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(jsonStr);

    } else if (isPdf) {
      // Use Gemini inline data for PDFs
      const base64Data = buffer.toString('base64');
      const result = await model.generateContent([
        { text: extractionPrompt },
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
      ]);
      const jsonStr = result.response.text().replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(jsonStr);

    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, .tex, .docx, or .txt file.' },
        { status: 400 }
      );
    }

    // --- NORMALIZE education to always be an array ---
    if (parsedData.education && !Array.isArray(parsedData.education)) {
      parsedData.education = [parsedData.education];
    }
    parsedData.education = (parsedData.education || []).filter((e: any) => e.degree || e.institution);

    // --- NORMALIZE experience type ---
    if (parsedData.experience && Array.isArray(parsedData.experience)) {
      parsedData.experience.forEach((e: any) => { if (!e.type) e.type = 'work'; });
    }

    // --- NORMALIZE projects: skip if empty ---
    if (!parsedData.projects || !Array.isArray(parsedData.projects)) {
      parsedData.projects = [];
    }

    // --- GitHub README enrichment for projects ---
    for (let i = 0; i < parsedData.projects.length; i++) {
      const p = parsedData.projects[i];
      if (p.repo_url && p.repo_url.includes('github.com')) {
        try {
          const rawUrl = p.repo_url.replace('github.com', 'raw.githubusercontent.com') + '/main/README.md';
          const masterUrl = p.repo_url.replace('github.com', 'raw.githubusercontent.com') + '/master/README.md';
          let readmeRes = await fetch(rawUrl);
          if (!readmeRes.ok) readmeRes = await fetch(masterUrl);
          if (readmeRes.ok) {
            const readmeText = await readmeRes.text();
            const enhancePrompt = `Based on this GitHub README, generate 2-3 impressive resume bullet points (one per line, no asterisks or markdown formatting) for this project. Focus on technologies, architecture, and impact.\n\nREADME:\n${readmeText.substring(0, 5000)}`;
            const enhanceResult = await model.generateContent([{ text: enhancePrompt }]);
            const extraBullets = enhanceResult.response.text().trim();
            if (extraBullets) {
              p.bullets = (p.bullets ? p.bullets + '\n' : '') + extraBullets;
            }
          }
        } catch {
          // README fetch failed, skip silently
        }
      }
    }

    // --- Build flat skills string from categorized if missing ---
    if (!parsedData.skills && parsedData.skills_categorized) {
      const sc = parsedData.skills_categorized;
      parsedData.skills = [
        sc.languages, sc.frameworks, sc.cloud_and_databases, sc.tools_and_architecture, sc.area_of_interest
      ].filter(Boolean).join(', ');
    }

    return NextResponse.json({ extracted: parsedData });

  } catch (error: unknown) {
    console.error('Resume Parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { parseResumeLatex } from '@/lib/resume/parseLatex';
import { parseJsonReply } from '@/lib/resume/merge';
import mammoth from 'mammoth';

interface ExtractedResume {
  profile?: Record<string, string>;
  education?: { degree?: string; institution?: string; year?: string; score?: string }[] | Record<string, string>;
  experience?: { company?: string; role?: string; start?: string; end?: string; location?: string; bullets?: string; type?: string }[];
  projects?: { title?: string; repo_url?: string; demo_url?: string; context?: string; bullets?: string }[];
  skills_categorized?: Record<string, string>;
  skills?: string;
  achievements?: string | string[] | null;
  certifications?: string | string[] | null;
}

const EXTRACTION_PROMPT = `You are a meticulous resume parser. Copy the resume into the JSON structure below WITHOUT summarising, shortening, merging, or rewording anything.

Return ONLY valid JSON. No markdown fences, no commentary.

{
  "profile": {
    "name": "", "email": "", "phone": "",
    "linkedin": "full URL as linked, if any", "github": "full URL as linked, if any",
    "location": "as written, including postcode if present",
    "summary": "the summary / profile / objective paragraph, verbatim"
  },
  "education": [{ "degree": "", "institution": "", "year": "as written, e.g. 2022 – 2027 (Expected)", "score": "as written, e.g. CGPA: 8.31/10.00" }],
  "experience": [{ "company": "", "role": "", "start": "", "end": "", "location": "", "bullets": "EVERY bullet, one per line, verbatim", "type": "work" }],
  "projects": [{ "title": "full title", "repo_url": "", "demo_url": "live demo link", "context": "the italic client / partner / tech-stack line under the title, verbatim", "bullets": "EVERY bullet, one per line, verbatim" }],
  "skills_categorized": {
    "languages": "", "frameworks": "", "cloud_and_databases": "", "tools_and_architecture": "", "area_of_interest": ""
  },
  "skills": "every skill as one comma-separated list",
  "achievements": "each achievement / award / hackathon on its own line, verbatim",
  "certifications": "each certification or course on its own line, verbatim"
}

RULES
- Every bullet in the source must appear in the output. Never drop a bullet, number, link, or client name.
- Keep the source order of entries and bullets.
- Bullets are plain text: no asterisks, no markdown, no leading bullet symbols.
- Internships and jobs go in "experience"; personal, academic, client and open-source work goes in "projects".
- Use an empty string for anything that is not in the resume. Never invent content.
- "education" is always an array.
- Group skills by the heading used in the resume when there is one; otherwise group sensibly.`;

const GITHUB_REPO = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

const asText = (v: string | string[] | null | undefined) => (Array.isArray(v) ? v.join('\n') : v ?? '');

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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as (File & { name?: string }) | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || '';
    const fileName = file.name?.toLowerCase() || '';

    const isTexOrTxt = fileName.endsWith('.tex') || fileName.endsWith('.txt') || mimeType.includes('text/');
    const isDocx = fileName.endsWith('.docx') || mimeType.includes('wordprocessingml');
    const isPdf = fileName.endsWith('.pdf') || mimeType.includes('pdf');

    // 1. A .tex file written with PrepSpace's own macros loads back exactly, no model needed.
    if (isTexOrTxt) {
      const rawText = buffer.toString('utf-8');
      const exact = parseResumeLatex(rawText);
      if (exact) {
        return NextResponse.json({ extracted: exact, source: 'latex' });
      }
    }

    // 2. Anything else goes through the model, told to copy rather than summarise.
    if (!dbUser?.gemini_api_key) {
      return NextResponse.json({ error: 'Please save your Gemini API key in Settings first.' }, { status: 400 });
    }
    if (!isTexOrTxt && !isDocx && !isPdf) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, .tex, .docx, or .txt file.' },
        { status: 400 }
      );
    }

    const parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [{ text: EXTRACTION_PROMPT }];
    if (isTexOrTxt) {
      parts.push({ text: `RESUME CONTENT (${fileName || 'resume'}):\n\n${buffer.toString('utf-8').substring(0, 40000)}` });
    } else if (isDocx) {
      const { value } = await mammoth.extractRawText({ buffer });
      parts.push({ text: `RESUME CONTENT:\n\n${value.substring(0, 40000)}` });
    } else {
      parts.push({ inlineData: { data: buffer.toString('base64'), mimeType: 'application/pdf' } });
    }

    let parsed: ExtractedResume | null = null;
    let lastError: unknown;
    for (const tier of ['FLASH', 'FLASH_LITE'] as const) {
      try {
        const model = getModel(dbUser.gemini_api_key, tier);
        const result = await withRetry(() => model.generateContent(parts));
        parsed = parseJsonReply<ExtractedResume>(result.response.text());
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!parsed) throw lastError instanceof Error ? lastError : new Error('Failed to parse resume');

    // ---- normalise ----
    const education = Array.isArray(parsed.education) ? parsed.education : parsed.education ? [parsed.education] : [];
    const experience = (parsed.experience ?? []).map(e => ({ ...e, type: e.type || 'work' }));
    const projects = parsed.projects ?? [];

    // Only thin projects are enriched from their public README; complete ones are never touched
    const model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');
    for (const p of projects) {
      const bulletCount = (p.bullets ?? '').split('\n').filter(l => l.trim()).length;
      if (bulletCount >= 2 || !p.repo_url || !GITHUB_REPO.test(p.repo_url.trim())) continue;
      try {
        const base = p.repo_url.trim().replace(/\/$/, '').replace('github.com', 'raw.githubusercontent.com');
        let readme = await fetch(`${base}/main/README.md`);
        if (!readme.ok) readme = await fetch(`${base}/master/README.md`);
        if (!readme.ok) continue;
        const text = (await readme.text()).substring(0, 5000);
        const extra = await model.generateContent([{
          text: `Based on this README, write 2 factual resume bullets (one per line, plain text, no markdown) for the project "${p.title}". Use only facts stated in the README.\n\nREADME:\n${text}`,
        }]);
        const bullets = extra.response.text().trim();
        if (bullets) p.bullets = [p.bullets, bullets].filter(Boolean).join('\n');
      } catch {
        // README unavailable; keep the project as extracted
      }
    }

    const sc = parsed.skills_categorized ?? {};
    const skills =
      parsed.skills ||
      [sc.languages, sc.frameworks, sc.cloud_and_databases, sc.tools_and_architecture, sc.area_of_interest].filter(Boolean).join(', ');

    return NextResponse.json({
      extracted: {
        profile: parsed.profile ?? {},
        education: education.filter(e => e.degree || e.institution),
        experience,
        projects,
        skills_categorized: sc,
        skills,
        achievements: asText(parsed.achievements),
        certifications: asText(parsed.certifications),
      },
      source: 'model',
    });
  } catch (error: unknown) {
    console.error('Resume Parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume' },
      { status: 500 }
    );
  }
}

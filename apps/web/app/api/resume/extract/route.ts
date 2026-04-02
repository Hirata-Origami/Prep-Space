import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';
// No pdf-parse needed, we pass purely via base64 array payload

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
    return NextResponse.json({ error: 'Gemini API context missing. Please save API key.' }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let base64Data = '';
    
    if (file.type === 'application/pdf') {
      base64Data = buffer.toString('base64');
    } else {
       return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF.' }, { status: 400 });
    }

    const model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');
    const prompt = `
You are an expert ATS resume parser. 
Extract the following exact JSON structure from the uploaded resume text. 
Return ONLY valid JSON. Keep formatting clean. Do not include markdown codeblock tags.

{
  "profile": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "github": "string"
  },
  "education": {
    "degree": "string",
    "institution": "string",
    "year": "string"
  },
  "experience": [
    {
      "company": "string",
      "role": "string",
      "start": "string",
      "end": "string",
      "bullets": "string (with linebreaks \\n separated)"
    }
  ],
  "skills": "string (comma separated list of top 15 skills)",
  "projects": [
    {
      "name": "string",
      "github_url": "string (extract if present)",
      "bullets": "string"
    }
  ]
}
    `;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
    ]);
    let jsonStr = result.response.text().replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    let parsedData = JSON.parse(jsonStr);

    // Github README Recursive Enhancement
    if (parsedData.projects && Array.isArray(parsedData.projects)) {
      for (let i = 0; i < parsedData.projects.length; i++) {
        const p = parsedData.projects[i];
        if (p.github_url && p.github_url.includes('github.com')) {
          try {
            // Convert https://github.com/user/repo to https://raw.githubusercontent.com/user/repo/main/README.md
            const rawUrl = p.github_url.replace('github.com', 'raw.githubusercontent.com') + '/main/README.md';
            const rawUrlMaster = p.github_url.replace('github.com', 'raw.githubusercontent.com') + '/master/README.md';
            
            let readmeRes = await fetch(rawUrl);
            if (!readmeRes.ok) readmeRes = await fetch(rawUrlMaster);
            
            if (readmeRes.ok) {
              const readmeText = await readmeRes.text();
              const enhancePrompt = `You are a resume expert. Based on this GitHub README, generate 2-3 highly impressive resume bullet points (separated by \\n) for this project focusing on technologies used and architecture. Do not invent metrics.\n\nREADME:\n${readmeText.substring(0, 5000)}`;
              const enhanceResult = await model.generateContent([{ text: enhancePrompt }]);
              
              if (enhanceResult.response.text()) {
                p.bullets = (p.bullets ? p.bullets + '\\n' : '') + enhanceResult.response.text().trim();
              }
            }
          } catch (e) {
             console.warn("Failed to fetch README for", p.github_url);
          }
        }
        
        // Append projects to experience to feed into the generic Form
        if (p.name) {
           parsedData.experience = parsedData.experience || [];
           parsedData.experience.push({
             company: "Project",
             role: p.name,
             start: "",
             end: "",
             bullets: p.bullets || ""
           });
        }
      }
    }

    return NextResponse.json({ extracted: parsedData });
  } catch (error: any) {
    console.error('Resume Parse error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse' }, { status: 500 });
  }
}

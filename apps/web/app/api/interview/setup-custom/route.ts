import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are an elite technical interviewer at a top-tier company.
Your task is to generate a CUSTOM INTERVIEW PLAN based on a company name, a specific role, years of experience, and a job description (if provided).

YOU MUST USE YOUR INTERNAL KNOWLEDGE OF THE COMPANY'S RECRUITING STYLE, TYPICAL INTERVIEW ROUNDS, AND TECHNICAL STACK TO CREATE A "GROUNDED" AND REALISTIC INTERVIEW EXPERIENCE.

Return ONLY valid JSON with this exact shape:
{
  "interview_type": "string - e.g. 'coding', 'system-design', 'behavioral', 'managerial'",
  "title": "string - e.g. 'Google L5 Frontend Technical Round'",
  "role": "string",
  "company": "string",
  "experience": "string",
  "focus_areas": ["area1", "area2"],
  "initial_question": "string - The very first question to start the AI voice interview",
  "system_instruction": "string - Detailed instruction for the AI interviewer on how to behave, what to look for, and the 'persona' of the company's interviewers"
}

BE EXTREMELY SPECIFIC. If it's Google, focus on Big O, data structures, and 'Googliness'. If it's Amazon, focus on Leadership Principles. If it's a startup, focus on speed and practical implementation.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { company, role, experience, jdText } = body;

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let model;
  try {
    model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');
  } catch {
    return NextResponse.json({ error: 'Gemini API key not configured or invalid' }, { status: 400 });
  }

  const prompt = `
    Company: ${company}
    Role: ${role}
    Experience Level: ${experience}
    ${jdText ? `Job Description: ${jdText}` : ''}

    Generate a tailored interview round that perfectly matches this company's culture and the technical requirements of this role.
  `;

  try {
    const result = await withRetry(() => model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: prompt },
    ]));

    const text = result.response.text();
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(jsonStr);

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: dbUser.id,
        interview_type: plan.interview_type || 'custom',
        state: 'IN_PROGRESS',
        plan: {
          role: plan.role || role,
          company: plan.company || company,
          experience: plan.experience || experience,
          focus_areas: plan.focus_areas,
          title: plan.title,
          initial_question: plan.initial_question,
          system_instruction: plan.system_instruction
        }
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    return NextResponse.json({ session });
  } catch (e: unknown) {
    console.error('AI Interview Generation Error:', e);
    return NextResponse.json({ error: 'Failed to generate custom interview plan' }, { status: 500 });
  }
}

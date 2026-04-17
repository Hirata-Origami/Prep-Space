import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase.from('users').select('id, gemini_api_key').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Fetch the full roadmap with modules
  const { data: roadmap, error: roadmapError } = await supabase
    .from('roadmaps')
    .select('*, modules(*)')
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (roadmapError || !roadmap) {
    return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
  }

  const body = await request.json();
  const { comments, selected_module_ids } = body;

  if (!comments) {
    return NextResponse.json({ error: 'comments is required' }, { status: 400 });
  }

  let model;
  try {
    model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');
  } catch (e: unknown) {
    const msg = e instanceof Error ? (e instanceof Error ? e.message : "Unknown error") : 'No Gemini API key configured';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sortedModules = [...(roadmap.modules || [])].sort((a: any, b: any) => a.sequence_order - b.sequence_order);

  const selectedModuleNames = selected_module_ids?.length
    ? sortedModules
        .filter((_: any, i: number) => selected_module_ids.includes(i.toString()) || selected_module_ids.includes(sortedModules[i]?.id))
        .map((m: any) => m.title)
    : [];

  const selectedText = selectedModuleNames.length
    ? `The user specifically selected these modules to update: ${selectedModuleNames.join(', ')}.`
    : 'The user wants to update the overall roadmap.';

  const modulesText = sortedModules.map((m: any, i: number) => `${i + 1}. ${m.title}: ${m.description}`).join('\n');

  const prompt = `You are updating an interview preparation roadmap titled "${roadmap.title}" for the role "${roadmap.target_role || roadmap.title}".

Current modules:
${modulesText}

${selectedText}

User's update request: "${comments}"

Return a JSON array of ALL modules (updated or unchanged), with this format for each:
[
  {
    "id": "existing_id_or_null_for_new",
    "title": "string",
    "description": "detailed description",
    "interview_topics": ["topic1", "topic2"],
    "sequence_order": number,
    "estimated_hours": number
  }
]

Rules:
- Keep modules that don't need changing exactly as they are (copy their id)
- Update only the selected/relevant modules based on the user's comments
- Maintain at least 15 modules total
- Return ONLY the JSON array, no markdown`;

  try {
    const result = await withRetry(() => model.generateContent([
      { text: 'You are a career prep expert. Return ONLY valid JSON, no markdown.' },
      { text: prompt },
    ]));

    const text = result.response.text();
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const updatedModules: any[] = JSON.parse(jsonStr);

    // Update modules in DB
    for (const mod of updatedModules) {
      if (mod.id && mod.id !== 'null') {
        // Update existing module
        await supabase
          .from('modules')
          .update({
            title: mod.title,
            description: mod.description,
            topics: mod.interview_topics || [],
            sequence_order: mod.sequence_order,
            estimated_minutes: (mod.estimated_hours || 2) * 60,
          })
          .eq('id', mod.id)
          .eq('roadmap_id', id);
      } else {
        // Insert new module
        await supabase.from('modules').insert({
          roadmap_id: id,
          title: mod.title,
          description: mod.description,
          topics: mod.interview_topics || [],
          sequence_order: mod.sequence_order,
          status: 'available',
          estimated_minutes: (mod.estimated_hours || 2) * 60,
        });
      }
    }

    // Invalidate cache
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        await redis.del(`api_roadmaps_${dbUser.id}`);
        await redis.del(`roadmaps_${dbUser.id}`);
      }
    } catch {}

    // Fetch updated roadmap
    const { data: updatedRoadmap } = await supabase
      .from('roadmaps')
      .select('*, modules(*)')
      .eq('id', id)
      .single();

    return NextResponse.json({ roadmap: updatedRoadmap });
  } catch (e: unknown) {
    console.error('Edit roadmap error:', e);
    return NextResponse.json({ error: 'Failed to update roadmap' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: resume } = await supabase
    .from('resumes')
    .select('profile_sections, raw_profile')
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    profile_sections: resume?.profile_sections || null,
    raw_profile: resume?.raw_profile || null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { profile_sections, target_role, target_company } = body;

  // Upsert resume record
  const { data: existing } = await supabase
    .from('resumes')
    .select('id')
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase.from('resumes')
      .update({ profile_sections: profile_sections || {}, target_role, target_company })
      .eq('id', existing.id);
  } else {
    await supabase.from('resumes')
      .insert({
        user_id: dbUser.id,
        profile_sections: profile_sections || {},
        raw_profile: profile_sections || {},
        target_role,
        target_company,
        version: 1,
      });
  }

  return NextResponse.json({ success: true });
}

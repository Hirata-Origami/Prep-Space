import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: companies, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('is_active', true)
    .order('difficulty_rating', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ companies: companies || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, logo_emoji, industry, size, interview_culture, rounds, round_topics, known_patterns, difficulty_rating } = body;

  if (!name || !rounds) {
    return NextResponse.json({ error: 'name and rounds are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('company_profiles')
    .insert({
      name,
      logo_emoji: logo_emoji || '🏢',
      industry: industry || 'Tech',
      size: size || 'large',
      interview_culture,
      rounds,
      round_topics: round_topics || {},
      known_patterns: known_patterns || [],
      difficulty_rating: difficulty_rating || 7.5,
      community_pass_rate: 60,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ company: data }, { status: 201 });
}

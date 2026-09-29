import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ offers: [] });

  try {
    const { data: offers, error } = await supabase
      .from('negotiation_offers')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ offers: [] });
    return NextResponse.json({ offers: offers ?? [] });
  } catch {
    return NextResponse.json({ offers: [] });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { id, company, role, level, base_salary, equity, bonus, signing_bonus, currency, location, notes } = body;

  if (!company?.trim() || !role?.trim()) {
    return NextResponse.json({ error: 'Company and Role are required' }, { status: 400 });
  }

  const payload = {
    company: company.trim(),
    role: role.trim(),
    level: level?.trim() || null,
    base_salary: Number(base_salary) || 0,
    equity: Number(equity) || 0,
    bonus: Number(bonus) || 0,
    signing_bonus: Number(signing_bonus) || 0,
    currency: currency || 'USD',
    location: location?.trim() || 'Remote',
    notes: notes?.trim() || null,
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from('negotiation_offers')
      .update(payload)
      .eq('id', id)
      .eq('user_id', dbUser.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offer: updated });
  } else {
    const { data: created, error } = await supabase
      .from('negotiation_offers')
      .insert({ ...payload, user_id: dbUser.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offer: created });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Offer id required' }, { status: 400 });

  const { error } = await supabase.from('negotiation_offers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: versions, error } = await supabase
    .from('resume_versions')
    .select('*')
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch resume versions:', error);
    // Return empty array if table does not exist or error
    return NextResponse.json({ versions: [] });
  }

  return NextResponse.json({ versions: versions || [] });
}

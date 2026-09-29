import { NextResponse } from 'next/server';
import { getModelStatusMap } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const models = getModelStatusMap();
    const activeModel = models.find(m => m.status === 'ok') || models[0];
    const allExhausted = models.every(m => m.status !== 'ok');

    return NextResponse.json({
      activeModel: activeModel?.name,
      activeLabel: activeModel?.label,
      allExhausted,
      models,
      hasUser: !!user,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve Gemini status' },
      { status: 500 }
    );
  }
}

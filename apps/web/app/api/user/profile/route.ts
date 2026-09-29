import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canEncrypt, decryptKey, encryptKey, isEncrypted } from '@/lib/secret';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fetchWithRedis } = await import('@/lib/redis');

  let safeProfile;
  try {
    safeProfile = await fetchWithRedis(
      `api_profile_${user.id}`,
      async () => {
        const { data: profileData, error } = await supabase
          .from('users')
          .select('id, supabase_uid, full_name, email, gemini_api_key, avatar_url, xp, streak_days, target_role, target_company, level')
          .eq('supabase_uid', user.id);

        let profile = profileData?.[0];

        if (error) {
          throw new Error((error instanceof Error ? error.message : "Unknown error"));
        }

        // Create profile if it doesn't exist
        if (!profile) {
          const { data: newProfileData, error: createError } = await supabase
            .from('users')
            .insert({
              supabase_uid: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              avatar_url: user.user_metadata?.avatar_url || null,
            })
            .select();

          if (createError) {
            throw new Error(createError.message);
          }
          
          profile = newProfileData?.[0];
        }

        // the key is stored encrypted; mask the real key and quietly encrypt older plain-text keys
        const stored = profile?.gemini_api_key?.trim();
        const rawKey = decryptKey(stored)?.trim();
        if (stored && rawKey && !isEncrypted(stored) && canEncrypt()) {
          await supabase.from('users').update({ gemini_api_key: encryptKey(rawKey) }).eq('supabase_uid', user.id);
        }
        const isValidRawKey = !!(
          rawKey &&
          !rawKey.includes('•') &&
          /^[\x00-\x7F]+$/.test(rawKey) &&
          rawKey.length >= 10
        );

        let maskedKey = null;
        if (isValidRawKey && rawKey) {
          maskedKey = rawKey.length > 8 ? `${rawKey.slice(0, 4)}••••••••••${rawKey.slice(-4)}` : '••••••••';
        }

        return {
          ...profile,
          gemini_api_key: maskedKey,
          has_gemini_key: isValidRawKey,
        };
      },
      300 // cache for 5 minutes
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? (error instanceof Error ? error.message : "Unknown error") : 'Unknown error' }, { status: 500 });
  }

  return NextResponse.json({ profile: safeProfile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = ['full_name', 'gemini_api_key', 'target_role', 'target_company'];
  
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'gemini_api_key') {
        const val = typeof body[field] === 'string' ? body[field].trim() : '';
        if (!val || val.includes('•') || /[^\x00-\x7F]/.test(val) || val.length < 10) {
          continue;
        }
        updates[field] = encryptKey(val);
        continue;
      }
      updates[field] = body[field];
    }
  }

  const { data: updatedData, error } = await supabase
    .from('users')
    .update(updates)
    .eq('supabase_uid', user.id)
    .select(); // Removed .single()

  const profile = updatedData?.[0]; // Get the first element

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }

  try {
    const { redis } = await import('@/lib/redis');
    if (redis && profile) {
      await redis.del(`api_profile_${user.id}`);
    }
  } catch (err) {
    console.warn("Cache bust failed for profile update", err);
  }

  return NextResponse.json({ profile, message: 'Profile updated successfully' });
}


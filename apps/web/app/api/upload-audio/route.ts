import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Increase body size limit for audio uploads
export const maxDuration = 60;

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * POST /api/upload-audio
 * 1. JSON: Request upload instructions (returns URL + instructions)
 * 2. FormData: Upload file via multipart/form-data
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // --- CASE 2: Multipart Upload (FormData) ---
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const bucket = process.env.AWS_S3_BUCKET;
      const prefix = process.env.AWS_S3_AUDIO_PREFIX || 'audio/';
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const key = `${prefix}${user.id}/${Date.now()}_${safeFilename}`;

      const arrayBuffer = await file.arrayBuffer();
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type || 'audio/webm',
      }));

      const cloudfront = process.env.AWS_CLOUDFRONT_URL;
      const publicUrl = cloudfront
        ? `https://${cloudfront}/${key}`
        : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

      return NextResponse.json({ success: true, publicUrl, key });
    }

    // --- CASE 1: Request Instructions (JSON) ---
    const { filename } = await request.json();
    const bucket = process.env.AWS_S3_BUCKET;
    const prefix = process.env.AWS_S3_AUDIO_PREFIX || 'audio/';
    const key = `${prefix}${user.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    const cloudfront = process.env.AWS_CLOUDFRONT_URL;
    const publicUrl = cloudfront
      ? `https://${cloudfront}/${key}`
      : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return NextResponse.json({ 
      // Return a URL that includes the key so PUT can work
      url: `/api/upload-audio?key=${encodeURIComponent(key)}`,
      publicUrl, 
      key,
      useFormData: true 
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}

/**
 * PUT /api/upload-audio?key=...
 * Support direct binary upload for backwards compatibility with PUT-based clients.
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });

    const arrayBuffer = await request.arrayBuffer();
    const contentType = request.headers.get('content-type') || 'audio/webm';

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: contentType,
    }));

    return NextResponse.json({ success: true, key });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'PUT Upload failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

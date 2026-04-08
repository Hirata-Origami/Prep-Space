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
 * GET /api/upload-audio?filename=x&contentType=y
 * Returns a presigned URL (kept for backwards compatibility, but CORS issues
 * will cause it to fail. Use POST with multipart for server-side proxy instead.)
 *
 * POST /api/upload-audio (with FormData 'file' field)
 * Uploads the file server-side to S3, bypassing CORS entirely.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // --- Server-side proxy upload (FormData) ---
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const bucket = process.env.AWS_S3_BUCKET;
      const prefix = process.env.AWS_S3_AUDIO_PREFIX || 'audio/';
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const key = `${prefix}${user.id}/${Date.now()}_${safeFilename}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'audio/webm',
      }));

      const cloudfront = process.env.AWS_CLOUDFRONT_URL;
      const publicUrl = cloudfront
        ? `https://${cloudfront}/${key}`
        : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

      return NextResponse.json({ success: true, publicUrl, key });
    }

    // --- Presigned URL generation (JSON body, legacy) ---
    const { filename, contentType: fileContentType } = await request.json();

    if (!filename || !fileContentType) {
      return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const prefix = process.env.AWS_S3_AUDIO_PREFIX || 'audio/';
    const key = `${prefix}${user.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    // Instead of generating a presigned URL (which fails due to CORS),
    // we return an instruction to use the FormData path instead.
    // But provide the key so the caller knows the target path.
    const cloudfront = process.env.AWS_CLOUDFRONT_URL;
    const publicUrl = cloudfront
      ? `https://${cloudfront}/${key}`
      : `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return NextResponse.json({ 
      url: `/api/upload-audio`, // POST with FormData instead
      publicUrl, 
      key,
      useFormData: true // Signal to client to use server-side proxy
    });
  } catch (error: unknown) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}

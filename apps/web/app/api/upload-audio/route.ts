import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const prefix = process.env.AWS_S3_AUDIO_PREFIX || 'audio/';
    const key = `${prefix}${user.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // If public access is enabled on the bucket, uncomment below:
      // ACL: 'public-read',
    });

    // Generate a secure presigned URL for the client to PUT the file
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    // Compute the final public URL where the audio will be accessible
    const cloudfront = process.env.AWS_CLOUDFRONT_URL;
    let publicUrl = '';
    if (cloudfront) {
      publicUrl = `https://${cloudfront}/${key}`;
    } else {
      publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    }

    return NextResponse.json({ url, publicUrl, key });
  } catch (error: unknown) {
    console.error('S3 Presign Error:', error);
    return NextResponse.json({ error: error instanceof Error ? (error instanceof Error ? error.message : "Unknown error") : 'Failed to generate upload URL' }, { status: 500 });
  }
}

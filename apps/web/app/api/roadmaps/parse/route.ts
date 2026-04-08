import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    const filename = file.name.toLowerCase();
    if (filename.endsWith('.pdf')) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      let apiKey = process.env.GEMINI_API_KEY!;
      
      if (user) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('gemini_api_key')
          .eq('supabase_uid', user.id)
          .single();
        if (dbUser?.gemini_api_key) apiKey = dbUser.gemini_api_key;
      }

      const model = getModel(apiKey, 'FLASH_LITE');
      const base64Data = buffer.toString('base64');
      const prompt = "Extract all text from this document as raw, plain text. Do not add markdown or extra conversational text, just output the literal document text.";
      
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
      ]);
      text = result.response.text();
    } else if (filename.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (filename.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error: unknown) {
    console.error('File parsing error:', error);
    return NextResponse.json({ error: 'Failed to parse file: ' + (error instanceof Error ? (error instanceof Error ? error.message : "Unknown error") : 'Unknown error') }, { status: 500 });
  }
}

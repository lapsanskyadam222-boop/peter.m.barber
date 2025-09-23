// app/api/blob/upload/route.ts
import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const runtime = 'edge';

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          // ✅ povolené typy: JPG aj PNG
          allowedContentTypes: ['image/jpeg', 'image/png'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ kind: 'adminUpload' }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // kontrola veľkosti (≤ 10 MB)
        const fileSize = (blob as any).size as number;
        if (fileSize > 10 * 1024 * 1024) {
          throw new Error('Súbor prekračuje 10 MB');
        }
      },
    });

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Upload zlyhal' }, { status: 400 });
  }
}

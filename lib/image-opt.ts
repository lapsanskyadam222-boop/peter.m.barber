// lib/image-opt.ts
export type DownscaleOptions = {
  maxWidth?: number;
  maxHeight?: number;
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/avif';
  quality?: number;
  keepIfSmaller?: boolean;
};

export async function downscaleImageFile(file: File, opts: DownscaleOptions = {}): Promise<{ blob: Blob, width: number, height: number }> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    mimeType = 'image/webp',
    quality = 0.82,
    keepIfSmaller = true,
  } = opts;

  if (!file.type.startsWith('image/')) return { blob: file, width: 0, height: 0 };

  const imgDataUrl = await fileToDataURL(file);
  const bmp = await createImageBitmap(await (await fetch(imgDataUrl)).blob());
  let width = bmp.width, height = bmp.height;

  if (keepIfSmaller && width <= maxWidth && height <= maxHeight) {
    const blob0 = await bitmapToBlob(bmp, mimeType, quality);
    return { blob: blob0, width, height };
  }

  const scale = Math.min(maxWidth / width, maxHeight / height);
  const dstW = Math.round(width * scale);
  const dstH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, dstW, dstH);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), mimeType, quality),
  );

  return { blob: blob ?? file, width: dstW, height: dstH };
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function bitmapToBlob(bmp: ImageBitmap, type: string, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), type, quality),
  );
}

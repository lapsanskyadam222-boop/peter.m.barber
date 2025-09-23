'use client';
import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';

export function FileDrop({
  label,
  multiple = false,
  maxPerFileMB = 10,
  accept = 'image/jpeg',
  onUploaded
}: {
  label: string;
  multiple?: boolean;
  maxPerFileMB?: number;
  accept?: string;
  onUploaded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleFiles = async (files: FileList) => {
    const maxBytes = maxPerFileMB * 1024 * 1024;
    const arr = Array.from(files);

    for (const f of arr) {
      if (!accept.split(',').map(s => s.trim()).includes(f.type)) {
        // jemná validácia typu (nech nevypisujeme 2 rôzne hlášky)
        // ak chceš striktné JPG len: nechaj accept="image/jpeg"
      }
      if (f.size > maxBytes) return setErr(`Súbor je väčší než ${maxPerFileMB} MB`);
    }

    setErr('');
    setBusy(true);
    try {
      const results = await Promise.all(
        arr.map(f =>
          upload(f.name, f, {
            access: 'public',
            handleUploadUrl: '/api/blob/upload',
          })
        )
      );
      onUploaded(results.map(r => r.url));
    } catch (e: any) {
      setErr(e?.message || 'Upload zlyhal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* iba jeden text – priamo v boxe */}
      <div
        className="border-2 border-dashed rounded p-4 text-center cursor-pointer select-none"
        aria-label={label}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {busy && <p>Nahrávam…</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </div>
  );
}

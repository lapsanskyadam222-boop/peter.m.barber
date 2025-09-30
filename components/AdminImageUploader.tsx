"use client";

import React, { useCallback, useRef, useState } from "react";
import { downscaleImageFile } from "@/lib/image-opt";

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""; // na klienta daj „public“ variant, alebo vynechaj a rieš cez session

type Row = { name: string; status: "pending"|"optimizing"|"uploading"|"saved"|"error"; message?: string; url?: string; };

export default function AdminImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const list = Array.from(files);
    const initial: Row[] = list.map(f => ({ name: f.name, status: "pending" }));
    setRows(prev => [...initial, ...prev]);

    for (const file of list) {
      await processOne(file);
    }
  }, []);

  async function processOne(file: File) {
    const update = (patch: Partial<Row>) =>
      setRows(prev => prev.map(r => r.name === file.name ? { ...r, ...patch } : r));

    try {
      update({ status: "optimizing", message: "Optimalizujem…" });
      const { blob, width, height } = await downscaleImageFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        mimeType: "image/webp",
        quality: 0.82,
      });

      update({ status: "uploading", message: "Nahrávam…" });
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": (blob as any).type || "application/octet-stream" },
        body: blob,
      });

      if (!up.ok) {
        const e = await up.json().catch(() => ({}));
        throw new Error(e?.error || `Upload failed (${up.status})`);
      }
      const { url } = await up.json();

      // zapíš do manifestu
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      const add = await fetch("/api/carousel/manifest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": ADMIN_TOKEN || (undefined as any),
        },
        body: JSON.stringify({
          action: "add",
          item: { url, alt, width, height },
        }),
      });

      if (!add.ok) {
        const e = await add.json().catch(() => ({}));
        throw new Error(e?.error || `Manifest update failed (${add.status})`);
      }

      update({ status: "saved", message: "Hotovo", url });
    } catch (e: any) {
      console.error(e);
      update({ status: "error", message: e?.message || "Chyba" });
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center ${dragOver ? "bg-neutral-900/20" : "bg-neutral-900/10"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <p className="mb-2 text-sm text-neutral-400">Pretiahni obrázky sem, alebo</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1 rounded bg-neutral-800 text-white"
        >
          Vybrať súbory
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {rows.length > 0 && (
        <ul className="space-y-2 text-sm">
          {rows.map(r => (
            <li key={r.name} className="flex items-center justify-between rounded-md px-3 py-2 bg-neutral-900/30">
              <span className="truncate">{r.name}</span>
              <span className={
                r.status === "saved" ? "text-green-400" :
                r.status === "error" ? "text-red-400" :
                "text-neutral-400"
              }>
                {r.message || r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

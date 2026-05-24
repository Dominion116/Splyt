"use client";

import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { useRef } from "react";

interface Props {
  busy: boolean;
  onFile: (file: File) => void;
}

export function ImagePicker({ busy, onFile }: Props) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  const handle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handle}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handle}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => cameraRef.current?.click()}
        className="group flex items-center justify-between gap-3 rounded-2xl bg-primary p-1 ps-6 pe-1 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        <span className="py-3 text-sm font-medium">
          {busy ? "Reading receipt…" : "Take a photo"}
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-foreground">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
        </span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => galleryRef.current?.click()}
        className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4 transition hover:border-border disabled:opacity-60"
      >
        <span className="text-sm font-medium">Pick from gallery</span>
        <ImageIcon size={16} className="text-muted-foreground" />
      </button>
    </div>
  );
}

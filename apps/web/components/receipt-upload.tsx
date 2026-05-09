"use client";

import { useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TerminalLog, type TerminalLine } from "@/components/dashboard/terminal-log";

type ParsedReceipt = {
  items: Array<{ name: string; amount: string; quantity?: number; unitPrice?: string }>;
  subtotal: string;
  tax: string;
  total: string;
  currency: "cUSD";
};

const parsingLines: TerminalLine[] = [
  { tag: "[agent]", tagColor: "text-primary", text: "Sending to agent..." },
  { tag: "[vision]", tagColor: "text-primary", text: "Parsing receipt image..." },
  { tag: "[agent]", tagColor: "text-primary", text: "Validating JSON response..." }
];

export function ReceiptUpload({ onParsed }: { onParsed?: (receipt: ParsedReceipt) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fileToBase64 = (input: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(input);
    });

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/parse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file.type || "image/jpeg" })
      });
      if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
      const parsed = (await res.json()) as ParsedReceipt;
      onParsed?.(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block cursor-pointer">
        <Card
          padding="lg"
          variant="outline"
          className="border-2 border-dashed text-center transition-colors hover:border-primary hover:bg-primary-soft/30"
        >
          <span aria-hidden="true" className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Camera className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <p className="text-sm font-medium text-foreground">{file ? file.name : "Upload receipt"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {file ? "Tap to choose a different photo" : "Photo, PDF, or screenshot"}
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
            className="sr-only"
          />
        </Card>
      </label>

      {preview ? (
        <Card padding="none" className="overflow-hidden">
          <img src={preview} alt="Receipt preview" className="max-h-64 w-full object-contain" />
        </Card>
      ) : null}

      {loading ? <TerminalLog lines={parsingLines} animateIn live /> : null}

      {error ? (
        <Card role="alert" padding="sm" className="border-danger/30 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      <Button
        type="submit"
        block
        size="lg"
        disabled={!file}
        loading={loading}
        leftIcon={<Upload className="h-4 w-4" />}
      >
        {loading ? "Parsing receipt" : "Submit to agent"}
      </Button>
    </form>
  );
}

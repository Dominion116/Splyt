"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ParsedReceipt = {
  items: Array<{ name: string; amount: string }>;
  subtotal: string;
  tax: string;
  total: string;
  currency: "cUSD";
};

export function ReceiptUpload({ onParsed }: { onParsed?: (receipt: ParsedReceipt) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchWithPayment = (url: string, init?: RequestInit) => fetch(url, init);

  const terminalText = useMemo(() => {
    if (!loading) return null;
    return ["[agent] Sending to agent...", "[vision] Parsing receipt image...", "[agent] Validating JSON response..."];
  }, [loading]);

  const fileToBase64 = async (input: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(input);
    });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetchWithPayment(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/parse`, {
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
    <Card>
      <CardHeader>
        <CardTitle>Upload receipt</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          {preview ? <img src={preview} alt="Receipt preview" className="max-h-64 rounded-md border border-zinc-800 object-contain" /> : null}
          {loading && terminalText ? (
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-400">
              {terminalText.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
          {error ? (
            <Badge variant="destructive" className="w-fit">
              {error}
            </Badge>
          ) : null}
          <Button type="submit" disabled={!file || loading}>
            {loading ? "Parsing..." : "Submit to Agent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

import { ReceiptUpload } from "@/components/receipt-upload";

export default function SplitPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">New split</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Create split</h1>
        <p className="text-sm text-muted-foreground">
          Upload a receipt — Splyt&apos;s vision agent extracts every line item in seconds.
        </p>
      </header>
      <ReceiptUpload />
    </main>
  );
}

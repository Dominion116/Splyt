import { ReceiptUpload } from "@/components/receipt-upload";

export default function SplitPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-medium">Create Split</h1>
      <ReceiptUpload />
    </main>
  );
}

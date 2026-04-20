import { PaymentStatus } from "@/components/payment-status";

export default async function SplitSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-medium">Session {id}</h1>
      <PaymentStatus sessionId={id} />
    </main>
  );
}

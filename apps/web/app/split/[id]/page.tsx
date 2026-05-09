import { PaymentStatus } from "@/components/payment-status";
import { truncateAddress } from "@/lib/dashboard";

export default async function SplitSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Session</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {truncateAddress(id, 8, 6)}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">{id}</p>
      </header>
      <PaymentStatus sessionId={id} />
    </main>
  );
}

import { Button } from "@/components/ui/button";

export default async function PayPage({ params }: { params: Promise<{ id: string; addr: string }> }) {
  const { id, addr } = await params;
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-2xl font-medium">Pay your share</h1>
      <p className="font-mono text-xs text-zinc-500">Session: {id}</p>
      <p className="font-mono text-xs text-zinc-500">Member: {addr}</p>
      <Button>Pay with MiniPay</Button>
    </main>
  );
}

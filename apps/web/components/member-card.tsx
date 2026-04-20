export function MemberCard({ address, amount }: { address: string; amount: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="font-mono text-xs text-zinc-500">{address}</p>
      <p className="text-sm text-zinc-300">{amount} USDC</p>
    </div>
  );
}

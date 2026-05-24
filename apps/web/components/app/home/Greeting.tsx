"use client";

import { useWallet } from "@/lib/wallet";
import { AddressPill } from "@/components/app/common/AddressPill";

export function Greeting() {
  const { address } = useWallet();
  const hour = new Date().getHours();
  const salute = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Hey there" : "Good evening";

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{salute}</p>
      <h1 className="text-2xl font-medium tracking-tight">
        Snap a receipt, <span className="font-serif italic">split it</span>.
      </h1>
      {address ? <AddressPill address={address} className="mt-1 self-start" /> : null}
    </div>
  );
}

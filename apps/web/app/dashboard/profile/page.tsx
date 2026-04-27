"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardBadge } from "@/components/dashboard/badge";
import { truncateAddress, formatUsdcPrecise } from "@/lib/dashboard";
import { CONTRACT_ADDRESS } from "@/lib/celo-contract";
import { getCUSDBalance } from "@/lib/minipay";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";
import { useRouter } from "next/navigation";

type SettingMode = "equal" | "itemised" | "custom";

export default function DashboardProfilePage() {
  const router = useRouter();
  const { address } = useDashboardWallet();
  const [balance, setBalance] = useState(0n);
  const [defaultMode, setDefaultMode] = useState<SettingMode>("equal");
  const [expiry, setExpiry] = useState("6h");
  const contractAddress = CONTRACT_ADDRESS;

  useEffect(() => {
    const storedMode = window.localStorage.getItem("splyt.defaultSplitMode") as SettingMode | null;
    const storedExpiry = window.localStorage.getItem("splyt.linkExpiry");
    if (storedMode) setDefaultMode(storedMode);
    if (storedExpiry) setExpiry(storedExpiry);
  }, []);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        if (!address) return;
        setBalance(await getCUSDBalance(address as `0x${string}`));
      } catch {
        setBalance(0n);
      }
    };

    void loadBalance();
  }, [address]);

  const initials = useMemo(() => (address ? address.slice(0, 2) : "--"), [address]);

  const onDisconnect = () => {
    window.localStorage.removeItem("splyt.wallet");
    window.localStorage.removeItem("splyt.defaultSplitMode");
    window.localStorage.removeItem("splyt.linkExpiry");
    router.push("/");
  };

  return (
    <div className="space-y-4">
      <section className="relative space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="absolute right-3 top-3 h-2 w-2 rounded-md bg-green-500" />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-indigo-500/20 bg-indigo-500/10 font-mono text-indigo-400">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-zinc-100">Connected wallet</div>
            <div className="truncate font-mono text-[10px] text-zinc-500">{address || "connect wallet"}</div>
          </div>
        </div>
        <div className="h-px bg-zinc-800" />
        <div className="space-y-2 font-mono text-[10px] text-zinc-500">
          <div className="flex items-center justify-between"><span>cUSD balance</span><span>${formatUsdcPrecise(balance)}</span></div>
          <div className="flex items-center justify-between"><span>Network</span><DashboardBadge variant="settled">celo</DashboardBadge></div>
          <div className="flex items-center justify-between"><span>Gas token</span><span>Celo</span></div>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="font-medium text-zinc-100">Notifications</div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-600">No notifications yet.</div>
      </section>

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center justify-between">
          <div className="font-medium text-zinc-100">Contract info</div>
          <DashboardBadge variant="paid">verified</DashboardBadge>
        </div>
        {contractAddress ? (
          <>
            <div className="font-mono text-[10px] text-zinc-500">{truncateAddress(contractAddress, 8, 6)}</div>
            <Button variant="outline" className="w-full border-zinc-700 font-mono text-[10px] uppercase tracking-widest" onClick={() => window.open(`https://celoscan.io/address/${contractAddress}`, "_blank")}>
              view on Celoscan
            </Button>
          </>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-600">No contract address configured.</div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="font-medium text-zinc-100">Settings</div>
        <div className="space-y-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <div className="space-y-1">
            <div>default split mode</div>
            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-zinc-800">
              {(["equal", "itemised", "custom"] as SettingMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setDefaultMode(mode);
                    window.localStorage.setItem("splyt.defaultSplitMode", mode);
                  }}
                  className={`border-r border-zinc-800 px-2 py-2 ${defaultMode === mode ? "bg-indigo-600 text-white" : "bg-transparent text-zinc-500"}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div>payment link expiry</div>
            <select
              value={expiry}
              onChange={(event) => {
                setExpiry(event.target.value);
                window.localStorage.setItem("splyt.linkExpiry", event.target.value);
              }}
              className="w-full rounded-md border border-zinc-800 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100"
            >
              {["1h", "6h", "24h", "7d"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <Button type="button" variant="outline" className="w-full border-red-500/30 font-mono text-sm text-red-400" onClick={onDisconnect}>
        <LogOut className="mr-2 h-4 w-4" /> disconnect
      </Button>
    </div>
  );
}
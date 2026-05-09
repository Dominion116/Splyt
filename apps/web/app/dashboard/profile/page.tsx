"use client";

import { useEffect, useState } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DashboardBadge } from "@/components/dashboard/badge";
import { truncateAddress, formatUsdcPrecise } from "@/lib/dashboard";
import { CONTRACT_ADDRESS } from "@/lib/celo-contract";
import { getCUSDBalance } from "@/lib/minipay";
import { useDashboardWallet } from "@/components/dashboard/use-wallet";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SettingMode = "equal" | "itemised" | "custom";

const splitModes: SettingMode[] = ["equal", "itemised", "custom"];
const expiries = ["1h", "6h", "24h", "7d"] as const;

export default function DashboardProfilePage() {
  const router = useRouter();
  const { address } = useDashboardWallet();
  const [balance, setBalance] = useState(0n);
  const [loadingBalance, setLoadingBalance] = useState(false);
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
      setLoadingBalance(true);
      try {
        if (!address) return;
        setBalance(await getCUSDBalance(address as `0x${string}`));
      } catch {
        setBalance(0n);
      } finally {
        setLoadingBalance(false);
      }
    };

    void loadBalance();
  }, [address]);

  const onDisconnect = () => {
    window.localStorage.removeItem("splyt.wallet");
    window.localStorage.removeItem("splyt.defaultSplitMode");
    window.localStorage.removeItem("splyt.linkExpiry");
    router.push("/");
  };

  const initials = address ? address.slice(2, 4).toUpperCase() : "—";
  const connected = Boolean(address);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Wallet, settings, and contract info.</p>
      </header>

      {/* Wallet card */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg" name={initials} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Connected wallet</p>
              <Badge variant={connected ? "success" : "secondary"} dot className="text-[10px]">
                {connected ? "Live" : "Offline"}
              </Badge>
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {address || "Connect a wallet to continue"}
            </p>
          </div>
        </div>
        <Separator />
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">cUSD balance</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">
              {loadingBalance ? <Skeleton className="h-4 w-16" /> : `$${formatUsdcPrecise(balance)}`}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Network</dt>
            <dd>
              <DashboardBadge variant="settled">Celo</DashboardBadge>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Gas token</dt>
            <dd className="text-foreground">Celo</dd>
          </div>
        </dl>
      </Card>

      {/* Notifications */}
      <Card padding="md">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Notifications</h2>
        <p className="mt-3 rounded-md bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
          No notifications yet.
        </p>
      </Card>

      {/* Contract info */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Contract info</h2>
          <DashboardBadge variant="paid">Verified</DashboardBadge>
        </div>
        {contractAddress ? (
          <>
            <p className="font-mono text-[11px] text-muted-foreground">
              {truncateAddress(contractAddress, 8, 6)}
            </p>
            <Button
              variant="outline"
              block
              onClick={() => window.open(`https://celoscan.io/address/${contractAddress}`, "_blank")}
              rightIcon={<ExternalLink className="h-4 w-4" />}
            >
              View on Celoscan
            </Button>
          </>
        ) : (
          <p className="rounded-md bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
            No contract address configured.
          </p>
        )}
      </Card>

      {/* Settings */}
      <Card padding="md" className="space-y-5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Settings</h2>

        {/* Default split mode */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Default split mode
          </legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-1.5 rounded-full bg-surface-muted p-1">
            {splitModes.map((mode) => {
              const active = defaultMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setDefaultMode(mode);
                    window.localStorage.setItem("splyt.defaultSplitMode", mode);
                  }}
                  className={cn(
                    "h-9 rounded-full text-xs font-medium capitalize transition-all",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Payment link expiry */}
        <div className="space-y-2">
          <label
            htmlFor="link-expiry"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Payment link expiry
          </label>
          <select
            id="link-expiry"
            value={expiry}
            onChange={(event) => {
              setExpiry(event.target.value);
              window.localStorage.setItem("splyt.linkExpiry", event.target.value);
            }}
            className="h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-foreground focus-visible:outline-none focus-visible:shadow-ring"
          >
            {expiries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Button
        type="button"
        variant="outline"
        block
        size="lg"
        onClick={onDisconnect}
        leftIcon={<LogOut className="h-4 w-4" />}
        className="border-danger/30 text-danger hover:bg-danger/5"
      >
        Disconnect wallet
      </Button>
    </div>
  );
}

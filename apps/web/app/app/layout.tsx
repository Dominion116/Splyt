import type { ReactNode } from "react";
import { DockShell } from "@/components/app/shell/DockShell";
import { WalletProvider } from "@/lib/wallet";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <DockShell>{children}</DockShell>
    </WalletProvider>
  );
}

"use client";

import type { ReactNode } from "react";
import { ThirdwebProvider } from "thirdweb/react";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}

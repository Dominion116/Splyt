"use client";

import { createAppKit } from "@reown/appkit/react";
import { celo } from "@reown/appkit/networks";
import { wagmiAdapter, projectId, networks } from "@/lib/wagmi";

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: celo,
  metadata: {
    name: "Splyt",
    description: "Split any shared bill in seconds and settle on chain.",
    url: "https://splyt.app",
    icons: ["/icon.png"],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: "dark",
});

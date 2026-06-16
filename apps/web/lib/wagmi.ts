import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { type AppKitNetwork, celo } from "@reown/appkit/networks";
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [celo];

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks,
});

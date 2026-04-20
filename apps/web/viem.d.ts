declare module "viem" {
  export type Address = `0x${string}`;

  export function custom(transport: unknown): unknown;
  export function http(url?: string): unknown;
  export function createPublicClient(config: unknown): {
    readContract(args: unknown): Promise<any>;
  };
  export function createWalletClient(config: unknown): unknown;
}

declare module "viem/chains" {
  export const celo: unknown;
}

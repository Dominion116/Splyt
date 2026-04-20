declare module "viem" {
  export type Address = `0x${string}`;
  export type Hash = `0x${string}`;
  export type Hex = `0x${string}`;

  export function http(url?: string): unknown;
  export function parseEther(value: string): bigint;
  export function createPublicClient(config: unknown): {
    waitForTransactionReceipt(args: { hash: Hash }): Promise<unknown>;
    readContract(args: unknown): Promise<any>;
  };
  export function createWalletClient(config: unknown): {
    writeContract(args: unknown): Promise<Hash>;
  };
}

declare module "viem/accounts" {
  export function privateKeyToAccount(privateKey: `0x${string}`): unknown;
}

declare module "viem/chains" {
  export const celo: unknown;
}

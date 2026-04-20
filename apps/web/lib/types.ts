export type ParsedReceipt = {
  items: Array<{ name: string; amount: string }>;
  subtotal: string;
  tax: string;
  total: string;
  currency: "USDC";
};

export type SplitMode = "equal" | "itemised" | "custom";

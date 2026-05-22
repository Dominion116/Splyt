"use client";
import Feature from "@/components/shadcn-space/blocks/feature-01/feature";
import { ScanLine, Divide, Wallet, ShieldCheck } from "lucide-react";

const featureData = [
  {
    icon: ScanLine,
    content:
      "Scan any receipt instantly. Our AI reads paper slips, screenshots, and digital bills in under three seconds.",
  },
  {
    icon: Divide,
    content:
      "Split amounts down to the cent. Every person gets their exact share with no rounding errors or awkward estimates.",
  },
  {
    icon: Wallet,
    content:
      "Pay directly from your wallet. Each member settles their amount on chain without going through a third party.",
  },
  {
    icon: ShieldCheck,
    content:
      "Every payment verified on chain. Settlements are recorded permanently so the whole group can see who has paid.",
  },
];

const Feature01 = () => {
  return null;
};

export default Feature01;

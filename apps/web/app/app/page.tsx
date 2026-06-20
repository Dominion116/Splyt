"use client";

import { motion } from "motion/react";
import { Greeting } from "@/components/app/home/Greeting";
import { BalanceCard } from "@/components/app/home/BalanceCard";
import { PrimaryAction } from "@/components/app/home/PrimaryAction";
import { SessionList } from "@/components/app/home/SessionList";
import { DraftRecoveryList } from "@/components/app/home/DraftRecoveryList";
import { ConnectSheet } from "@/components/app/wallet/ConnectSheet";
import { useWallet } from "@/lib/wallet";

export default function HomePage() {
  const { address } = useWallet();

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8">
      <Greeting />
      {address ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex flex-col gap-5"
        >
          <BalanceCard />
          <PrimaryAction />
          <DraftRecoveryList />
          <SessionList host={address} />
        </motion.div>
      ) : (
        <ConnectSheet />
      )}
    </div>
  );
}

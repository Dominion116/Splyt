"use client";

import { motion } from "motion/react";

const stats = [
  {
    value: "< 3s",
    label: "Average receipt parse time",
    description:
      "From upload to split in under three seconds on most devices.",
  },
  {
    value: "< $0.01",
    label: "Cost per settlement",
    description: "Celo's low fees keep each on-chain payment nearly free.",
  },
  {
    value: "100%",
    label: "On-chain verification",
    description:
      "Every payment is recorded and provable on the Celo network.",
  },
  {
    value: "0",
    label: "Spreadsheets required",
    description:
      "No tracking sheets, no manual math, no awkward group chats.",
  },
];

export default function Performance() {
  return (
    <section id="performance" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="text-center mb-12 md:mb-16 flex flex-col gap-3"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Built to perform
            </p>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
              Fast, cheap, and reliable
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Splyt handles the heavy lifting so every settlement lands on
              time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.1,
                  ease: "easeInOut",
                }}
                className="flex flex-col gap-3 p-8 rounded-2xl border border-border bg-card"
              >
                <span className="text-5xl md:text-6xl font-medium tracking-tight">
                  {stat.value}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-medium">{stat.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

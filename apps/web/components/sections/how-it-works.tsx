"use client";

import { motion } from "motion/react";
import { Camera, Sparkles, Wallet } from "lucide-react";

const steps = [
  {
    icon: Camera,
    number: "01",
    title: "Snap the receipt",
    description:
      "Take a photo or upload any receipt from your camera roll. Any format works, from paper slips to digital screens.",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "AI splits it instantly",
    description:
      "Our vision model reads every line item and works out each person's exact share. Review the numbers and adjust if needed.",
  },
  {
    icon: Wallet,
    number: "03",
    title: "Everyone pays their part",
    description:
      "Each member gets a link and settles their share directly from their wallet. Everything lands on chain and stays there.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24">
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
              Simple by design
            </p>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
              How it works
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              From receipt to settlement in three simple steps.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.1,
                  ease: "easeInOut",
                }}
                className="flex flex-col gap-4 p-6 rounded-2xl border border-border bg-card"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon size={18} className="text-primary" />
                  </div>
                  <span className="text-4xl font-medium text-muted-foreground/20">
                    {step.number}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
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

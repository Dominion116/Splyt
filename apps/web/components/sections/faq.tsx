"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "What exactly is Splyt?",
    answer:
      "Splyt is a receipt-splitting app that runs on Celo. You snap a receipt, our AI splits the amounts by person, and everyone pays their share straight from their wallet with no middleman involved.",
  },
  {
    question: "Which wallets can I use with Splyt?",
    answer:
      "Splyt is built for MiniPay first, but any browser wallet that connects to the Celo network will work just as well.",
  },
  {
    question: "How accurate is the receipt scanning?",
    answer:
      "The AI reads most receipt formats correctly out of the box. Before sending out payment links, you get a chance to review and correct any amounts if something looks off.",
  },
  {
    question: "Does it cost anything to use?",
    answer:
      "Scanning a receipt is completely free. Settlement transactions go out on Celo, where gas fees are a fraction of a cent, so splitting a dinner among five people costs almost nothing.",
  },
  {
    question: "What if someone takes a while to pay?",
    answer:
      "Sessions stay open until the host closes them or they expire. The on-chain record shows exactly who has paid and who has not, so you always know where things stand.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="text-center mb-12 flex flex-col gap-3"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Still curious?
            </p>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
              Questions people actually ask
            </h2>
            <p className="text-base text-muted-foreground">
              If something is not clear here, feel free to reach out.
            </p>
          </motion.div>

          <div className="flex flex-col divide-y divide-border">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                  ease: "easeInOut",
                }}
              >
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 cursor-pointer"
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                >
                  <span className="text-base font-medium">{faq.question}</span>
                  {openIndex === index ? (
                    <Minus
                      size={16}
                      className="shrink-0 text-muted-foreground"
                    />
                  ) : (
                    <Plus
                      size={16}
                      className="shrink-0 text-muted-foreground"
                    />
                  )}
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

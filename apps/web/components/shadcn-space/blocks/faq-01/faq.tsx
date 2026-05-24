import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_DATA = [
  {
    question: "How does Splyt read my receipt?",
    answer:
      "Splyt uses AI to scan any receipt you upload — whether it is a photo, screenshot, or digital bill. It extracts every line item in under three seconds so you can move straight to splitting.",
  },
  {
    question: "Which wallets does Splyt support?",
    answer:
      "Splyt works with any wallet that connects to the Celo network. If your wallet supports WalletConnect or is a Celo-native wallet, you can sign in and settle payments without any extra setup.",
  },
  {
    question: "Are settlements really recorded on chain?",
    answer:
      "Yes. Every payment is settled directly on the Celo blockchain. This means the transaction is permanent and visible to every member of the group, so there is no need to trust a third party to keep records.",
  },
  {
    question: "What happens if someone has not paid yet?",
    answer:
      "Splyt shows each member their outstanding balance in real time. You can see at a glance who has settled and who still owes, and the group can send a reminder directly from the app without any awkward conversations.",
  },
  {
    question: "Is there a fee for using Splyt?",
    answer:
      "Splyt charges no platform fee for splitting or settling bills. The only cost you may see is the standard Celo network gas fee, which is typically a fraction of a cent per transaction.",
  },
];

export default function Faq() {
  return (
    <section id="faq">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 lg:py-24 flex flex-col gap-16">
        <div className="flex flex-col gap-4 items-center animate-in fade-in slide-in-from-top-10 duration-1000 delay-100 ease-in-out fill-mode-both">
          <Badge
            variant="outline"
            className="text-sm h-auto py-1 px-3 border-0 outline outline-border"
          >
            FAQs
          </Badge>
          <h2 className="text-5xl font-medium text-center max-w-lg">
            Got questions? We have got answers ready
          </h2>
        </div>
        <div>
          <Accordion type="single" collapsible className="w-full flex flex-col gap-6">
            {FAQ_DATA.map((faq, index) => (
              <AccordionItem
                key={`item-${index}`}
                value={`item-${index}`}
                className={cn(
                  "p-6 border border-border rounded-2xl flex flex-col gap-3 group/item data-[state=open]:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both",
                  index === 0 && "delay-100",
                  index === 1 && "delay-200",
                  index === 2 && "delay-300",
                  index === 3 && "delay-400",
                  index === 4 && "delay-500"
                )}
              >
                <AccordionTrigger className="p-0 text-xl font-medium hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden cursor-pointer">
                  {faq.question}
                  <PlusIcon className="w-6 h-6 shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-45" />
                </AccordionTrigger>
                <AccordionContent className="p-0 text-muted-foreground text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

type Features = {
  icon: LucideIcon;
  content: string;
}[];

const Feature = ({ featureData }: { featureData: Features }) => {
  return (
    <section id="how-it-works">
      <div className="lg:py-20 sm:py-16 py-8 ">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col gap-8 md:gap-12">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="flex flex-col items-center justify-center gap-4"
            >
              <div className="flex flex-col gap-4 max-w-full items-center text-center md:max-w-xl">
                <h2 className="text-3xl md:text-4xl font-semibold">
                  From any receipt to a clean split
                </h2>
                <p className="text-lg font-normal text-muted-foreground">
                  Splyt takes the friction out of shared bills. Snap a photo,
                  review the split, and watch everyone settle in real time.
                </p>
              </div>
            </motion.div>
            <div className="min-h-[28rem] rounded-2xl border border-dashed border-border/60 bg-muted/20" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Feature;

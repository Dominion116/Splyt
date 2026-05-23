"use client";
import AboutUs from "@/components/shadcn-space/blocks/about-us-01/about-us";
import { ScanLine, ShieldCheck, Zap } from "lucide-react";

const aboutusData = [
  {
    icon: ScanLine,
    title: "AI Powered",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "On-Chain",
    color: "bg-teal-400/10 text-teal-400",
  },
  {
    icon: Zap,
    title: "Instant",
    color: "bg-orange-400/10 text-orange-400",
  },
];

const statisticsCounter = [
  {
    title: "Receipts Processed",
    count: 1200,
  },
  {
    title: "On-Chain Settlements",
    count: 800,
  },
  {
    title: "Groups Served",
    count: 500,
  },
];

const AboutAndStats01 = () => {
  return <AboutUs aboutusData={aboutusData} statisticsCounter={statisticsCounter} />;
};

export default AboutAndStats01;

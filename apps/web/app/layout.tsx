import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Splyt",
  description: "AI-powered bill splitting on Celo",
  other: {
    "talentapp:project_verification": "1df172a6fcd47def75dfff583b6f90afe8372ff64d215bccd49ed6ab9e2afe3965b8f860fd61752a8cafb9d182d5643e5459b0c5628d569b2d9d1095687b1386"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}

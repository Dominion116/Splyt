import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Splyt",
  description: "AI-powered bill splitting on Celo",
  icons: {
    icon: [
      { url: "https://res.cloudinary.com/dhhq7xc6g/image/upload/q_auto/f_auto/v1778352805/ChatGPT_Image_May_9_2026_07_49_20_PM_yximpn.png", type: "image/png" }
    ]
  },
  other: {
    "talentapp:project_verification": "1df172a6fcd47def75dfff583b6f90afe8372ff64d215bccd49ed6ab9e2afe3965b8f860fd61752a8cafb9d182d5643e5459b0c5628d569b2d9d1095687b1386"
  }
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('splyt.theme');
    var theme = (stored === 'light' || stored === 'dark') ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

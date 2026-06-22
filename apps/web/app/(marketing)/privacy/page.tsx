import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/shadcn-space/blocks/footer-01/footer";
import { SectionAnchor } from "@/components/legal/SectionAnchor";
import { TableOfContents } from "@/components/legal/TableOfContents";
import { BackToTop } from "@/components/legal/BackToTop";
import { JumpToDropdown } from "@/components/legal/JumpToDropdown";
import { ReadingProgress } from "@/components/legal/ReadingProgress";

export const metadata: Metadata = {
  title: "Privacy Policy — Splyt",
  description: "Read the Splyt Privacy Policy.",
};

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    body: `Splyt ("we", "us", or "our") operates a decentralised bill-splitting application built on the Celo blockchain. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.`,
  },
  {
    id: "data-collected",
    title: "2. Information We Collect",
    body: `We may collect the following types of information:\n\n• Wallet address: Your public blockchain address when you connect a wallet to the Service.\n• Receipt images: Images you upload for AI-powered scanning. These are processed to extract line-item data and are not retained beyond the active session unless you explicitly save a split.\n• Usage data: Anonymised analytics such as pages visited, feature usage, and session duration to help us improve the Service.\n• Communications: Any messages or enquiries you send to hello@splyt.app.`,
  },
  {
    id: "data-use",
    title: "3. How We Use Your Information",
    body: `We use the information we collect to:\n\n• Provide, operate, and maintain the Service;\n• Process receipt data and calculate bill splits;\n• Facilitate on-chain payment settlements;\n• Improve, personalise, and expand the Service;\n• Understand and analyse usage patterns;\n• Respond to your comments, questions, and requests;\n• Send you technical notices and support messages.`,
  },
  {
    id: "blockchain-data",
    title: "4. Blockchain Data",
    body: `Transaction data recorded on the Celo blockchain is public by nature. Once a settlement transaction is submitted to the network, it is permanently and publicly visible. We have no ability to alter, delete, or hide on-chain data. Your wallet address and transaction amounts will be visible on-chain to anyone who looks.`,
  },
  {
    id: "data-sharing",
    title: "5. Sharing of Information",
    body: `We do not sell, trade, or otherwise transfer your personal information to third parties, except:\n\n• Service providers: We may share information with trusted third-party service providers who assist us in operating the Service (e.g., AI receipt-parsing APIs), subject to confidentiality obligations.\n• Legal requirements: We may disclose information where required by law, court order, or governmental authority.\n• Business transfers: In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of that transaction.`,
  },
  {
    id: "cookies",
    title: "6. Cookies & Tracking",
    body: `We use minimal cookies and local storage to maintain session state and theme preferences. We do not use third-party advertising trackers. You can instruct your browser to refuse all cookies, though some parts of the Service may not function properly as a result.`,
  },
  {
    id: "retention",
    title: "7. Data Retention",
    body: `We retain personal data only as long as necessary for the purposes set out in this policy, or as required by law. Receipt images uploaded for scanning are deleted from our servers after processing unless you choose to save a session. Anonymised analytics data may be retained indefinitely.`,
  },
  {
    id: "security",
    title: "8. Security",
    body: `We implement appropriate technical and organisational measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your wallet credentials and private keys — we never have access to these.`,
  },
  {
    id: "third-party",
    title: "9. Third-Party Links",
    body: `The Service may contain links to third-party websites or services. We have no control over the content, privacy policies, or practices of third-party sites. We encourage you to review the privacy policies of any third-party sites you visit.`,
  },
  {
    id: "childrens-privacy",
    title: "10. Children's Privacy",
    body: `The Service is not directed at individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected personal data from a child under 18, we will take steps to delete that information.`,
  },
  {
    id: "your-rights",
    title: "11. Your Rights",
    body: `Depending on your jurisdiction, you may have the right to access, correct, or delete personal information we hold about you, or to object to or restrict certain processing. To exercise any of these rights, please contact us at hello@splyt.app. Note that we cannot modify or delete data that has been recorded on the blockchain.`,
  },
  {
    id: "policy-changes",
    title: "12. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this page. Your continued use of the Service after any changes constitutes your acceptance of the new policy.`,
  },
  {
    id: "contact",
    title: "13. Contact Us",
    body: `If you have questions or concerns about this Privacy Policy, please contact us at hello@splyt.app.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <ReadingProgress />
      <main className="max-w-6xl mx-auto px-4 xl:px-0 py-20">
        <div className="mb-12">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition mb-8 inline-block"
          >
            ← Back to home
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight mb-3">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: June 16, 2026</p>
        </div>

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <TableOfContents sections={sections} />
            </div>
          </aside>

          <div>
            <div className="lg:hidden mb-8 print:hidden">
              <JumpToDropdown sections={sections} />
            </div>

            <div className="flex flex-col gap-10">
              {sections.map(({ id, title, body }) => (
                <section key={id} id={id} className="scroll-mt-8 group rounded-lg transition-colors hover:bg-muted/30 px-4 -mx-4 py-2">
                  <h2 className="text-lg font-semibold mb-3 flex items-center">
                    {title}
                    <SectionAnchor id={id} />
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">{body}</p>
                </section>
              ))}
            </div>

            <div className="mt-16 pt-8 border-t border-border text-sm text-muted-foreground flex flex-wrap gap-4 print:hidden">
              <Link href="/terms" className="hover:text-foreground transition">Terms of Service</Link>
              <Link href="/" className="hover:text-foreground transition">Home</Link>
            </div>
          </div>
        </div>
      </main>
      <BackToTop />
      <Footer />
    </>
  );
}

export type LegalSection = {
  id: string;
  title: string;
  body: string;
};

export const termsSections: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: `By accessing or using Splyt ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms apply to all visitors, users, and others who access or use the Service.`,
  },
  {
    id: "description",
    title: "2. Description of Service",
    body: `Splyt is a decentralised bill-splitting application that allows users to divide shared expenses and settle payments on the Celo blockchain. The Service includes receipt scanning powered by AI, on-chain payment settlement, group session management, and related features.`,
  },
  {
    id: "eligibility",
    title: "3. Eligibility",
    body: `You must be at least 18 years of age and legally capable of entering into a binding contract in your jurisdiction to use the Service. By using Splyt you represent and warrant that you meet these requirements.`,
  },
  {
    id: "blockchain",
    title: "4. Blockchain & Wallet Usage",
    body: `Splyt interacts with the Celo blockchain. You are solely responsible for the security of your wallet and private keys. We never have custody of your funds. All on-chain transactions are irreversible — please review every transaction carefully before signing. Gas fees and network fees are your responsibility and may fluctuate.`,
  },
  {
    id: "responsibilities",
    title: "5. User Responsibilities",
    body: `You agree not to (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorised access to any part of the Service; (c) upload malicious code or interfere with the Service's operation; (d) use the Service to process transactions that violate applicable laws, including anti-money laundering or sanctions regulations.`,
  },
  {
    id: "ai-scanning",
    title: "6. AI Receipt Scanning",
    body: `The AI-powered receipt scanning feature is provided as a convenience tool. Extracted data may contain errors. You are responsible for verifying all amounts before initiating any settlement. Splyt is not liable for inaccuracies produced by the AI parser.`,
  },
  {
    id: "ip",
    title: "7. Intellectual Property",
    body: `All content, trademarks, and software comprising the Service are owned by or licensed to Splyt. You are granted a limited, non-exclusive, non-transferable licence to use the Service for its intended purpose. You may not copy, modify, distribute, sell, or lease any part of the Service without our express written permission.`,
  },
  {
    id: "warranties",
    title: "8. Disclaimer of Warranties",
    body: `The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses.`,
  },
  {
    id: "liability",
    title: "9. Limitation of Liability",
    body: `To the fullest extent permitted by law, Splyt and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in connection with your use of the Service.`,
  },
  {
    id: "indemnification",
    title: "10. Indemnification",
    body: `You agree to defend, indemnify, and hold harmless Splyt and its affiliates from any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your access to or use of the Service or your violation of these Terms.`,
  },
  {
    id: "termination",
    title: "11. Termination",
    body: `We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.`,
  },
  {
    id: "governing-law",
    title: "12. Governing Law",
    body: `These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising under these Terms shall be resolved through binding arbitration or in a court of competent jurisdiction, as determined by applicable law.`,
  },
  {
    id: "changes",
    title: "13. Changes to Terms",
    body: `We may revise these Terms at any time. We will notify users of material changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance of the revised Terms.`,
  },
  {
    id: "contact",
    title: "14. Contact",
    body: `If you have questions about these Terms, please contact us at hello@splyt.app.`,
  },
];

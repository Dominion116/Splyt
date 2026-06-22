"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

export function SectionAnchor({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <a
      href={`#${id}`}
      onClick={handleClick}
      aria-label={copied ? "Link copied!" : "Copy link to section"}
      className="ml-2 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
    >
      <Link2 size={14} />
    </a>
  );
}

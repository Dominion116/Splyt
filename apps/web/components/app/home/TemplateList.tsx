"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteTemplate, listTemplates } from "@/lib/templates";
import type { Template } from "@/lib/templates";
import type { Address, SplitMode } from "@/lib/types";

interface Props {
  onUseTemplate: (members: Address[], mode: SplitMode) => void;
}

export function TemplateList({ onUseTemplate }: Props) {
  const [templates, setTemplates] = useState<Template[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTemplates()
      .then((items) => {
        if (!cancelled) setTemplates(items.sort((a, b) => b.createdAt - a.createdAt));
      })
      .catch(() => setTemplates([]));
    return () => { cancelled = true; };
  }, []);

  if (!templates || templates.length === 0) return null;

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    setTemplates((prev) => prev?.filter((t) => t.id !== id) ?? []);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Templates</span>
      <ul className="flex flex-col gap-2">
        {templates.map((template) => (
          <li
            key={template.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card p-4"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{template.name || "Unnamed template"}</span>
              <span className="text-xs text-muted-foreground">
                {template.members.length} member{template.members.length !== 1 ? "s" : ""} · {template.mode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUseTemplate(template.members, template.mode)}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
              >
                Use
              </button>
              <button
                type="button"
                onClick={() => handleDelete(template.id)}
                aria-label="Delete template"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/50 transition hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

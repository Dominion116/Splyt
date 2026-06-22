"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteTemplate, listTemplates } from "@/lib/templates";
import type { Template } from "@/lib/templates";
import type { Address, SplitMode } from "@/lib/types";

interface Props {
  onUseTemplate: (members: Address[], mode: SplitMode) => void;
}

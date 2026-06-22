import type { Address, SplitMode } from "./types";

export interface Template {
  id: string;
  name: string;
  members: Address[];
  mode: SplitMode;
  createdAt: number;
}

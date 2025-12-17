import { atom } from "jotai";
import type { RuleBasedResult } from "@/types/game";

export const ruleBasedResultArrayState = atom<RuleBasedResult[]>([]);

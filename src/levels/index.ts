import { ACT1 } from "./act1-transit";
import { ACT2 } from "./act2-office";
import { ACT3 } from "./act3-rooftops";
import type { LevelDef } from "./types";

export const LEVELS: LevelDef[] = [...ACT1, ...ACT2, ...ACT3];
export const ACT_NAMES: Record<number, string> = {
  1: "TRANSIT",
  2: "OFFICE TOWER",
  3: "ROOFTOPS"
};

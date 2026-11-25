// Shape of level data produced by LevelBuilder and consumed by the simulation and level loader.
import type { EnemyKind, ItemKind, Vec3 } from "../sim/types";

export type MaterialName = "floor" | "wall" | "dark" | "light" | "trim" | "metal" | "accent" | "glow" | "window";
export type ThemeName = "transit" | "office" | "rooftop";

export interface BoxDef {
  min: Vec3;
  max: Vec3;
  mat: MaterialName;
  /** False for decoration (light strips) that is rendered but not collided with. */
  collide: boolean;
}

/** Axis-aligned rectangle on the floor plane: [x0, z0, x1, z1]. */
export type Rect = number[];

export type WaveTrigger =
  | { type: "start" }
  | { type: "remaining"; count: number }
  | { type: "zone"; rect: Rect }
  | { type: "time"; seconds: number };

export interface SpawnDef {
  kind: EnemyKind;
  /** [x, z] on the floor, or [x, y, z]. */
  pos: number[];
  yaw?: number;
  /** undefined = the enemy kind's default weapon, null = unarmed. */
  weapon?: ItemKind | null;
  idle?: boolean;
}

export interface WaveDef {
  when: WaveTrigger;
  delay?: number;
  spawns: SpawnDef[];
}

export interface LevelMeta {
  id: string;
  name: string;
  act: number;
  theme: ThemeName;
  /** Title-card words shown before the level starts. */
  words: string[];
  seed: number;
  player: { pos: Vec3; yaw: number; item?: ItemKind };
  props: { kind: ItemKind; pos: Vec3 }[];
  waves: WaveDef[];
  maxActive?: number;
  exit?: { rect: Rect; requiresClear: boolean };
}

export interface LevelDef extends LevelMeta {
  boxes: BoxDef[];
}
/** Wall side: n = -z, s = +z, w = -x, e = +x. */
export type DoorSide = "n" | "s" | "w" | "e";
/** An opening in a wall built by LevelBuilder.wallWithDoors* / room. */
export interface DoorDef {
  side: DoorSide;
  /** Centre of the opening along the wall. */
  at: number;
  width: number;
  /** Opening height; defaults to the full wall height (no lintel). */
  height?: number;
}
export interface RoomOptions {
  /** Wall thickness (default 0.4). */
  t?: number;
  mat?: MaterialName;
  doors?: DoorDef[];
  /** Set to false to omit the floor. */
  floor?: boolean;
  floorMat?: MaterialName;
  ceiling?: boolean;
}

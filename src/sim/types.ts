// Shared data shapes of the simulation. Plain data only: no classes, no behaviour.
import type { NavGrid } from "./nav-grid";
import type { StaticWorld } from "./static-world";

/** x, y, z. Plain arrays are used everywhere (wgpu-matrix accepts them too). */
export type Vec3 = number[];

/** Axis-aligned box used for collision. */
export interface Aabb {
  min: Vec3;
  max: Vec3;
}

/** Collision + navigation data that can be shared between worlds of the same level (e.g. replays). */
export interface SharedStatic {
  static: StaticWorld;
  nav: NavGrid;
}

/** Mouse-look settings passed to PlayerController. */
export interface LookSettings {
  sensitivity: number;
  invertY: boolean;
}

/** A marksman's aiming laser, as returned by World.activeLasers(). */
export interface Laser {
  origin: Vec3;
  dir: Vec3;
  progress: number;
}

export type WeaponKind = "pistol" | "scatter" | "carbine" | "blade";
/** Weapons that shoot projectiles (everything but the blade). */
export type GunKind = Exclude<WeaponKind, "blade">;
export type PropKind = "bottle" | "brick" | "mug";
export type ItemKind = WeaponKind | PropKind;

export interface Item {
  kind: ItemKind;
  ammo: number;
}

export interface WeaponDef {
  kind: WeaponKind;
  ammo: number;
  cooldown: number;
  pellets: number;
  spread: number;
  burst: number;
  burstInterval: number;
  melee: boolean;
  muzzle: Vec3;
}

export type EnemyKind = "walker" | "rusher" | "marksman";
export type EnemyState = "idle" | "alert" | "pursue" | "stunned";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  alive: boolean;
  pos: Vec3;
  prevPos: Vec3;
  vel: Vec3;
  yaw: number;
  prevYaw: number;
  grounded: boolean;
  state: EnemyState;
  stateTime: number;
  hp: number;
  weapon: Item | null;
  fireCooldown: number;
  burstLeft: number;
  burstTimer: number;
  aimTimer: number;
  telegraph: number;
  lockedDir: Vec3;
  meleeT: number;
  prevMeleeT: number;
  meleeCooldown: number;
  stunTimer: number;
  path: Vec3[] | null;
  pathIndex: number;
  repathTimer: number;
  seesPlayer: boolean;
  walkPhase: number;
  prevWalkPhase: number;
  moveBlend: number;
  prevMoveBlend: number;
  aimBlend: number;
  prevAimBlend: number;
  aimPitch: number;
  hitFlash: number;
  spawnT: number;
  prevSpawnT: number;
  strafeSeed: number;
  targetPropId: number;
  lastShotId: number;
}

/** An item lying in (or flying through) the world. */
export interface Prop {
  id: number;
  item: Item;
  pos: Vec3;
  prevPos: Vec3;
  vel: Vec3;
  rot: Vec3;
  prevRot: Vec3;
  angVel: Vec3;
  /** True while a throw can still hit an enemy. */
  thrown: boolean;
  sleeping: boolean;
  restTimer: number;
  alive: boolean;
  /** Id of the enemy walking to pick this up, or -1. */
  claimedBy: number;
}

export interface Projectile {
  pos: Vec3;
  prevPos: Vec3;
  vel: Vec3;
  spawnPos: Vec3;
  /** 0 = player, otherwise the enemy id. */
  ownerId: number;
  /** Pellets of one volley share an id so they don't clash with each other. */
  shotId: number;
  age: number;
  alive: boolean;
}

/** The world's copy of the player (combat state; movement comes from PlayerController). */
export interface PlayerState {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  grounded: boolean;
  alive: boolean;
  invulnerable: boolean;
  held: Item | null;
  fireCooldown: number;
  burstLeft: number;
  burstTimer: number;
  punchCooldown: number;
  punchSide: number;
  punchAge: number;
  recoilAge: number;
  throwAge: number;
  slashAge: number;
  pickupAge: number;
}

/** One rendered frame of player input; also the unit stored by the replay recorder. */
export interface PlayerFrame {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  grounded: boolean;
  fire: boolean;
  throwItem: boolean;
  interact: boolean;
  /** Fixed simulation steps that ran after this input. */
  steps: number;
}

/** Events the simulation emits for audio and visual effects (drained by Game.handleEvents). */
export type WorldEvent =
  | { type: "shot"; pos: Vec3; dir: Vec3; weapon: ItemKind; byPlayer: boolean }
  | { type: "impact"; pos: Vec3; normal: Vec3 }
  | { type: "enemyDeath"; enemy: Enemy; dir: Vec3; point: Vec3; silent: boolean }
  | { type: "enemyHit"; pos: Vec3; dir: Vec3 }
  | { type: "playerDeath"; dir: Vec3 }
  | { type: "bulletClash"; pos: Vec3 }
  | { type: "slice"; pos: Vec3; dir: Vec3 }
  | { type: "punch"; hit: boolean; pos: Vec3 }
  | { type: "slash"; hit: boolean }
  | { type: "throw" }
  | { type: "pickup"; kind: ItemKind }
  | { type: "dryFire" }
  | { type: "itemBreak"; pos: Vec3; kind: ItemKind }
  | { type: "propImpact"; pos: Vec3; speed: number }
  | { type: "spawn"; pos: Vec3 }
  | { type: "melee"; pos: Vec3 }
  | { type: "telegraph" };

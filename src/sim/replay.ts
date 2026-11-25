import { FIXED_STEP } from "../engine/loop";
import { World } from "./world";
import type { LevelDef } from "../levels/types";
import type { PlayerFrame, SharedStatic } from "./types";

export class ReplayRecorder {
  frames: PlayerFrame[] = [];
  reset(): void {
    this.frames = [];
  }
  push(f: PlayerFrame): void {
    this.frames.push({ ...f, pos: [...f.pos], vel: [...f.vel] });
  }
  setLastSteps(steps: number): void {
    const last = this.frames[this.frames.length - 1];
    if (last)
      last.steps += steps;
  }
}
export class ReplayPlayer {
  frames: PlayerFrame[];
  world: World;
  index = 0;
  simPlayed = 0;
  clock = 0;
  speed = 1;
  constructor(def: LevelDef, frames: PlayerFrame[], shared: SharedStatic) {
    this.frames = frames;
    this.world = new World(def, shared);
  }
  get done(): boolean {
    return this.index >= this.frames.length;
  }
  get progress(): number {
    return this.frames.length === 0 ? 1 : this.index / this.frames.length;
  }
  current: PlayerFrame | null = null;
  update(realDt: number): number {
    this.clock += realDt * this.speed;
    let steps = 0;
    let applied = 0;
    while (this.index < this.frames.length && (this.simPlayed < this.clock || applied === 0)) {
      const f = this.frames[this.index++];
      this.world.applyPlayerFrame({ ...f, pos: [...f.pos], vel: [...f.vel] });
      for (let i = 0; i < f.steps; i++)
        this.world.step(FIXED_STEP);
      this.simPlayed += f.steps * FIXED_STEP;
      steps += f.steps;
      this.current = f;
      applied++;
      if (applied > 2e3)
        break;
    }
    return steps;
  }
}

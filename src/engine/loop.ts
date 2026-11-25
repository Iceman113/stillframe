/** Debug override of the time scale: F2 freezes the world, F3 forces real time. */
export type TimeLock = "none" | "frozen" | "realtime";
export interface LoopCallbacks {
  /** Once per rAF, on real time (input, player, time scale). */
  frame(t: Time): void;
  /** Zero or more times per rAF, each advancing the world by FIXED_STEP of sim time. */
  fixedStep(t: Time): void;
  /** Once per rAF after the fixed steps. */
  render(t: Time): void;
}
export const FIXED_STEP = 1 / 120;
const MAX_REAL_DT = 0.1;
const MAX_STEPS_PER_FRAME = 8;
export class Time {
  realDt = 0;
  simDt = 0;
  timeScale = 1;
  lock: TimeLock = "none";
  realTime = 0;
  simTime = 0;
  alpha = 0;
  stepsThisFrame = 0;
  frame = 0;
  accumulator = 0;
  lastNow = -1;
  beginFrame(now: number): void {
    if (this.lastNow < 0)
      this.lastNow = now;
    this.realDt = Math.min(MAX_REAL_DT, Math.max(0, (now - this.lastNow) / 1e3));
    this.lastNow = now;
    this.realTime += this.realDt;
    this.frame++;
    this.stepsThisFrame = 0;
  }
  advanceSim(): void {
    const scale2 = this.effectiveScale();
    this.simDt = this.realDt * scale2;
    this.accumulator += this.simDt;
  }
  consumeStep(): boolean {
    if (this.accumulator < FIXED_STEP)
      return false;
    if (this.stepsThisFrame >= MAX_STEPS_PER_FRAME) {
      this.accumulator = 0;
      return false;
    }
    this.accumulator -= FIXED_STEP;
    this.simTime += FIXED_STEP;
    this.stepsThisFrame++;
    return true;
  }
  endSteps(): void {
    this.alpha = this.accumulator / FIXED_STEP;
  }
  clearAccumulator(): void {
    this.accumulator = 0;
    this.alpha = 0;
  }
  resetBaseline(): void {
    this.lastNow = -1;
    this.accumulator = 0;
  }
  effectiveScale(): number {
    switch (this.lock) {
      case "frozen":
        return 0;
      case "realtime":
        return 1;
      default:
        return this.timeScale;
    }
  }
}

export class Loop {
  callbacks: LoopCallbacks;
  time = new Time();
  running = false;
  handle = 0;
  constructor(callbacks: LoopCallbacks) {
    this.callbacks = callbacks;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden)
        this.time.resetBaseline();
    });
  }
  start(): void {
    if (this.running)
      return;
    this.running = true;
    this.time.resetBaseline();
    this.handle = requestAnimationFrame(this.tick);
  }
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }
  tick = (now: number): void => {
    if (!this.running)
      return;
    const t = this.time;
    t.beginFrame(now);
    this.callbacks.frame(t);
    t.advanceSim();
    while (t.consumeStep())
      this.callbacks.fixedStep(t);
    t.endSteps();
    this.callbacks.render(t);
    this.handle = requestAnimationFrame(this.tick);
  };
}

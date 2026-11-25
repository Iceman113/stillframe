import type { BoxDef, DoorDef, DoorSide, LevelDef, LevelMeta, MaterialName, RoomOptions } from "./types";
export type { LevelBuilder };
class LevelBuilder {
  boxes: BoxDef[] = [];
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: MaterialName = "wall", collide = true): this {
    const min = [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)];
    const max = [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)];
    this.boxes.push({ min, max, mat, collide });
    return this;
  }
  floor(x0: number, z0: number, x1: number, z1: number, y = 0, mat: MaterialName = "floor"): this {
    return this.box(x0, y - 0.4, z0, x1, y, z1, mat);
  }
  ceiling(x0: number, z0: number, x1: number, z1: number, y: number, mat: MaterialName = "dark"): this {
    return this.box(x0, y, z0, x1, y + 0.3, z1, mat);
  }
  wallX(x0: number, x1: number, z: number, h: number, t = 0.3, mat: MaterialName = "wall", y0 = 0): this {
    return this.box(x0, y0, z - t / 2, x1, y0 + h, z + t / 2, mat);
  }
  wallZ(z0: number, z1: number, x: number, h: number, t = 0.3, mat: MaterialName = "wall", y0 = 0): this {
    return this.box(x - t / 2, y0, z0, x + t / 2, y0 + h, z1, mat);
  }
  wallWithDoorsX(x0: number, x1: number, z: number, h: number, doors: DoorDef[], t = 0.3, mat: MaterialName = "wall", y0 = 0): this {
    this.segmented(x0, x1, doors, h, (a, b) => this.wallX(a, b, z, h, t, mat, y0), (a, b, dh) => this.box(a, y0 + dh, z - t / 2, b, y0 + h, z + t / 2, mat));
    return this;
  }
  wallWithDoorsZ(z0: number, z1: number, x: number, h: number, doors: DoorDef[], t = 0.3, mat: MaterialName = "wall", y0 = 0): this {
    this.segmented(z0, z1, doors, h, (a, b) => this.wallZ(a, b, x, h, t, mat, y0), (a, b, dh) => this.box(x - t / 2, y0 + dh, a, x + t / 2, y0 + h, b, mat));
    return this;
  }
  segmented(a0: number, a1: number, doors: DoorDef[], h: number, solid: (a: number, b: number) => void, lintel: (a: number, b: number, dh: number) => void): void {
    const gaps = doors.map((d) => [d.at - d.width / 2, d.at + d.width / 2, d.height ?? h]).sort((p, q) => p[0] - q[0]);
    let cur = a0;
    for (const [g0, g1, gh] of gaps) {
      if (g0 > cur)
        solid(cur, g0);
      if (gh < h)
        lintel(g0, g1, gh);
      cur = Math.max(cur, g1);
    }
    if (cur < a1)
      solid(cur, a1);
  }
  room(x0: number, z0: number, x1: number, z1: number, h: number, opts: RoomOptions = {}): this {
    const t = opts.t ?? 0.4;
    const mat = opts.mat ?? "wall";
    const doors = opts.doors ?? [];
    const on = (s: DoorSide) => doors.filter((d) => d.side === s);
    if (opts.floor !== false)
      this.floor(x0 - t, z0 - t, x1 + t, z1 + t, 0, opts.floorMat ?? "floor");
    if (opts.ceiling)
      this.ceiling(x0 - t, z0 - t, x1 + t, z1 + t, h);
    this.wallWithDoorsX(x0 - t, x1 + t, z0 - t / 2, h, on("n"), t, mat);
    this.wallWithDoorsX(x0 - t, x1 + t, z1 + t / 2, h, on("s"), t, mat);
    this.wallWithDoorsZ(z0, z1, x0 - t / 2, h, on("w"), t, mat);
    this.wallWithDoorsZ(z0, z1, x1 + t / 2, h, on("e"), t, mat);
    return this;
  }
  pillar(x: number, z: number, size: number, h: number, mat: MaterialName = "dark"): this {
    return this.box(x - size / 2, 0, z - size / 2, x + size / 2, h, z + size / 2, mat);
  }
  crate(x: number, z: number, w: number, h: number, d: number, y = 0, mat: MaterialName = "light"): this {
    return this.box(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, mat);
  }
  strip(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: MaterialName = "accent"): this {
    return this.box(x0, y0, z0, x1, y1, z1, mat, false);
  }
  stairsZ(x0: number, x1: number, zStart: number, steps: number, rise: number, run: number, dir = 1, baseY = 0, mat: MaterialName = "trim"): this {
    for (let i = 0; i < steps; i++) {
      const za = zStart + dir * i * run;
      const zb = za + dir * run;
      this.box(x0, baseY - 0.4, za, x1, baseY + (i + 1) * rise, zb, mat);
    }
    return this;
  }
  stairsX(z0: number, z1: number, xStart: number, steps: number, rise: number, run: number, dir = 1, baseY = 0, mat: MaterialName = "trim"): this {
    for (let i = 0; i < steps; i++) {
      const xa = xStart + dir * i * run;
      const xb = xa + dir * run;
      this.box(xa, baseY - 0.4, z0, xb, baseY + (i + 1) * rise, z1, mat);
    }
    return this;
  }
  platform(x0: number, z0: number, x1: number, z1: number, y: number, mat: MaterialName = "floor"): this {
    return this.box(x0, y - 0.4, z0, x1, y, z1, mat);
  }
  rail(x0: number, z0: number, x1: number, z1: number, y = 0, h = 1, mat: MaterialName = "metal"): this {
    return this.box(x0, y, z0, x1, y + h, z1, mat);
  }
  lights(x0: number, z0: number, x1: number, z1: number, y: number, spacing: number, mat: MaterialName = "accent"): this {
    for (let x = x0; x <= x1 + 1e-6; x += spacing) {
      for (let z = z0; z <= z1 + 1e-6; z += spacing) {
        this.strip(x - 0.6, y - 0.06, z - 0.08, x + 0.6, y, z + 0.08, mat);
      }
    }
    return this;
  }
}

export function level(meta: LevelMeta, build: (b: LevelBuilder) => void): LevelDef {
  const b = new LevelBuilder();
  build(b);
  return { ...meta, boxes: b.boxes };
}

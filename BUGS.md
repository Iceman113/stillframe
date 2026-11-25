# Bugs

## Suspected during Parts 1–2 (not fixed yet)

Found while reading and restructuring the code. Per the lab rules, none of these has been changed. Line references are to the current `src/` files. Each entry gets full reproduction steps, root cause, fix and verification in Part 3.

1. **Level 1-1 can't be started on a fresh save.**
   - Where: `src/ui/ui.ts`, `Ui.isUnlocked`.
   - What happens: for index 0, `this.levels[-1]` is `undefined`, so the method returns `false`. `Game.startLevel(0)` then returns early: PLAY does nothing, and 1-1 shows LOCKED.
   - Why it looks wrong: the first level should always be unlocked.
   - Observed: in the original build, clicking PLAY with empty `localStorage` leaves the title screen up.
2. **Time never slows down, so the core mechanic is gone.**
   - Where: `src/game/game.ts`, `Game.frame`, case `"playing"`.
   - What happens: the call is `driver.update(dt, WALK_SPEED, this.player.planarSpeed, …)`, but the signature is `update(realDt, planarSpeed, maxSpeed, …)`. That gives `moveInput = clamp(4 / speed, 0, 1)`, which is 1 when standing still (4/0 = ∞) and 1 when walking.
   - Why it looks wrong: the game says "time moves only when you move".
3. **The replay head-bob uses distance from the world origin.**
   - Where: `src/game/game.ts`, `Game.render`.
   - What happens: in the replay, the viewmodel stride is `Math.hypot(current.pos[0], current.pos[2])`, the distance from the world origin. Live play uses the accumulated walking distance (`player.stride`).
   - Why it looks wrong: the hands in the replay bob according to where you stand, not how far you walked.
4. **A claimed gun is never released.**
   - Where: `src/sim/world.ts`, `findGunPropFor` / `enemyPickUp`.
   - What happens: `Prop.claimedBy` is set when an enemy starts walking to a gun and is never cleared. If that enemy dies before picking the gun up, no other enemy will ever go for it.
   - Why it looks wrong: an unarmed enemy ignores a gun on the floor right next to it.
5. **`Game.resume` skips `setState`.**
   - Where: `src/game/game.ts`, `Game.resume`.
   - What happens: it assigns `this.state` directly and then may call `beginIntro(["GO."])`. When no input has been recorded yet, resuming shows a second intro.
   - Why it looks wrong: it may be intended, but it's the only state change that bypasses `setState`.
6. **The marksman laser duration is duplicated.**
   - Where: `src/sim/world.ts`, `activeLasers`.
   - What happens: it divides by the literal `0.6` instead of the `TELEGRAPH` constant in `enemy-ai.ts`.
   - Why it looks wrong: the two values match today, but changing `TELEGRAPH` would desynchronise the laser animation from the shot.
7. **A dead term in the enemy pose.**
   - Where: `src/view/enemy-pose.ts`.
   - What happens: `-0.12 + support * 0` is always `-0.12`.
   - Why it looks wrong: it looks like a leftover tuning factor. It has no visible effect.
8. **A matrix is allocated per arm per frame.**
   - Where: `src/view/viewmodel.ts`, `drawArm`.
   - What happens: `mat4.translate(hand, [...])` has no destination argument, so it allocates a new matrix every time an arm is drawn. Every other call reuses a scratch matrix.
   - Why it looks wrong: this is a performance issue only, not a visible one.

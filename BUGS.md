# Bugs

## Fixed in Part 3

Verified with scripted sessions in headless Chrome. They use the real dev build, real pointer lock and the F4 overlay values, plus screenshots. A manual play-through of levels 1-1 to 1-3 is still to do.

### B1. PLAY does nothing; level 1-1 is locked
- **Reproduce:** clear `localStorage`, load the game, click PLAY.
- **Seen:** the title screen stays. In LEVELS, 1-1 shows LOCKED.
- **Root cause:** `src/ui/ui.ts`, `Ui.isUnlocked`. The guard was `index < 0`, so for index 0 the code read `levels[-1]`, got `undefined` and returned `false`. `Game.startLevel` then returned early.
- **Fix:** the guard is now `index <= 0`. The first level is always unlocked.
- **Verified:** PLAY now shows the 1-1 title card, pointer lock engages and the state becomes `playing`. Other levels still unlock only after the previous one is cleared.

### B2. Time never slows down
- **Reproduce:** enter a level, press F4 and stand still.
- **Seen:** `timeScale 1.000` whether moving or not. Enemies and bullets move at full speed.
- **Root cause:** `src/game/game.ts`, `Game.frame` (case `"playing"`). The call `driver.update(dt, WALK_SPEED, planarSpeed, …)` had its two speed arguments swapped against `TimeScaleDriver.update(realDt, planarSpeed, maxSpeed, …)`. That made `moveInput = clamp(4 / speed)`, which is 1 when standing (4/0) and 1 when walking.
- **Fix:** the arguments are now in the right order.
- **Verified:** standing still reads `timeScale 0.015`, walking reads `1.000`, and stopping returns to `0.015`.
- **Revealed:** B3 and B4 only became visible once this was fixed.

### B3. Mouse look is mirrored horizontally
- **Reproduce:** in 1-1, move the mouse to the right.
- **Seen:** the view turns left. The enemy straight ahead moves to the right edge of the screen.
- **When:** horizontal look only. Vertical look and WASD directions are correct.
- **Root cause:** `src/sim/player-controller.ts`, `PlayerController.look` did `yaw += mouseDx * sensitivity`. In this code yaw grows counter-clockwise (forward = (−sin yaw, −cos yaw), right = (cos yaw, −sin yaw)), so a positive `mouseDx` turned the view left.
- **Fix:** `yaw -= mouseDx * sensitivity`.
- **Verified:** after moving the mouse 250 px to the right, the enemy that was straight ahead is now on the left of the screen, so the view turned right. Strafing with A/D still matches the view.

### B4. The screen goes black when an enemy bullet comes close
- **Reproduce:** in 1-2, step forward in short taps until the first walker fires.
- **Seen:** the whole frame turns almost black apart from the HUD while the bullet is in flight, which is exactly when you need to see it to dodge. It only happens while an enemy bullet is within about 16 m, or while a marksman is aiming.
- **Root cause:** `src/gfx/shaders/final.wgsl`, the danger effect `mapped *= 1.0 - post.danger.x * threatPulse`. Two things combined:
  - It darkens the entire screen by up to 100%.
  - `threatPulseRate` is 1 rad/s (`defaultPostParams` in `src/gfx/renderer.ts`), so the "pulse" stays near full strength for seconds and reads as a blackout rather than a warning.
- **Fix:** the darkening is now limited to the screen edges (the same falloff as the vignette) and to 40% at most, and it pulses at 8 rad/s.
- **Verified:** the same session now shows the walker, its muzzle flash and the corridor while bullets are in flight. Death and clear screens are unchanged.

### Checked and found not to be bugs
- **A thrown item to the head only stuns at about 5 m.** The throw arcs (gravity 16 m/s²), so it drops about 0.4 m over 5 m and hits the body. Up close, thrown headshots kill.
- **The "pillar blocks line of fire" scenario failed.** The enemy simply walked around the pillar and shot from the side, which is correct behaviour.

## Suspected during Parts 1–2 (not fixed yet)

Found while reading and restructuring the code. Per the lab rules, none of these has been changed. Line references are to the current `src/` files. Each entry gets full reproduction steps, root cause, fix and verification in Part 3.

Items 1 and 2 are fixed (B1, B2 above).

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

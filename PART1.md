# Part 1: Understanding STILLFRAME

All line numbers refer to the original `index.html` (commit `2eaaac8`, 7,421 lines).

## 1. The game in one paragraph

STILLFRAME is a first-person action game in the style of SUPERHOT. Enemies are glass-like humanoids (they shatter when killed), and the player starts each level unarmed. You win a level by killing every enemy across all of its spawn waves. Two levels (2-4 SERVER ROOM, 3-3 CROSSING) instead ask you to reach an exit zone. One hit from anything kills you, and the level restarts at once. There are 15 levels in 3 acts: Act 1 is a transit station (1-1 PLATFORM to 1-5 LAST TRAIN), Act 2 an office tower and Act 3 the rooftops (`LEVELS`, l. 3388). Each level unlocks when you clear the one before it. Progress, best times and settings are saved in `localStorage` under `stillframe.save` (l. 3735).

### The mechanic that makes it different

**Time moves only when you move.** The title screen tagline (l. 3542) and the intro of level 1-1 (`"TIME", "MOVES", "WHEN", "YOU", "MOVE."`, l. 2616) both say so. The player always moves in real time, while the world (enemies, bullets, thrown props) runs at a time scale between 0.015 and 1:

- `TimeScaleDriver.update` (l. 6177) picks the target scale as the largest of:
  - walking speed divided by maximum speed (0 to 1)
  - mouse-look speed, capped at 0.35 (`LOOK_WEIGHT`)
  - 1 for 0.12 s after any action such as a shot, throw or pickup (`actionKick`), or while a burst is still firing
  - at least 0.8 while airborne
- The scale never drops below `MIN = 0.015`. Standing still therefore makes the world crawl but never stop.
- It eases up quickly (`RISE = 0.05` s) and back down more slowly (`FALL = 0.1` s).

Because bullets are slow, visible projectiles (`BULLET_SPEED = 25`, l. 4792) rather than instant hitscan, the game becomes a spatial puzzle. You stand still, read where the bullets are going, and step through the gaps. Other systems tie into the time scale too: post effects (desaturation, aberration, `freeze`), the music's low-pass filter, the playback rate of sound effects, crosshair size and rotation, and the length of bullet trails.

### Controls (`DEFAULT_BINDINGS`, l. 1876; title screen, l. 3546)

| Input | Action |
|---|---|
| WASD / arrow keys | move (time runs while you move) |
| Mouse | look (pointer lock is required, so click the canvas) |
| Left mouse | context action: fire gun, slash blade, throw a non-weapon item, pick up the item you aim at, or punch |
| Right mouse | throw the held item |
| E | pick up (swaps with the held item) |
| Space | jump (time runs at 0.8 or more while airborne) |
| R | restart level |
| Esc | pause (actually releasing pointer lock triggers the pause, l. 6775) |
| F2 / F3 / F4 | debug: freeze time / force real time / FPS and timeScale overlay |
| Gamepad | standard mapping supported (`pollGamepad`, l. 2022) |

### Combat rules worth knowing

- Weapons (`WEAPONS`, l. 4795): pistol (6 rounds), scatter (3 rounds, 5 pellets), carbine (12 rounds, 3-round burst) and blade (melee, also cuts bullets out of the air). An empty gun is thrown when you click (`primaryAction`, l. 5333).
- Props are bottle, mug (both fragile) and brick. A thrown prop that hits an enemy's head kills it. A body hit disarms and stuns the enemy (`stepProps`, l. 5812).
- A punch disarms and stuns. All enemies have `hp: 2`, so the second punch kills.
- Enemies (`ENEMY_PARAMS`, l. 4826):
  - **walker**: pistol, keeps 6 m away and strafes.
  - **rusher**: no gun, runs at you for melee.
  - **marksman**: carbine. It shows a 0.6 s laser telegraph and then fires one aimed shot.
  - Unarmed walkers and marksmen run to the nearest gun on the floor and pick it up (`findGunPropFor`).
- Bullets collide with each other (`bulletClash`, l. 6038), so you can shoot an incoming bullet out of the air.
- After clearing a level you can watch a real-time **replay**. It is rebuilt by re-simulating the recorded player input against a fresh `World` (`ReplayPlayer`, l. 6585).

## 2. Code map

The file is one `<script type="module">` that imports `mat4`/`vec3` from a CDN (`wgpu-matrix`, l. 505). The code is clearly the output of a bundler (esbuild style): there are `var X = class _X {}` declarations, shaders named `scene_default` and so on, and name-collision suffixes like `GRAVITY2`, `GRAVITY3`, `WHITE2` and `lerp2`. Each block below was probably its own source file once.

| Lines | Subsystem | Responsibility |
|---|---|---|
| 8–494 | CSS | Canvas, HUD, title card, menu screens |
| 507–631 | `Gfx` | WebGPU adapter/device/context setup, canvas sizing, resolution scale, device-lost handling |
| 632–665 | `Mesh` | Vertex and index GPU buffers (10 floats per vertex: pos, normal, rgba) |
| 666–1134 | WGSL shaders | Template strings: `common`, `scene`, `shadow`, `glass`, `fx`, `post`, `outline`, `bloom`, `final` |
| 1135–1833 | `Renderer` | Pipelines, instance batching (`drawMesh`, `drawSegment`), the 8-pass frame (`render`, l. 1476) |
| 1834–1875 | `Camera` | View and projection matrices from position, yaw and pitch |
| 1876–2055 | `Input` | Keyboard, mouse, pointer lock, gamepad, action bindings, per-frame "pressed" edges |
| 2056–2157 | `Time`, `Loop` | rAF loop, fixed 1/120 s simulation step with an accumulator, time scale and debug locks |
| 2158–2232 | math helpers | `v3`, `lerp`, `approach`, `angleDiff`, … |
| 2233–2508 | `AudioEngine`, `SYNTHS` | Web Audio. Every sound is synthesised in code, and the music is a filtered drone that follows the time scale |
| 2509–3394 | `LevelBuilder` + 15 level defs | Box-based level DSL (`room`, `wallWithDoorsX`, `stairsZ`, …). Each level has player spawn, props, waves and an optional exit |
| 3395–3734 | `Ui` | DOM HUD, title cards, title/levels/settings/pause/results/replay screens, level unlocking |
| 3735–3778 | save | `loadSave` / `writeSave` to `localStorage` |
| 3779–3815 | `DebugOverlay` | FPS and timeScale text panel |
| 3816–3996 | `MeshBuilder`, `THEMES` | CPU mesh building from boxes; per-theme materials and lighting |
| 3997–4304 | `StaticWorld` | Spatial hash of level boxes: `raycast`, `lineClear`, `moveCharacter` (step-up and sliding), `resolveSphere` for props |
| 4305–4582 | `NavGrid` | 0.5 m walkability grid, A* `findPath` and path smoothing for enemies |
| 4583–4613 | level loading | `buildLevelMesh` produces a render mesh plus collision and nav data from a level def |
| 4614–4791 | `Rng`, mesh library | Seeded RNG; meshes for enemy body parts, items and gloves |
| 4792–4845 | item and enemy tables | `WEAPONS`, `ITEM_*`, `ENEMY_PARAMS`, hitbox sizes |
| 4846–5197 | enemy AI | `createEnemy`, `updateEnemy` (states idle, alert, pursue, stunned), shooting, melee, path following |
| 5198–6063 | `World` | **The simulation.** Player combat state, props, projectiles, waves, win and lose checks, the event queue |
| 6064–6160 | `PlayerController` | Player movement and look, collision against `StaticWorld`, pushback from enemies |
| 6161–6191 | `TimeScaleDriver` | **The core mechanic**: player activity turned into a time scale |
| 6192–6454 | `FxSystem` | Particles and glass shards (visual only, runs on sim time) |
| 6455–6570 | `Viewmodel` | First-person hands and weapon animation |
| 6571–6622 | `ReplayRecorder`/`Player` | Records one frame of player input per rendered frame and re-simulates it |
| 6623–6695 | `computePose` | Procedural enemy skeleton (walk, aim, melee, stun, spawn poses) |
| 6696–7387 | `Game` | Owns everything: state machine (`title`, `intro`, `playing`, `dead`, `cleared`, `results`, `paused`, `replay`), glue between simulation and presentation |
| 7394–7419 | `boot` | Creates `Gfx`, then `Game`, then `start()`; shows the "WebGPU required" panel on failure |

### How the subsystems depend on each other

```
boot ─► Gfx ─► Game ──┬─► Loop/Time ─(callbacks: frame, fixedStep, render)─► Game
                      ├─► Input, Ui, AudioEngine, DebugOverlay, save
                      ├─► PlayerController ─► World.static (collision), World.enemies (push)
                      ├─► TimeScaleDriver            (pure: numbers in, scale out)
                      ├─► World (one per level attempt, one more per replay)
                      │     ├─► StaticWorld, NavGrid   (shared and cached per level)
                      │     ├─► enemy AI functions, WEAPONS/ENEMY tables, Rng
                      │     └─► events[] ──────────► Game.handleEvents ─► AudioEngine, FxSystem
                      ├─► ReplayRecorder / ReplayPlayer ─► World
                      ├─► FxSystem, Viewmodel, computePose, mesh library
                      └─► Renderer ─► Gfx, Mesh, WGSL shaders, Camera

Level data: LevelBuilder ─► level defs (boxes, waves, props) ─► buildLevelMesh
            ├─► MeshBuilder + THEMES ─► render mesh
            └─► StaticWorld + NavGrid ─► collision / navigation
```

The design has one good property: `World` knows nothing about rendering or audio. It only pushes plain event objects (`shot`, `impact`, `enemyDeath`, …), and `Game.handleEvents` (l. 7265) turns them into sounds and particles. That separation is what makes the replay possible, because the same `World` can be re-run without side effects. `Game` is the only place where everything meets.

## 3. One frame, from key press to pixels

Example: the player is in a level (`state === "playing"`, pointer locked) and presses **W**.

1. **Browser event.** `Input.onKeyDown` (l. 1996) calls `press("KeyW")`, which adds the code to `down` (held) and `pressedRaw` (new this frame). Nothing else happens until the next animation frame.
2. **rAF tick.** `Loop.tick(now)` (l. 2143) calls `Time.beginFrame`, which computes `realDt` capped at 0.1 s.
3. **`Game.frame(t)`** (l. 6957), which runs on real time:
   1. `input.update` (l. 1943) copies `pressedRaw` into `pressedFrame`, takes the accumulated mouse delta and polls the gamepad.
   2. `ui.update` advances the title-card words. Debug keys F2, F3 and F4 are handled here.
   3. In `case "playing"` (l. 6981), `PlayerController.update` (l. 6101) runs. `look()` applies mouse yaw and pitch and measures look speed. `moveAxes()` reads W as forward. Velocity accelerates toward `WALK_SPEED = 4`, gravity is applied, and `StaticWorld.moveCharacter` resolves collision. **The player moves by `realDt`**, so the player is never slowed down.
   4. `player.toFrame()` packs position, velocity, view angles and this frame's fire, throw and interact edges. `World.applyPlayerFrame` (l. 5302) copies the frame into the world's player and runs any action: `primaryAction`, `throwHeld` or `pickUp`. The frame is also pushed to the replay recorder.
   5. `TimeScaleDriver.update` (l. 6998) turns movement, look speed, actions and airborne state into `t.timeScale`.
4. **`Time.advanceSim`** (l. 2080) adds `simDt = realDt × timeScale` to the accumulator.
5. **Fixed steps.** While the accumulator holds at least 1/120 s (at most 8 steps per frame), `Game.fixedStep`, then `World.step(1/120)` (l. 5676) runs. It stores previous positions for interpolation, ticks cooldowns and bursts, advances waves and the spawn queue, runs `updateEnemy` for each enemy (AI, pathing, shooting), `stepProps` and `stepProjectiles` (hits, kills, bullet clashes), removes dead objects and calls `checkWin`. Because the time scale is small when the player is idle, most frames run **zero** world steps.
6. **`Time.endSteps`** sets `alpha`, the leftover fraction used to interpolate between the last two sim states.
7. **`Game.render(t)`** (l. 7038):
   1. It checks `world.failed` or `world.cleared` and switches to `dead` or `cleared`.
   2. `handleEvents` drains `world.events` into `AudioEngine.play` and `FxSystem`. `fx.update` advances particles by `simDt`.
   3. It places the camera at the player's eye (title, replay and death states have their own cameras), builds view and projection matrices, and sets the audio listener and the time scale for audio.
   4. `drawWorld` queues the level mesh, interpolated props, enemy body parts (glass layer) and bullets as segments. Then `fx.draw` and `viewmodel.draw` queue particles and the hands. `Renderer.drawMesh` only appends instance data to per-mesh buckets.
   5. `updatePost` turns the time scale into `freeze`, desaturation, aberration, grain, vignette, bloom, the death flash and the incoming-threat effect.
8. **`Renderer.render`** (l. 1476):
   1. `packInstances` uploads all instances in one `writeBuffer`. `writeFrame` fills the uniforms for the world camera and the viewmodel camera.
   2. One command encoder records the passes in this order: **shadow** (2048² depth map), **opaque** (HDR colour, normals and depth), **glass** (enemies refract a copy of the HDR target), **fx** (bullet and particle segments), **viewmodel** (clears depth so the hands never clip into walls), **outline** (edge detection on depth and normals into `comp`), **bloom** (prefilter, 5 levels down, then up) and **final** (tonemap, freeze tint and grain onto the swap-chain texture).
   3. `device.queue.submit` (l. 1605) sends the work. The browser composites the canvas texture at the next vsync.
9. `updateHud` writes the crosshair, ammo, hint and level info into DOM elements. `DebugOverlay` updates, and `Loop` schedules the next `requestAnimationFrame`.

So **W** takes effect on the player in the same frame. Its effect on the world goes through the time scale: moving raises `timeScale`, which lets the accumulator fill, which runs `World.step`.

## 4. Design problems

1. **Long positional parameter lists, and one of them is already wrong.**
   - `TimeScaleDriver.update(realDt, planarSpeed, maxSpeed, lookSpeed, airborne, busy)` (l. 6177) is called as `update(dt, WALK_SPEED, this.player.planarSpeed, …)` (l. 6998). That passes the maximum speed as the current speed and the reverse.
   - `drawMesh` takes 8 positional arguments (l. 1422), and calls look like `drawMesh(mesh, m2, WHITE3, 0.06, "opaque", 0, 1, highlight)`. `moveCharacter` takes 6, two of them booleans.
   - **Why it hurts:** nothing checks the order of numbers that have the same type. A swap still compiles and runs, and it breaks behaviour without any error. Here it breaks the game's central mechanic (see §5). An options object or named types would make the call site readable and checkable.

2. **`Game` is a god object with a string state machine spread across many methods.**
   - `Game` (l. 6704–7387, about 680 lines) owns more than 20 collaborators.
   - It decides behaviour by repeating lists like `this.state === "playing" || this.state === "intro" || …` in `frame`, `render`, `updatePost`, `updateHud`, `drawWorld` and two DOM listeners. There are 12 occurrences of `this.state === "playing"` alone.
   - State changes happen in several places (`setState`, and `resume()` assigning `this.state` directly at l. 6877), so `stateTime` handling is inconsistent.
   - **Why it hurts:** adding or changing a state means finding every list. Missing one gives subtle bugs, such as a HUD visible in the wrong state or time running during a menu. Nobody can see which transitions are legal. A small state object per mode (enter, exit, update, render) or a transition table would keep each state's rules together.

3. **The same constants are duplicated, and magic numbers are scattered.**
   - Gravity is defined three times with different values: `GRAVITY = 18` (enemies, l. 4844), `GRAVITY2 = 16` (props), `GRAVITY3 = 16` (player). There are two `MAX_PITCH` values (l. 1836, 6069).
   - The step height 0.42 exists as `STEP_HEIGHT` (l. 6070) but is typed out again for enemies (l. 5089).
   - The marksman telegraph length exists as `TELEGRAPH = 0.6` (l. 4842) but is hard-coded as `/ 0.6` in `activeLasers` (l. 6049).
   - Body heights appear as literals (1.25, 1.3, 1.4, 1.48, 1.6) in about ten places next to the named `HEAD_OFFSET`, `EYE_HEIGHT` and `BODY_B`.
   - **Why it hurts:** a balancing change made in one place silently disagrees with the others. Change `TELEGRAPH`, and the laser animation no longer matches when the shot fires. Change the player height, and enemies keep aiming at the old chest. The bundler suffixes (`GRAVITY2`, `GRAVITY3`) show that the module structure that would have kept these apart has been lost.

4. **Player state lives in two places and is copied every frame.**
   - `PlayerController` holds `pos`, `vel`, `yaw`, `pitch` and `grounded`. `World.player` holds a second copy of the same fields plus combat state.
   - `applyPlayerFrame` (l. 5302) copies one into the other each frame. `PlayerController.update` reaches into `world.static` and `world.enemies` directly. The HUD and viewmodel read from both (`this.player.stride`, `world.player.held`).
   - **Why it hurts:** it is unclear which copy is the truth. Any code that changes `World.player.pos`, for example a knockback, gets overwritten next frame. The replay only works because the copy goes through the recorded frame. That works, but it is fragile.

5. **A single file with runtime-only failure modes.**
   - Shaders are JavaScript template strings glued together (`common_default + scene_default`, l. 1305), so a WGSL error only appears as a console message after the page loads.
   - The uniform layout is maintained by hand on both sides (`FRAME_FLOATS = 80` and `put(76, …)` in `writeFrame` against the WGSL struct).
   - The maths library comes from a CDN at runtime, so the game breaks offline or if the CDN changes.
   - There are no types, so `drawMesh(..., layer = "opaque")` accepts any string.
   - **Why it hurts:** every mistake surfaces as a black screen or a silent wrong value at runtime, not at build time. With 7,000+ lines and no modules, two people cannot work on the file without merge conflicts.

6. **Dead and half-wired code.**
   - The bindings `debugToggleCamera` (F1), `flyUp` and `flyDown` (l. 1887–1889) are never read.
   - `Ui.blocking`, `Ui.currentScreen`, `Ui.cardActive`, `Ui.rootElement`, `World.aliveEnemies`, `Game.lastDeathDir`, `FxSystem.particleCount` and `Input.wasReleased` are defined and never used. The `telegraph` event case is empty (l. 7359).
   - **Why it hurts:** a reader can't tell features from leftovers. F1 looks like a free-camera mode, and someone will lose time looking for it.

## 5. Things that look broken (logged for later, not fixed)

These are observations from reading the code. Following the lab rules, nothing has been changed. They go into BUGS.md once they are confirmed in the game.

- **You cannot start level 1-1 on a fresh save.**
  - What the code does: `Ui.isUnlocked(0)` (l. 3717) reads `levels[-1]`, gets `undefined` and returns `false`. `Game.startLevel` returns early when the level isn't unlocked.
  - Effect: PLAY does nothing, and 1-1 shows LOCKED in the level list.
- **Time never slows down.**
  - What the code does: with the swapped arguments from problem 1, `moveInput = clamp(4 / planarSpeed, 0, 1)`. Standing still gives `4 / 0 = Infinity`, which is clamped to 1. Walking at 4 m/s gives 1.
  - Effect: the time scale is always 1, so the core mechanic is gone. This can be checked with the F4 overlay, which shows `timeScale`.
- `resume()` sets the state to `intro` when no replay frames were recorded yet. It doesn't call `setState`, and it then starts a second intro with "GO.". This may be intended.

## 6. How to check the claims yourself

- **Mechanic:** open the title screen and read the tagline. In code, `TimeScaleDriver` (l. 6161) and its single caller (l. 6998).
- **Frame order:** `Loop.tick` (l. 2143) is nine lines long and shows frame, then advanceSim, then fixed steps, then render.
- **Level lock:** on a fresh profile (or after `localStorage.removeItem("stillframe.save")`), click PLAY, then open LEVELS and look at 1-1.
- **Time scale:** if you get into a level, press F4, stand still and watch `timeScale` in the overlay.

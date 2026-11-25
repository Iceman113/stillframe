# Part 2: Restructure

The single `index.html` is now a Vite + TypeScript project with 37 modules and 9 shader files. Behaviour has not changed, bugs included: nothing in BUGS.md has been fixed.

## Running it

| | Command | VS Code (F5) |
|---|---|---|
| Dev server, hot reload | `npm run dev` (http://localhost:5173) | **Dev server (Chrome)** |
| Production build | `npm run build` (type check, then `vite build` into `dist/`) | — |
| Serve the production build | `npm run preview` (http://localhost:4173) | **Production build (Chrome)** runs the build, then preview |

Each launch configuration (`.vscode/launch.json`) starts its server through a background task (`.vscode/tasks.json`), opens Chrome and attaches the debugger. Breakpoints set in `src/**/*.ts` stop in both configurations:

- The dev server serves inline source maps.
- The production build is built with `build.sourcemap: true`. Its maps point back to `../../src/*.ts`, and `webRoot` maps those to the workspace.

`npm run build` runs `tsc --noEmit` first, so the build fails on any type error. TypeScript runs in `strict` mode, and the code has no `any`, `@ts-ignore` or `@ts-nocheck`.

The maths library is the npm package `wgpu-matrix`, pinned to 3.4.2, the same version the CDN URL used.

## Folder layout

```
index.html              page markup (canvas, overlay, "WebGPU required" panel)
src/
  main.ts               boot: create Gfx, then Game, then start; show the error panel on failure
  style.css
  engine/               game-agnostic basics, no imports from the rest of src
    loop.ts               requestAnimationFrame loop, fixed 1/120 s step, time scale (Time, Loop)
    input.ts              keyboard, mouse, pointer lock, gamepad, action bindings
    math.ts  rng.ts       vector helpers, seeded RNG
  sim/                  the game rules: deterministic, no DOM, GPU or audio
    world.ts              World: player combat, props, bullets, waves, win/lose, event queue
    enemy-ai.ts           enemy state machine, aiming, shooting, melee, path following
    player-controller.ts  player movement and look
    time-scale-driver.ts  THE mechanic: player activity becomes the world time scale
    static-world.ts       collision against level boxes, raycasts, character movement
    nav-grid.ts           walkability grid and A* for enemies
    items.ts              weapon and item tables
    replay.ts             record player frames, re-simulate them
    types.ts              shared data shapes (Enemy, Prop, Projectile, WorldEvent, ...)
  levels/               level content
    level-builder.ts      the box DSL (room, wallWithDoors, stairs, ...)
    act1-transit.ts  act2-office.ts  act3-rooftops.ts   five levels each
    index.ts              LEVELS in play order, act names
    themes.ts             per-theme materials and lighting
    types.ts              LevelDef, WaveDef, SpawnDef, ...
  gfx/                  WebGPU and nothing game-specific
    gfx.ts                device, context and canvas sizing
    renderer.ts           pipelines, instance batching, the 8-pass frame
    camera.ts  mesh.ts  mesh-builder.ts
    shaders/*.wgsl        common, scene, shadow, glass, fx, post, outline, bloom, final
  view/                 how the simulation looks (reads sim state, draws through gfx)
    fx.ts                 particles and glass shards
    viewmodel.ts          first-person hands and weapon
    enemy-pose.ts         procedural enemy skeleton
    mesh-library.ts       meshes for enemy parts, items and gloves
  audio/
    audio-engine.ts       Web Audio graph, positional one-shots, music that follows the time scale
    synths.ts             every sound effect, synthesised in code
  ui/
    ui.ts                 DOM HUD, title cards, menus, results screen
    debug-overlay.ts      FPS / timeScale panel (F4)
  game/                 glue: the only place that knows about everything
    game.ts               Game: state machine, frame/fixedStep/render callbacks, event-to-audio/fx mapping
    level-loader.ts       level def to render mesh plus collision and nav data
    save.ts               localStorage save and settings
```

### Why this split

1. **Folders follow the direction of dependency.** Runtime imports point one way only:

   ```
   engine  ◄── sim ◄── view ◄── game ──► ui, audio
      ▲         ▲        │        │
      └──── gfx ◄────────┘        └──► levels, gfx
   ```

   - `engine/` imports nothing from the project.
   - `sim/` loads only from `engine/` at runtime; it imports level data shapes as types only.
   - `gfx/` knows nothing about the game, apart from the `Vec3` type alias.
   - `game/` sits on top and is the only folder that imports everything.

   I checked these rules with a script over the import statements. A newcomer can tell where a change belongs by asking two questions:
   - Is it a rule of the game? Then it goes in `sim/`.
   - Is it about how something looks or sounds? Then it goes in `view/`, `gfx/` or `audio/`.

2. **`sim/` is kept pure on purpose.** The original code already had one good property: `World` reports what happened through plain events and never calls audio or rendering. That is what makes the replay feature (re-simulating recorded input) possible. A separate folder makes the boundary visible, and it lets the simulation run in Node with no browser, which is how I checked behaviour (see below). Part 3 bug fixing will mostly happen here.

3. **`view/` is separate from `gfx/`.** `gfx/` is a generic WebGPU renderer: meshes, instances, passes and shaders. `view/` holds the game-specific visual logic: shards when an enemy dies, hand animation, enemy poses. Someone tuning the death effect shouldn't need to open the renderer.

4. **Levels are content and are split by act.** Each act file holds five level definitions. A designer adding a level touches one act file and `levels/index.ts`, nothing else.

5. **Shaders are real `.wgsl` files**, imported with Vite's `?raw` and concatenated exactly as before (`commonWgsl + sceneWgsl`, …). Editors can now highlight and lint them.

6. **Module boundaries follow the original bundle.** The bundler had left clues, such as `GRAVITY2` and `GRAVITY3` collision suffixes and section breaks. Each module corresponds to a block of the original, so every module can be traced back to a line range of the first commit. I restored the bundler-renamed names (`GRAVITY2`/`GRAVITY3` → a local `GRAVITY` in each module, `WHITE2` → `WHITE`, and so on).

### What I deliberately did not change

`Game` is still a large class, and the design problems from PART1.md §4 are still there: duplicated constants, player state in two places, positional parameter lists. Fixing them would change code, not just move it, and Part 2 must not change behaviour. They are the obvious next refactors once Part 3 has tests to lean on.

## How I made sure nothing changed

The work was done in small commits, each checked before the next one:

| Commit | Change | Check |
|---|---|---|
| `62c16b6` | Script moved verbatim into `src/main.ts`, CSS into `style.css`, npm `wgpu-matrix`, F5 configs | screenshots |
| `18be0a4` | Mechanical split into modules plus `.wgsl` files (done by a script using a scope analyser, so every cross-module reference became an exact import) | screenshots + sim fingerprint |
| `2ef270f` … `79c5808` | Types added, one folder per commit | emitted-JS diff + sim fingerprint + screenshots |

- **Simulation fingerprint.** A Node script runs all 15 levels with the same scripted input (movement, mouse look, fire, throw, pickup, jump). It drives the loop exactly as `Game.frame` does, including the swapped `driver.update` arguments. Each frame it hashes the positions of the player, enemies, props and bullets, plus all events. The original file, with the boot call removed, and the new modules give the same hash (`7e9a96f3…`).
- **Emitted-JS diff.** This checks the typing commits. I strip the types from every `.ts` file with esbuild and compare the output with the untyped split commit: all 37 files emit identical JavaScript. So the typing commits are annotations only.
- **Screenshots** in headless Chrome with WebGPU: title screen, level list and the 1-2 intro, for the original, the dev server and the production build. They look the same, and there are no console errors. In all three, PLAY on a fresh save stays on the title screen, which is the existing bug.

All of these are automated checks of the simulation, the code and still images. None of them is the same as playing. A manual side-by-side play test against the first commit (`git show 2eaaac8:index.html`) is still the final check.

## Bugs noticed along the way

Not fixed; they are listed in BUGS.md.

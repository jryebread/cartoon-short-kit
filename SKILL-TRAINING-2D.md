---
name: dog-training-2d-short
description: Make a vertical animated dog-training tutorial short with the flat 2D collie and the 2D bald trainer host in a 3D cartoon world, with dotted lure paths, check/cross badges, a pulsing paw cursor and POV hand shots. Turns a trick script + voiceover into a finished MP4 with music and SFX at half the voice level. Use for any "teach your dog to ..." 2D tutorial video.
---

# Dog-training short (2D collie): idea → script → voiceover → finished MP4

This skill extends the original `SKILL.md` (cartoon short) for **dog-training tutorials drawn in the flat 2D style**. Everything in
`SKILL.md` still applies unless this file says otherwise. Where they conflict, this file wins; the conflicts are marked **(changed)**.
For the rigged 3D puppy version, use `SKILL-TRAINING-3D.md`.

The look: flat 2D canvas-drawn characters (the **trainer** and a brown-and-white **collie**, plum/ink outlines) on billboard
"cards" in a colourful 3D backyard with black ink outlines, painted textures, depth-of-field and gliding cameras. The technique
reads from:
- **dotted lure paths**;
- **check / cross badges**;
- the collie's **white belly**, which always shows its body orientation;
- the **pulsing paw cursor** and **POV hand** shots, carried over from the 3D version.

The output is 1080x1920, 30 fps, exactly as long as the voiceover. The music bed and SFX sit at **50 % of the voice level**.
Proven on "Teach Your Dog to Roll Over" 2D (35.8 s, 14 shots): `example/dog-roll-over/out/Teach-Your-Dog-to-Roll-Over.mp4`.

## Where everything is (read this first)
The repo root is the kit: `/Users/joomby/Documents/cartoon-short-kit`. **(changed)** There is no separate `kit/` folder, and
projects go in `example/<slug>/`, never in `~/shorts` or `/tmp`.

| Path | What it is |
|---|---|
| `characters/README.md` | Index of the reusable cast (the canonical copies; projects copy them into `web/`). |
| `characters/trainer/trainer.js` | **The trainer**, the recurring host: `trainerDraw(p, opts)`, `trainerShoulder(opts, side)`. |
| `characters/collie-2d/rolldog.js` | **The 2D collie**: `dogRoll(p, opts)`, `dogRig(opts)`, `dogProject`, colours `DOGC`. |
| `characters/pointers-3d/pointers3d.js` | **Paw cursor + POV hand on a black arm.** It's a three.js module, so it drops into the same engine the 2D videos use. |
| `engine/tutorfx.js` | Tutorial graphics: `fxTrail`, `fxCheck`, `fxCross`, `fxMagnet`, `fxPulse`, `fxClick`, `fxConfetti`, `fxCrumbs`, `fxHeart2`, `fxSpark2`, `fxSigh`. |
| `tools/setup.sh` | `bash tools/setup.sh example/<slug>`: engine + trainer + collie + tutorfx, three.js r160, toon.ts → toonbase.js, Playwright link. |
| `example/dog-roll-over/` | **The worked 2D example.** Start from its `web/story.js`, `web/main.js`, `audio.py`, `build.sh`, `transcribe.py`, `make_voiceenv.py`. |
| `example/dog-roll-over-3d/web/main.js` | Shows how to wire `pointers3d.js` into `main.js` (copy that part for 2D). |
| `video-preview/` | Remotion Studio preview with a frame/shot/word overlay. |

Note: the finished 2D example has its **own older copy** of the trainer (bearded, skin arms) in its `web/`. For new videos, always
use `characters/trainer/trainer.js` (the current look).

## Standing user preferences (do not break)
- **No white flashes between scenes. (changed)** Use hard cuts or continuous moves. Never set `c.flash` on a cut, even on a time jump.
  Add no transition whoosh SFX.
- **The trainer:** young, **bald**, **no nose**, brown-and-white paw-badge cap, brown vest with a white collar and a **"Pawko" patch on his left chest**
  (pass `mirror: true` whenever his card is flipped), black tee, blue jeans, brown sneakers, **black stick-figure arms that stretch** (the default; `hose: false` gives skin arms). He's an **original**
  character: never copy an anime or game character. Reuse him; don't redesign him.
- He doesn't need to be in every shot. Mix trainer shots with **POV**, **paw-cursor** and close-up shots.
- **Pointer rule:** the **hand** when the camera is the trainer's eyes (POV); the **paw cursor** for floating / "camera in the
  air" shots. A hand never floats over the dog from a non-POV camera.
- Send a stills contact sheet (and the Remotion preview) before the long render. The user gives feedback by frame number.

## Rules (from SKILL.md, kept)
- Stories, characters and shots are always original. Never recreate another creator's video shot for shot.
- No real, named living people as characters, and no brand mascots or logos.
- No captions unless asked. Diegetic text must read correctly.
- Never edit or re-time the voice. Every visual reaction lands 0-3 frames before its word.
- **Audio levels:** music at 50 % of the voice (−6 dB gated RMS), SFX at 50 % or less with peaks capped. Always `mix.py`; no ducking,
  only one linear gain plus a peak limiter on the whole mix.
- Keep the user informed with a task list.
- **Training content must be accurate and humane**: positive reinforcement (lure, mark, reward); mistakes shown as mistakes
  (red path, cross); never punishment or force.

## Stage 1: Intake (always first)
As SKILL.md: if the audio is attached go to Stage 4; otherwise ask "Where are you starting from?" (voiceover ready / have a script /
need ideas). Default length 30-40 s for a trick.

## Stage 2: 10 trick ideas
Exactly 10 numbered ideas, each with a **Title**, a **hook line**, **the steps** (lure path in order), **why it animates well** (the
body changes the collie can show: stand / sit / down / hip / side / back / roll, head look-at, head tilt, paw pedal), and **the
common mistake** to show in red. Verify the technique with a web search (reputable positive-reinforcement sources).

## Stage 3: Script (after they pick)
About 3.7 words/s. Hook ("Let's teach your dog to ___!") → setup position → the lure path step by step → the mistake →
shaping (reward small steps, let the dog choose) → the full trick + "yes" / click + reward as the last words. Reply with the
script block, a one-paragraph shot plan, recording tips (one warm voice; ElevenLabs speed 1.05-1.1, stability 45-55 %; no
music) and the upload ask.

## Stage 4: Build the video

### 4.0 Set up
`bash tools/setup.sh example/<slug>`, then copy the 2D example's `web/story.js`, `web/main.js` (with the training corner),
`audio.py`, `build.sh`, `transcribe.py`, `make_voiceenv.py` and rewrite them. `./build.sh` concatenates
`toonbase.js roman.js trainer.js rolldog.js tutorfx.js` → `web/toon.js`; rerun it after any cast edit.
**Render on the GPU**: `GPU=1 node render.mjs frames "0-<N-1>"` takes about 0.06 s/frame on a Mac (the CPU default is about 0.8 s/frame).

### 4.1 Timing
`python3 transcribe.py voice.mp3` writes word timestamps (`voice.mp3.words.json`). Write every word's frame (round(s × 30)) into
the header comment of `story.js`. `python3 make_voiceenv.py voice.mp3` writes `web/voiceenv.js` for the trainer's lip sync.
Fallback: `timing.py` (SKILL.md 4.1).

### 4.2 Shot plan (`work/PLAN.md` before code)
**The proven 2D recipe** (roll over, 14 shots, 1073 frames), extended with the 3D lessons:

| # | Shot | What it shows |
|---|---|---|
| 1 | hook | Trainer kneels behind the collie; the collie finishes a roll; chomp + hearts |
| 2 | lie down | Palm-down hand signal; the collie lies down. **Better: a POV hand shot** (see "POV shots in 2D") |
| 3 | one hip | The collie settles onto its hip; **pulsing ground ring** on the hip (`fxPulse` or 3D rings) |
| 4 | foundation | Relaxed down + **check** |
| 5 | nose / magnet | Close-up: treat at the nose with **`fxMagnet` field lines** between treat and nose |
| 6 | shoulder / spine | **White dotted path** nose → shoulder → spine (`fxTrail`), or the **paw cursor** leading it |
| 7 | low and close | **Green** path + **check** |
| 8 | too high | **Red** path rising; the collie stands up; **cross** |
| 9 | reward | Chomp |
| 10 | head turn / side | Two small rewards; the collie flops onto its side |
| 11 | choose | Close-up, head tilt; the collie shifts on its own (`pedal`); the paw cursor **waits**, hovering |
| 12 | comfortable | Tail thumps + **check** |
| 13 | smooth arc | Big dotted **gold** arc (or the paw cursor tracing it); the full roll |
| 14 | finish / yes / click / reward | Burst, clicker ring (`fxClick`), chomp, confetti, golden light |

Camera notes:
- In a 9:16 frame the horizontal half-width is d·tan(hfov/2), with hfov = 2·atan(tan(vfov/2)·0.5625). Stage the trainer
  **behind** the dog in depth, not beside it, and keep his whole face in frame.
- Use the low 3/4 front view for trainer shots and close-ups on the head for "nose / choose".

### 4.3 World (`web/main.js`)
The backyard with a **training corner**: padded blue mat (y ≈ 0.064), cones, a treat jar on a stool, an agility jump, picket
fence, doghouse, oaks, houses, hills, clouds. Supports `blobW` / `blobD` / `blobX` for card contact shadows,
`c.mat.depthTest = !a.noDepth`, and `window.shotAt` for the preview overlay. SKILL.md 4.3 rules apply.

### 4.4 Cast
**The collie** (`rolldog.js`) is a tiny 3D rig projected onto the 600x1000 card, facing screen-right; flip the card for left:
- **Rig:** dog space in design units (x forward, y up, z toward the camera = the dog's left), projected with a fixed **33° camera
  elevation** (`DE` in the file; the header comment saying 26° is stale).
- **Body:** `rollF` / `rollR` (chest / hip roll: 0 upright, ~62 settled on a hip, 90 on its side, 180 belly-up, 270 other side,
  360 upright), and `legsF` / `legsR` pose weights `{ stand, sit, down, flop }`.
- **Head:** `look: [x, y, z]` (dog space), `neck`, `headTilt`.
- **Face and tail:** `eyes`, `mouth` (`smile pant closed chew open`), `ears`, `wag`, `tail`, `pedal`.
- **Helper:** `dogRig(o)` returns `{ nose, head, project(pt) }` for aiming hands and effects.
- Draw it with `noDepth: true`, `order: 3`, after the trainer (`order: 1`).

**The trainer**, as in `characters/trainer/README.md`: `expr`, `talk`, `kneel`, `lean`, `headTilt`, `blink`, `look`, `far` / `near`
arms (presets or `{ to, hand, rot }`), `click`. He kneels **behind** the dog (z ≈ −0.42 m) with his far (treat) arm reaching over it.

Lessons from building the collie (keep them if you edit or redesign it):
- **The belly band must include the camera elevation:** for each body slice, phi = w − DE + θ (and the matching `radAt`).
  Without it, the white belly shows on the wrong side as the body rolls.
- **Ears**: in profile, build them with their width along the head's forward axis; otherwise they collapse edge-on and cover the eye.
- **Draw the muzzle before the eyes**, so the eye is never painted over.
- Hide the hind-thigh overlay when belly-up. Make the `flop` legs more ventral so side / back poses don't splay.

Lessons from the trainer:
- **Aim his hand at a dog-space point**: convert it to world (`d3W`), then `tD(world)` casts the camera ray onto his card plane and
  returns design coords. `reachFor` solves the hand pose so the biscuit lands exactly on the treat. If a hand can't reach,
  restage him closer behind the dog, or bring the lure waypoints in toward the topline. The stick arms stretch, which helps.

### 4.5 Motion (from SKILL.md, kept)
Smootherstep camera glides, `path` via-points, creeping holds, `idle()` + `blinkAt` on every card, anticipation → `back` → settle,
secondary motion everywhere, DOF on close-ups. **Continuity (changed): hard cuts without a flash.**

### 4.6 Look check
Stills at each shot's middle and key actions → `sheet.py` → look:
- The collie card clipped by the mat (use `noDepth` + draw order).
- A glow or trail smudging the dog's eye (e.g. the green trail glow; keep glows off the face).
- The trainer's hand short of the treat; the trainer's face cropped.
- A mirrored or edge-on ear; the belly showing on the wrong side.
Then offer the Remotion preview (`cd video-preview && npm run use -- ../example/<slug> && npm run studio`).

### 4.7 Sound, 4.8 Render + finish
As SKILL.md (cue table in `audio.py`, `mix.py` level lock, confirm −6.0 dB). **No transition whooshes (changed).**
`GPU=1 node render.mjs frames "0-<N-1>"`, then `bash finish.sh "Title"` (−14 LUFS, encode, QA sheet).

## Tutorial devices (what made the videos teach well)

### Dotted paths and badges (2D, `tutorfx.js`)
- Keep treat waypoints **in dog space** (`NOSE`, `SHOULDER`, `SPINE`, `SPINE2`, `HIGH`, `ARC` points) and key the treat between them
  with `KF(f, [[frame, point], ...])` and `spline` for arcs.
- `fxTrail(p, pts, k, col, glow)` draws the dotted path with an arrowhead. Draw it on a card with the **same transform as the dog card**
  (`dogFx`) so it lines up with the dog. Colour by meaning: **white** = the lure path, **green** = correct, **red** = mistake, **gold** = the hero move.
- Check on the rule words, cross on the mistake, hearts / sparkles on rewards, `fxMagnet` for "like a magnet", `fxClick` on the
  clicker, `fxConfetti` + golden light on the final reward.

### The paw cursor in 2D shots (pulsing, floating)
`pointers3d.js` is plain three.js, so it works unchanged in the 2D engine. Copy the wiring from `example/dog-roll-over-3d/web/main.js`:
```js
import { makePointers } from './pointers3d.js';
const pointers = makePointers(THREE, scene, { toon, glowTex: P.tex(P.radial('255,236,170', 0.9)) });
// in worldState / renderFrame, after the camera is placed:
pointers.update(camera, f, { paw: { pos: worldTreat, s: 0.95 }, hand: null });
```
- `worldTreat` = the dog-space treat converted with the same `d3W` used for the trainer's hand.
- **What makes it look good:**
  - glossy white paw with pink beans, a spinning gold halo and a soft glow;
  - it **pulses** (1 + 0.06·sin(f·0.35)), bobs and wobbles;
  - it floats **0.075 m above the treat along camera-up**, so the biscuit shows under it;
  - it hovers patiently near the nose when the dog is choosing on its own.
- Draw the biscuit and a 3D bead trail at the same point (copy the treat / trail code from the 3D `main.js`), or keep the 2D
  `fxTrail` and let the paw ride its end point.
- The paw is a real 3D object in front of the 2D dog card. Keep it from sitting inside the card's silhouette: hold it a few cm toward
  the camera from the treat, or give it a higher `renderOrder` so the card's `noDepth` draw doesn't hide it.

### POV shots in 2D (the trainer's eyes)
- The camera goes where the trainer's eyes would be (kneeling, about 1 m up, 0.8-1 m from the dog), with a small hand-held drift
  (±6 mm, ±1.2° roll). The hand comes from `pointers3d.js` (`hand: { treat: worldTreat }`, a black stick arm from below the frame).
- **2D limit:** the collie card is a yaw-only billboard drawn at a fixed **33° elevation**. Keep POV cameras looking down at
  roughly **25-40°** so the drawing matches the view. A steeper camera exposes the flat card.
- Hand size: `handScale` about 1.2 and `armRadius` about 0.021. Raise the camera if the hand covers the face.
- Use POV for "ask your dog to lie down", "hold a treat at the nose", "move it to the shoulder" and the final reward.

### Overhead shots in 2D
- A billboard can't be seen from straight above. For overhead / top-down beats (the hip settle, the body shape), either:
  1. use a **high 3/4 camera** (about 45-55° down) with ground rings on the hip and the paw cursor, which is the safe option; or
  2. build a true top view by making `DE` a `dogRoll` option, drawing with `DE = 90°` on a card laid flat on the mat
     (rotated −90° about x, `noDepth`). **That isn't built yet**, so render a test sheet before using it.
- If a trick needs a lot of overhead or rolling detail, recommend the 3D version (`SKILL-TRAINING-3D.md`), which handles any angle.

## Engine gotchas (from SKILL.md, kept)
- `#include <fog_vertex>` / `<fog_fragment>` on their own lines. The final pass writes `linearToOutputTexel(...)`.
- The normal+depth pass swaps materials per mesh; cards become alpha-tested masks; blobs, clouds, sky and `ndSkip` meshes are hidden.
- A card with `depthTest` off also doesn't write depth. Fix overlaps with `renderOrder` (trainer 1, dog 3, effects 6-7), not depth.
- In JS, a unary minus before `**` is a syntax error: write `Math.exp(-(((x + 8) / 34) ** 2))`.
- Remotion: the bundler skips file symlinks, so audio is copied (`npm run use`); use `--port=3123` for CLI stills/renders while Studio runs.

## Architecture (from SKILL.md, kept)
- `web/index.html` → `main.js` (ES module); `window.renderFrame(f)`, `window.ready`, `window.shotAt`.
- `story.js` exports SHOTS, `shotAt`, `camAt`, `dofAt`, LIGHTS / `lightFor`, `worldAt`, `actorsAt(f, T)`, `fxAt(f, T)`, all pure per frame.
  The 2D example adds `dogAt(f)` (dog pose + treat per frame), `trainerAt(f)` and `reachFor`.
- `render.mjs` → JPEG frames; `mix.py` level lock; `finish.sh` loudness / encode / QA.
- Characters: the Pen API from `vendor/toon.ts` (stripped to `toonbase.js`), extended in module scope by `roman.js`, `trainer.js`,
  `rolldog.js` and `tutorfx.js`, concatenated into `web/toon.js`.

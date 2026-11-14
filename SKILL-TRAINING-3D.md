---
name: dog-training-3d-short
description: Make a vertical animated dog-training tutorial short with the rigged 3D puppy, the 2D bald trainer host, POV hand shots, floating paw-cursor shots and overhead shots. Turns a trick script + voiceover into a finished MP4 with music and SFX at half the voice level. Use for any "teach your dog to ..." 3D tutorial video.
---

# Dog-training short (3D puppy): idea → script → voiceover → finished MP4

This skill extends the original `SKILL.md` (cartoon short) for **dog-training tutorials with the rigged 3D puppy**. Everything in
`SKILL.md` still applies unless this file says otherwise. Where they conflict, this file wins; the conflicts are marked **(changed)**.

The look: a **rigged, toon-shaded 3D puppy** (GLB) with black ink outlines, in a colourful 3D backyard with painted textures,
depth-of-field and gliding cameras. The host is a **flat 2D canvas-drawn trainer** card. The technique is shown with three
devices the user loves:
- **POV shots** from the trainer's eyes: a 3D hand pinches the treat on a black stick-figure arm that reaches in from the bottom of the frame.
- **Floating / overhead shots** with a **pulsing 3D paw cursor** that carries the treat and leaves a dotted trail.
- **Dotted path trails** colour-coded by meaning.

The output is 1080x1920, 30 fps, exactly as long as the voiceover. The user's voice is unchanged. The music bed and SFX are
synthesized and sit at **50 % of the voice level**. Proven on "Teach Your Dog to Roll Over" 3D (35.8 s, 14 shots):
`example/dog-roll-over-3d/out/Teach-Your-Dog-to-Roll-Over-3D.mp4`.

## Where everything is (read this first)
The repo root is the kit: `/Users/joomby/Documents/cartoon-short-kit` (paths below are relative to it). **(changed)** There is
no separate `kit/` folder inside a skill directory, and projects do **not** go in `~/shorts` or `/tmp`.

| Path | What it is |
|---|---|
| `characters/README.md` | Index of the reusable cast. **These folders are the canonical copies.** Projects copy them into their own `web/`. |
| `characters/trainer/trainer.js` | **The trainer**, the recurring host: `trainerDraw(p, opts)`, `trainerShoulder(opts, side)`. README in the same folder. |
| `characters/puppy-3d/dogrig.js` + `models/dog-puppy.glb` (+ `textures/`) + `lib/` (GLTFLoader) | **The 3D puppy** and its rig controller `makeDog(gltf).pose(params)`. |
| `characters/pointers-3d/pointers3d.js` | **Paw cursor + POV hands on black arms**: `makePointers(THREE, scene, opts).update(camera, f, W)`. |
| `characters/hand-3d/hand3d.js` (+ `models/*.glb`) | **The polished POV hand** used by the pointers: smooth posable cartoon hand, presets `pinch fist five open cup point thumb relax`, blendable. README in the same folder. |
| `characters/collie-2d/rolldog.js` | The 2D collie (used by the 2D skill, `SKILL-TRAINING-2D.md`). |
| `engine/` | Renderer starter files (`main.js`, `paint.js`, `roman.js`, `motion.js`, `index.html`, `cast.html`, `tutorfx.js`). |
| `tools/setup.sh` | New project: `bash tools/setup.sh example/<slug>` (copies the engine, the trainer and the collie). |
| `tools/add-puppy3d.sh` | Adds the 3D puppy + pointers + hand: `bash tools/add-puppy3d.sh example/<slug>`. |
| `example/dog-roll-over-3d/` | **The worked example.** Copy its `web/story.js`, `web/main.js`, `audio.py`, `build.sh`, `posetest.sh`, `snap.mjs`, `web/posetest.html` as your starting point. |
| `video-preview/` | Remotion Studio preview of any project, with a frame/shot/word overlay. |

Projects live in `example/<slug>/`. A project's `web/` holds **copies** of the characters, so it stays self-contained. To edit a
character, edit it in `characters/`, then run the project's `./build.sh`. That re-copies `trainer.js`, `dogrig.js`,
`pointers3d.js` and `hand3d.js` into `web/` and rebuilds `web/toon.js`. Paw tricks (shake, high five, paw at a fist):
see `example/dog-high-five/` (one `raise` value: 0 sit, 1 `shakeR`, 2 `fiveR`, with paw positions calibrated into `REF.raise`).

## Standing user preferences (do not break)
- **No white flashes between scenes. (changed)** Use hard cuts or continuous camera moves. Never set `c.flash` on a cut,
  even on a time jump. Add no transition whoosh SFX.
- **The trainer:** young, **bald**, **no nose**, brown-and-white paw-badge cap, brown vest with a white collar and a **"Pawko" patch on his left chest**,
  black tee, blue jeans, brown sneakers. Pass `mirror: true` whenever his card is flipped (`flip: true`), or the patch text reads backwards. His arms are **simple black stick-figure arms that stretch** (the default in `trainer.js`; `hose: false` is the old
  skin arms). He is an **original** character: never make him a copy of any anime or game character. Reuse him; don't redesign him.
- The trainer is **not** in every shot. Show him in the hook and the payoff. Everything in between is POV, floating, overhead and
  close-up shots of the puppy.
- **Pointer rule:** the **hand** whenever the camera is the trainer's eyes (POV); the **paw cursor** for floating / overhead /
  "camera in the air" shots. Never show the trainer's hand floating over the dog from a non-POV camera.
- Send a stills contact sheet (and offer the Remotion preview) before the long render. The user gives feedback by frame number.

## Rules (from SKILL.md, kept)
- Stories, characters and shots are always original. Never recreate another creator's video shot for shot.
- No real, named living people as characters, and no brand mascots or logos.
- No captions unless the user asks. Diegetic text is fine if it reads correctly (not mirrored).
- Never edit or re-time the voice. The picture is timed to it, and every visual reaction lands 0-3 frames before its word.
- **Audio levels:** the music bed sits at 50 % of the voice level (−6 dB, gated RMS). SFX sit at 50 % or slightly less, with peaks
  capped. Always mix with `mix.py`, never by hand. Use no ducking or compression; only one linear gain plus a peak limiter goes on the whole mix.
- Keep the user informed with a task list.
  common mistakes as mistakes (red path, cross). Never show punishment or physical force.

## Stage 1: Intake (always first)
If an audio file is already attached, skip to Stage 4. If a script was also given, use it for the timing.
Otherwise ask: **"Where are you starting from?"**
- **Voiceover ready**: ask for the upload plus the script text. Go to Stage 4.
- **I have a script, need the voiceover**: tighten it per Stage 3, give recording tips, ask for the upload.
- **Need trick ideas and a script**: go to Stage 2.
Also ask the target length if they haven't said. The default is 30-40 s for a trick tutorial; 20-60 s is allowed.

## Stage 2: 10 trick ideas
Give exactly 10 numbered ideas and ask for a number (or "more"). Each idea gets:
- **Title** (5-8 words, e.g. "Teach Your Dog to Roll Over").
- **Hook line**: the first spoken sentence.
- **The steps** in one line (the lure path, in order).
- **Why it animates well**: the 2-3 body changes the puppy can show (sit → down → hip → side → back, spin, paw lift, bow).
- **The common mistake** to show in red (e.g. "lure too high, the dog stands up").
Pick tricks the rig can perform (see "What the puppy can do"). Verify the technique against reputable positive-reinforcement trainers with a web search.

## Stage 3: Script (after they pick)
Narration only, about 3.7 words/s (30 s ≈ 110 words). Formula for a trick tutorial:
1. **Hook**: "Let's teach your dog to ___!" (show the finished trick in the first 2 s).
2. **Setup position** in 1-2 lines (e.g. lie down, settle onto one hip).
3. **The lure path**, step by step, with concrete hand directions (nose → shoulder → spine).
4. **The mistake** ("if it drifts too high, your dog will just stand up").
5. **Shaping**: reward small steps, let the dog choose.
6. **The full trick + marker + reward** ("say yes or click, then reward!"), as the last words.
Then reply with the script block (word count, estimated length), a one-paragraph shot plan, recording tips (one steady, warm
voice; ElevenLabs speed about 1.05-1.1, stability about 45-55 %; mp3 or wav; no music), and the upload ask.

## Stage 4: Build the video

### 4.0 Set up the project
```bash
bash tools/setup.sh example/<slug>          # engine + trainer + collie, three.js r160, toon.ts → toonbase.js, Playwright link
bash tools/add-puppy3d.sh example/<slug>    # dogrig.js + pointers3d.js → web/, GLB → web/models/, GLTFLoader → web/lib/jsm/
```
Then copy the 3D example's files and rewrite them for the new trick: `web/story.js`, `web/main.js` (keep it; it already loads
the GLB, toon-shades it, inks it with `ndSkin` and wires the pointers), `audio.py`, `build.sh`, `posetest.sh`, `snap.mjs`,
`web/posetest.html`, `transcribe.py`, `make_voiceenv.py`.
- Requirements: Node 22.6+, Python 3 with numpy + Pillow, ffmpeg, Playwright with Chromium.
- The GLTFLoader from three@0.160.0 must import `'../three.module.js'` and `'./BufferGeometryUtils.js'` (the copies in
  `characters/puppy-3d/lib/` are already patched). A 404 on load means these paths are wrong.
- **Render on the GPU**: `GPU=1 node render.mjs frames "0-<N-1>"` takes about 0.02-0.06 s/frame on a Mac (Metal via ANGLE).
  The CPU default (SwiftShader) is about 0.8 s/frame. The full 36 s video renders in under a minute on the GPU.

### 4.1 Timing
- `python3 transcribe.py voice.mp3` (faster-whisper) writes `voice.mp3.words.json` (`[{w, s, e}]`). Convert to frames with
  round(s × 30) and **write every word's frame into the header comment of `story.js`**. Every shot and action is keyed to these frames.
- `python3 make_voiceenv.py voice.mp3` writes `web/voiceenv.js` (per-frame loudness) for the trainer's lip sync (`talk`).
- Fallback: `python3 timing.py voice.mp3 script.txt --out work` (see SKILL.md 4.1).

### 4.2 Shot plan (`work/PLAN.md` before code)
One row per shot: frames, words, camera type (trainer / POV / floating / overhead / close-up), puppy pose timeline, pointer
(hand / paw / none), trail colour, badge (check / cross / hearts) and SFX cue. Usually one shot per sentence.

**The proven 14-shot recipe** (roll over, 1073 frames). Use it as a template for other tricks:

| # | Shot | Camera | What it shows |
|---|---|---|---|
| 1 | hook | trainer + puppy, front, slightly high | The trainer's black arm leads the treat; the puppy does the **whole trick** (full roll), then chomps; hearts |
| 2 | povLie | **POV** (trainer's eyes, ~1 m up, looking down at the face) | Hand lowers the treat from the nose to the floor; sit → down |
| 3 | overHip | **overhead push-in** (head at the top of frame) | **Paw cursor** leads the head to the up shoulder; the puppy settles onto its hip; **pulsing ground rings** on the hip |
| 4 | relax | low orbit | Relaxed down, sleepy blink, breathing; **check** badge on "foundation" |
| 5 | povNose | **POV** front | Hand brings the treat to the nose; "like a magnet": the treat wiggles side to side and the head follows |
| 6 | povShoulder | **POV** from the front-LEFT (the up side), higher (~1.25 m) | Hand: nose → shoulder → spine; the puppy starts to tip |
| 7 | overLow | floating 3/4 high | **Paw cursor**, **green** trail, low and close; **check** |
| 8 | tooHigh | floating, low side angle, sky in frame | **Paw cursor** rises, **red** trail; the puppy stands up; **cross** |
| 9 | povReward | **POV** front-left | Reward a head turn (chomp, hearts), then settling onto the side (roll −90), reward again |
| 10 | choose | low close-up from the belly side | The puppy shifts on its own (head tilt, small roll, paw paddle); the paw cursor **waits**, hovering |
| 11 | comfy | floating high, belly side | On its side, tail thumps; **check** |
| 12 | arc | floating high orbit (path via-point) | **Paw cursor** traces the big **gold** arc; full roll from the side across to a down; sparkle |
| 13 | yes | trainer + puppy, **golden** light | "Yes!" expression + clicker click (`fxClick` rays) |
| 14 | povFinal | **POV** | Hand feeds the reward (the hand lingers while it's eaten), **confetti** + hearts |

Camera-type rules that worked:
- **POV** = camera at the trainer's eye height kneeling (y ≈ 0.95-1.25 m), 0.8-1.0 m from the dog, looking down at the head,
  fov 46-50, with a tiny hand-held drift (±6 mm position, ±1.2° roll; see `camAt`). The hand comes from below the frame.
- **Overhead** for anything about the hips/legs/body shape (hip settle): it reads clearly from above, while it's ambiguous from the side.
- **Floating** shots carry the paw cursor. Use a **low side angle with sky** for "too high" so the height reads.
- For side-lying and rolling shots, put the camera on the **belly side** (world −z in the example) so the legs and face are visible.

### 4.3 World (`web/main.js`)
Keep the example's backyard: lawn, picket fence, doghouse (moved behind-left at (−4.2, 0, −4.6) so it doesn't block shots),
oaks, a padded blue training **mat** under the dog (y = 0.064), cones, a treat jar on a stool, an agility jump, and distant
houses / hills / clouds. The engine sections and SKILL.md 4.3 rules apply.

### 4.4 Cast
**The puppy** (`dogrig.js`), see "Making the puppy perform" below.

**The trainer** (2D card in the 3D world):
- `T.trainerDraw(p, opts)` on the 600x1000 design canvas, soles at y = 975, card scale `ST = 1.08`, facing screen-right; `flip: true` faces left.
- Options: `expr` (`smile grin yes laugh talk oops focus patient proud`), `talk` (lip sync from `VENV[f]`), `kneel`, `lean`,
  `headTilt`, `blink`, `look`, `far` / `near` arms (presets `hang hip wave thumb signal present`, or `{ to: [x, y], hand, rot }`
  with hands `treat give palm clicker thumb point open fist wave`), `click`.
- **Aim his hand at a 3D point** with `tD(P)` in `story.js`. It casts the camera ray through the world point onto his card plane
  and returns design coords, so the hand lands exactly on the 3D treat. Offset the wrist by the hand's grip offset rotated by the
  arm angle (see `trainerAt`). The stick arms stretch, so any reach works.
- Draw order: the trainer card has `order: 1`. Place him behind the puppy (z ≈ −0.5 to −0.66 m) and **frame his whole face**:
  in a 9:16 frame the horizontal half-width is only d·tan(hfov/2).
- Test sheet: `node shot.mjs cast.html#trainer stills/cast_trainer.png`.

**Effect cards** (`tutorfx.js`, 2D, billboarded at a world point via `FX(key, draw, pos, s)`): `fxCheck`, `fxCross`, `fxHeart2`,
`fxSpark2`, `fxClick(p, t)`, `fxConfetti(p, t, seed)`, `fxMagnet`, `fxPulse`, `fxSigh`. Icons are centred at (300, 500), so a card of
scale s shows them about 1.1·s m above `pos`. Pop them in with `M.back` and out with a smooth fade.

### 4.5 Motion (from SKILL.md, kept, plus:)
- Cameras: `camFromKeys(keys, f)` with smootherstep glides and `path` via-points for orbits. Every hold creeps.
- **Continuity (changed)**: prefer continuous moves; hard cuts are fine between shots, **without a flash**.
- The puppy never freezes: always some `breath` (morph), `blink`, tail `wag` and ear motion.
- Actions: anticipation → `back` overshoot → settle (e.g. the hip settle uses `M.back(ramp(...), 1.1)`).
- DOF: focus on the puppy's head (`dofAt`), cinf 4-9.

### 4.6 Look check (before the full render)
`GPU=1 node render.mjs stills/a "5,40,..."` then `python3 sheet.py stills/a stills/a.jpg 9`. Look at every frame. Puppy-specific traps:
- The face buried in the floor during a roll, or the head hanging upside-down for more than a few frames (see "Rolling").
- The hand or arm covering the puppy's head in POV (raise the camera, lower `handScale`).
- The paw cursor or a badge cut off at a frame edge, or the trainer's face cropped.
- Legs floating above the mat, or sinking into it (check with a ground-level pose sheet).
- The head bent back like a snorkel when looking high (lower `neck`).
- Fur turning orange in golden light (keep the golden `sun` pale, `sat` ≈ 1.04).
Then offer the Remotion preview: `cd video-preview && npm run use -- ../example/<slug> && npm run studio` (http://localhost:3000;
`web/` is linked live, so refresh after edits; re-run `npm run use` after audio changes). For a quick check, render one still with
`npx remotion still src/index.ts Preview out/check.png --frame=150 --gl=angle --scale=0.5 --port=3123`. Use port 3123 so it
doesn't clash with a running Studio.

### 4.7 Sound (`audio.py` → stems → `mix.py`)
Rewrite the cue table for the new timeline (the synths stay). Example cues: rustle + whoosh on rolls, thunk on landing / lying
down, crunch + pop on chomps, ding on checks, slide-up on "too high", taps + bonk on the stand-up / cross, tail-thump taps,
pop on "yes", click on the clicker, chime + confetti pops on the final reward. Music: a bright groove that thins out for the
mistake and lands a flourish on the reward. **No transition whooshes (changed).**
`python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav`, then confirm the printout shows music at −6.0 dB vs voice.

### 4.8 Render + finish
`GPU=1 node render.mjs frames "0-<N-1>"` then `bash finish.sh "Title"`. finish.sh normalises to about −14 LUFS, encodes,
runs freeze/black QA and writes `out/qa_sheet.jpg` (covers the first 30 s; spot-check the rest from `frames/`). Deliver the MP4
path and a table of what each shot shows. Offer tweaks.

## Making the puppy perform (the lessons that made it work)

### Know the model
- **Inspect the GLB first**: joints, morph targets, clips, orientation and size. The puppy has 45 joints (Maya "SHJnt" names,
  mapped to short keys in `B` in `dogrig.js`), morphs `breath` and `blink` (**blink 0 = open**), and one idle clip (unused).
  It **faces +z, its left side is +x**, and it's 0.31 m tall and 0.47 m long; `makeDog(gltf, { scale: 1.6 })`.
- Give the mesh a `MeshToonMaterial` with its fur map in sRGB (`color '#fff4ea'`), `frustumCulled = false`, cast/receive
  shadows, and `userData.nd = ndSkin`. **ndSkin** is a skinning-aware normal/depth ShaderMaterial (the `skinning_pars_vertex`,
  `skinbase_vertex`, `skinnormal_vertex`, `defaultnormal_vertex` and `skinning_vertex` chunks), so the ink follows the bones.

### How the rig works (`dogrig.js`)
- **Reset every bone to its rest pose every frame**, then apply rotations, so a pose is a pure function of the params (any frame renders alone).
- `rotDog(bone, axis, deg)` rotates a bone about a **dog-space axis around its own pivot**: local' = inv(P)·R·P·local. Pose tables
  (`POSES`) are per-bone `[ax, ay, az]` degrees. +ax swings a hanging leg backward; +az swings it toward the dog's right. Right-side
  bones mirror (ay, az negated).
- **Never assume a bone's local +z is "forward".** The head's forward direction is calibrated from the rest pose (head → jaw,
  `snoutLocal`). The look-at split across neck1 / neck2 / head (0.3 / 0.3 / 0.4) is based on it.
- **Roll** = `rollPivot` at spine height rotating about the body's long axis; when lying, the pivot drops to `restH` so the flank rests on the mat.
- **Pelvis tilt (`rollR`, the hip settle) is applied AFTER the legs fold.** This was the key bug fix. Tilting first and then folding
  the legs in dog space made them straighten and float. Folding first and then tilting makes the folded legs tip over as one unit
  and lie naturally to one side. `sp1` counter-rotates (0.85) so the chest stays upright.
- `sit` pitches the body nose-up; the neck counter-rotates (0.7 × pitch) so the puppy doesn't stare at the sky.

### The poses that look right (current `POSES`)
- `down`: front legs folded forward (`flS 52, flE −118, flW 18`), hind legs folded under (`hlH −62, hlK 96, hlJ −82, hlA 50`), drop 0.088.
- `hip` (settled on its **right** hip, left side up, hind legs out to its left): the same folded legs, `rollR −70`, drop 0.115.
- `tuck` (for the roll itself): front paws curled (`flS −5, flE −125, flW 110`), hind legs folded to the belly
  (`hlH −70/−15, hlK 120, hlJ −70, hlA 50`).
- `flop` (relaxed on its side), `sit`, and `stand` (the rest pose).
Weights blend and are normalised: `w: { hip: 1 - k, flop: k }`.

### Rolling (so the face never plants in the floor)
- **Sign:** negative roll = the puppy goes down on its **RIGHT** side first (its belly turns to world −z when it faces +x). A
  full roll goes 0 → −360. When settled on its right hip, lure toward its **left (up) shoulder**, then back over the spine.
- **The head leads the roll.** Pass `twist = twistFor(r)`:
  `u = |r|/360; twist = 360·(0.5u + 0.5·smooth(ramp(u, 0.3, 0.7)) − u)`. The head stays upright longer and flips through
  belly-up about 3x faster than the body. Use it in every shot with a non-zero roll, so the head pose stays continuous between shots.
- `lift` (default −25) bends the neck up off the floor when the puppy is on its side. `chin` (default 55) tucks the chin to the
  chest when belly-up, instead of the head hanging back.
- Blend legs across the roll: `hip → tuck` as |r| passes 0-70 (`hip = 1 − |r|/70`, so the pelvis tilt hands over smoothly to the
  body roll), stay in `tuck` through the back, then `tuck → down` over the last 10 frames.
- **Move the dog one body-width** (≈ 0.2-0.24 m) toward its roll side over a full roll, with the same easing as the roll. A real
  roll travels; a roll in place looks fake.
- The treat path must **stay just in front of and slightly above the head**, arcing over it, and lead the roll by about 2-3
  frames (`rollT(f + 2.5)`). If the treat drifts over the belly, the head looks away from it.

### Lure and look-at
- Get real reference points from the rig: `calibrate(poseFn, root)` poses each key pose once (`sit down hip side stand`) and stores
  `nose / head / hip / chest` world points in `REF`. Build every treat waypoint from `REF` (`NOSE('hip')`, `SHOULDER`, `SPINE`), and
  use `shift(P, pos)` when the dog has moved.
- `look:` the treat point every frame; `neck: 1` while luring. For very high targets drop `neck` to about 0.6 (it ramps back up as the
  dog stands) or the head bends back unnaturally.
- Chomp = `jaw: |sin((f − t0)·0.75)|` for about 14 frames, plus a blink, a heart pop and an ear flick.

### Pose test sheets (do this before story work)
`./posetest.sh out.png '<json array of pose params>' <cols> <dist>` renders each pose from two views on the GPU. Per pose:
`"views": [[x, y, z], ...]` (camera directions), `"center"`, and `"P": { "hip": {...} }` to try a pose table without editing the file.
Always check **three angles**:
- **overhead** `[−0.02, 1, 0.25]`: does the body shape read?
- **from the belly side**: legs and face
- **ground level** `[1, 0.02, 0.3]` with `center [0, 0.06, 0]`: anything below the horizon is under the floor, so you can see contact.
Try 4-6 variants side by side, pick the best, then write it into `POSES`.

### Pointers, trails and badges (`pointers3d.js` + `worldAt`)
- `worldAt(f)` returns `{ treat, trail, trailCol, hand | paw, treatHide, rings }`. `main.js` draws the biscuit at `treat` and calls
  `pointers.update(camera, f, W)`.
- **Paw cursor (what makes it look good):**
  - **Look:** a puffy glossy white paw (Phong, shininess 90) with pink beans (shininess 120), a thin gold **halo** torus spinning
    `f·0.12`, and a soft additive **glow** plane behind it.
  - **Placement:** it faces the camera and floats **0.075 m above the treat along the camera's up vector**, so the biscuit stays
    visible just under it.
  - **Animation:** it **pulses** (`1 + 0.06·sin(f·0.35)`), bobs (`0.008·sin(f·0.2)`), wobbles (rotZ / rotX / rotY slow sines),
    and the halo opacity breathes.
  - **While the dog acts on its own**, it hovers near the nose without leading.
  - Scale 0.85-1.15 (bigger for the hero arc).
- **POV hand** (`characters/hand-3d`, see its README): `W.hand = { at, pose, mode, grip, face }`. The pinch holds the biscuit at
  the treat point; a fist the dog paws at uses `grip: 'back'` so the paw lands on top; the high five is `pose: 'five', mode: 'up', face: pawPoint`.
  The arm base sits just below the frame (camera + forward·0.3 − up·0.42 + right·side).
  For high fives in POV, put the camera off to the side of the raised paw (z ≈ −0.2 for the right paw) so the palm doesn't cover the face. The black tube arm is a quadratic Bézier with a slight upward bow, rebuilt every
  frame. `handScale 1.2` and `armRadius 0.021` read well; bigger hides the face. After a reward, keep the hand at the mouth for
  about 10 frames with `treatHide: true` (the treat is being eaten).
- **Trails:** sample `treatPath` every 0.5 frame and keep a point every 0.03 m (InstancedMesh beads, 160 max). Colour by meaning:
  **white** = hand POV, **pink** = paw cursor, **green** = correct (low and close), **red** = mistake (too high), **gold** = the hero move.
- **Ground rings** (two expanding, fading yellow tori) mark a body part to watch, e.g. the hip during the settle.
- **Badges:** check on the rule words ("foundation", "close", "comfortable"), cross on the mistake, hearts on every reward,
  sparkle when the trick completes, click rays on the clicker, confetti on the final reward.

## Engine gotchas (from SKILL.md, kept, plus 3D-puppy ones)
- `#include <fog_vertex>` / `<fog_fragment>` go on their own lines. The final pass writes `linearToOutputTexel(...)`.
- The normal+depth pass swaps materials per mesh (world → normal/depth, skinned → `ndSkin`, cards → alpha-tested mask,
  `userData.ndSkip` meshes hidden: halo, glow, rings, blobs, clouds). Fog and shadows are off during it.
- Ink goes on the near side of depth jumps only; creases come from the normal dot; card neighbours are skipped.
- DOF: 48 taps with a per-sample CoC test.
- `story.js` must stay pure per frame. Module-level `CUR` / `TCUR` are set from `camAt(f)` at the top of `actorsAt` / `fxAt` before use.
- Remotion preview: the bundler skips file symlinks, so the audio is **copied** into `public/project` (`npm run use`), while `web/` is a directory symlink.
- npm 11 may skip esbuild's postinstall; check `npx esbuild --version` before assuming Remotion is broken.

## Architecture (reference)
- `web/index.html` loads `main.js` (ES module, top-level `await` for the GLB) over a local HTTP server. `main.js` exposes
  `window.renderFrame(f)`, `window.ready`, `window.TOTAL` and `window.shotAt` (for the preview overlay).
- `story.js` exports `FPS`, `TOTAL`, `SHOTS`, `shotAt`, `LIGHTS` / `lightFor`, `calibrate`, `dog3At`, `worldAt`, `camAt`, `dofAt`,
  `actorsAt(f, T)` and `fxAt(f, T)`, all pure functions of the frame.
- `render.mjs`: Playwright → `renderFrame(f)` → JPEG frames. `mix.py`: level lock. `finish.sh`: loudness, encode, QA.

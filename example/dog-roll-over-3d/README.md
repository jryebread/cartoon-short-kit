# Teach Your Dog to Roll Over — 3D puppy version (35.8 s, 1080x1920, 30 fps)

Finished video: `out/Teach-Your-Dog-to-Roll-Over-3D.mp4` (-14.4 LUFS).

Same voiceover and script as `../dog-roll-over`. The dog is the rigged 3D model from `web/models/dog-puppy.glb`. The 2D
trainer (bald, black stick-figure arms) appears in the hook and in the "yes / click" finale; after that the video uses POV shots
(from the trainer's eyes: a 3D hand pinching the biscuit on his stretchy black arm, leaving a dotted trail), an overhead push-in where a floating 3D paw cursor leads the head and the puppy settles onto its hip, and a low orbit. Hard cuts, no flashes.

Pointer rule: the **hand** (`W.hand`) whenever the camera is the trainer's eyes; the **paw cursor** (`W.paw`) for floating / overhead shots.

Preview: `cd ../../video-preview && npm run use -- ../example/dog-roll-over-3d && npm run studio`.

The characters are copies of `../../characters/` (trainer, puppy-3d, pointers-3d). Edit them there, then run `./build.sh` here.

Shots (14): hook full roll → POV lie down → overhead hip settle (paw) → relaxed orbit → POV nose/magnet → POV shoulder→spine →
low & close (paw, green, check) → too high (paw, red, stands, cross) → POV reward head turn + side → choose (close-up) →
comfortable on side (check) → the big arc and roll (paw, gold) → trainer "yes" + click (golden light) → POV reward + confetti.

| File | What it is |
|---|---|
| `web/models/dog-puppy.glb` | The puppy: 7.8k-vertex skinned mesh, 45-joint skeleton, morph targets `breath` + `blink`, one 8.7 s idle clip (unused) |
| `web/dogrig.js` | Rig controller: blended poses (`stand sit down hip tuck flop`), full-body `roll` (the head counter-rolls and tucks its chin belly-up; `twist` overrides), head look-at, `wag`, `tail`, `ears`, `jaw`, `pedal`, `blink`, `breath`. Tune poses in the `POSES` table |
| `posetest.sh` + `web/posetest.html` | Pose test sheet on the GPU: `./posetest.sh out.png '[{"w":{"hip":1}}]' 2 1.2` |
| `web/story.js` | Shots for frames 0-1072, the puppy timeline (`dog3At`), the hand/paw/treat/trail/rings (`worldAt`), cameras |
| `web/main.js` | Engine + GLB loading, toon material on the puppy, skinning-aware ink pass (`ndSkin`), pointers via `pointers3d.js`, biscuit, trail beads, ground rings |
| `audio.py` / `mix.py` | Synth music + SFX cue table for this timeline; `python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav` |

Render: `GPU=1 node render.mjs frames "0-1072"` (about 30 s) then `bash finish.sh "Teach Your Dog to Roll Over 3D"`.

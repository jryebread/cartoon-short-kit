# Teach Your Dog to Roll Over (35.8 s, 1080x1920, 30 fps)

Finished video: `out/Teach-Your-Dog-to-Roll-Over.mp4`. Run every command from inside this folder.

A step-by-step tutorial: the **trainer** (the reusable host character) kneels behind a **collie** on a padded mat and
lures it through the roll with a treat. Dotted path trails show exactly where the treat travels, check / cross badges mark
right and wrong, and the dog's white belly shows its body orientation at every stage.

## Inputs
| File | What it is |
|---|---|
| `voice.mp3` | The voiceover (copy of `../../audio_dog_roll_over.mp3`), 35.76 s = 1073 frames |
| `voice.mp3.words.json` | Word timestamps from `python3 transcribe.py voice.mp3` (faster-whisper) |
| `web/voiceenv.js` | Per-frame voice loudness for the trainer's lip sync, from `python3 make_voiceenv.py voice.mp3` |

## The characters (reusable)
| File | Character | Main call |
|---|---|---|
| `web/trainer.js` (canonical copy: `../../engine/trainer.js`) | **The trainer**: older, bearded, red vest with a white collar over a black tee, blue jeans, red sneakers, red-and-white cap with a paw badge, treat pouch, whistle, clicker, watch | `trainerDraw(p, opts)` |
| `web/rolldog.js` (canonical copy: `../../engine/rolldog.js`) | **Roll dog**: brown-and-white collie on a small 3D rig (body roll, leg poses, look-at head) | `dogRoll(p, opts)`, `dogRig(opts)` |
| `web/tutorfx.js` | Tutorial graphics: `fxTrail`, `fxCheck`, `fxCross`, `fxMagnet`, `fxPulse`, `fxSigh`, `fxClick`, `fxConfetti`, `fxCrumbs`, `fxHeart2`, `fxSpark2` | |

Trainer options (see the header of `trainer.js`): `expr` (`smile grin yes laugh talk oops focus patient proud`), `talk`
(lip sync 0..1), `kneel` 0..1, `lean` deg, `headTilt`, `blink`, `look`, and two arms: `far` (the treat hand) and `near`,
each a preset (`hang hip wave thumb signal present`) or `{ to: [x, y], hand: 'treat'|'give'|'palm'|'clicker'|'thumb'|'point'|'open'|'fist', rot }`.
Arms are 2-bone IK, so a hand goes exactly where you point it.

Dog options (see the header of `rolldog.js`): `rollF` / `rollR` (chest / hip roll in degrees: 0 upright, 62 settled on a
hip, 90 on its side, 180 belly-up, 270 other side, 360 upright), `legsF` / `legsR` pose weights `{ stand, sit, down, flop }`,
`look: [x, y, z]` (the head follows any point, e.g. the treat), `eyes`, `mouth` (`smile pant closed chew open`), `ears`,
`wag`, `tail`, `headTilt`, `pedal`.

Character test sheets: `node shot.mjs cast.html#trainer stills/cast_trainer.png` and `node shot.mjs cast.html#dog stills/cast_dog.png`.

## Pipeline
1. `python3 transcribe.py voice.mp3` writes word timings. `python3 make_voiceenv.py voice.mp3` writes the lip-sync envelope.
2. `./build.sh` concatenates `toonbase.js roman.js trainer.js rolldog.js tutorfx.js` into `web/toon.js`. Rerun after any cast edit.
3. `python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav` writes the stems and `mix_raw.wav`. Music is locked to -6.0 dB vs the voice; SFX sit at about -17 dB with peaks capped.
4. `GPU=1 node render.mjs frames "0-1072"` (about 0.06 s per frame on the Mac GPU; without `GPU=1` it uses the CPU at about 0.8 s per frame). Preview first in `../../video-preview` (Remotion Studio).
5. `bash finish.sh "Teach Your Dog to Roll Over"` encodes the MP4 and writes `out/qa_sheet.jpg`.

## Where things live
- `web/story.js`: **the shot plan**. The header lists the frame of every spoken word. It contains 14 shots, the treat waypoints
  (`NOSE`, `SHOULDER`, `SPINE`, `SPINE2`, `HIGH`, `ARC`) in dog space, `dogAt(f)` (the dog's pose and the treat position per
  frame), `trainerAt(f)` (the trainer's pose; `reachFor` solves his hand so the biscuit lands exactly on the treat point
  by casting the camera ray onto his card), cameras, depth of field, and effects.
- `web/main.js`: engine plus the backyard and the training corner (mat, cones, treat jar on a stool, agility jump).
- `audio.py`: the music groove and the SFX cue table (cue times are frames / 30).

## Staging notes
- The trainer kneels behind the dog (`TRN`, z = -0.42) and renders first. The dog card renders after him with depth testing
  off, so it sits over his legs and over the mat surface (a dog lying toward the camera projects slightly below the ground line).
- The shots by word: hook roll and chomp, then "lie down" (palm-down signal) and "one hip" (pulsing ring). Next come
  "foundation" (check), "nose / magnet" (close-up with field lines), "shoulder / spine" (dotted path), "low and close"
  (green path + check) and "too high" (red path, the dog stands, cross). After that: "reward" (chomp), "head turn / side"
  (two small rewards, the dog flops onto its side), "choose" (close-up, head tilt, the dog shifts on its own) and
  "comfortable" (tail thumps + check). Then the big "smooth arc" (dotted arc, the full roll) and "finish / yes / click /
  reward" (burst, clicker ring, chomp, confetti in golden light).

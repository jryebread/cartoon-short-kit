# Why Your Puppy Bites (3D puppy, informational short)

33.7 s, 1080x1920, 30 fps, 15 shots. Output: `out/Why-Your-Puppy-Bites.mp4`. Built with `SKILL-TRAINING-3D.md`, adapted for an
informational (not trick-training) video with motion graphics living in the 3D world.

New in this project (beyond the roll-over example):
- **3D battery** (`main.js`, `W.battery = { pos, level, s, blink, charge, glow }`): toon-shaded and inked, faces the camera, 4 segments green -> yellow -> red, blinking when low, a lightning bolt while charging.
- **2D screen layer** (`screenAt(f)` in `story.js` -> full-frame canvas): the sleep chart `fxSleepChart` (NEEDS 18-20 h vs GETS 12 h, with the missing -6 h).
- **Zoomies**: spline runs with hops/spins (`RUN_ZOOM`, `RUN_EVE`), a gallop made by blending the new `reach` <-> `gather` poses, banking, squash on landing, an orange speed trail.
- **Frame-keyed lighting** (`lightAt`): day -> late -> golden -> sunset -> dusk -> room lamp -> lights low -> morning.
- **The quiet room** set at z ~ 39: wire crate (open front), exercise pen, table lamp (PointLight dims with `W.lamp`), window, rug.
- Rope toy (`W.rope`), sleeve on the POV arm (`W.hand.sleeve`), and camera-relative HUD icons (`hud(d, up, right)` in `fxAt`).
- Icons (`web/tutorfx.js`, project-local): tooth, bite burst, gauge, warning, clock with red wedge, stopwatch, Zzz, moon, stop sign, muted speaker, dimmer, landing dust.

Rebuild: `./build.sh && GPU=1 node render.mjs frames "0-1011" && python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav && bash finish.sh "Why-Your-Puppy-Bites"`

v2: punch-in on the teeth on "their teeth" (F 35-43, `TEETH()` is measured from the rig in the real hook pose, `fxGlint` sparkle + a high "ting"),
and one-word-at-a-time captions (`web/captions.js` from `voice.mp3.words.json`, drawn last in `main.js` by `drawCaption`, uppercase, white fill
+ black border, a small pop on each word; `captionY(f)` in `story.js` puts them at y 1420, or 560 on the chart screen).

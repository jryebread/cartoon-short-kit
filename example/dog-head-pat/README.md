# Stop Patting Your Dog (29.6 s, 1080x1920, 30 fps)

Finished video: `out/Stop-Patting-Your-Dog.mp4`. Everything used to make it is in this folder.
Run every command from inside this folder (paths are relative).

## Inputs
| File | What it is |
|---|---|
| `audio_head_touch.mp3` | Voiceover, 21.7 s (your recording) |
| `call_to_action.mp3` | Call-to-action voiceover, 7.9 s (your recording) |
| `script.txt` | Text of the first voiceover (used for phrase timing) |
| `voice.wav` | The two clips joined end to end (29.6 s = 888 frames). Made with ffmpeg `concat`, voice untouched |

## Pipeline (in order)
1. **Transcribe** - `python3 transcribe.py audio_head_touch.mp3 call_to_action.mp3` writes `*.words.json` (word timestamps via faster-whisper). `timing.py` is the kit's silence-based fallback and was used for the phrase check.
2. **Join voice** - `ffmpeg -i audio_head_touch.mp3 -i call_to_action.mp3 -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=mono[a];[1:a]aresample=48000,aformat=channel_layouts=mono[b];[a][b]concat=n=2:v=0:a=1" -c:a pcm_s16le voice.wav`
3. **Picture** - `web/` is the renderer (three.js in headless Chromium).
4. **Sound** - `python3 audio.py` writes `music.wav` + `sfx.wav`; `python3 mix.py voice.wav music.wav sfx.wav` writes `mix_raw.wav` (music at -6 dB vs voice, SFX at 50 % with peak cap).
5. **Render frames** - `node render.mjs frames "0-887"` (about 1 s/frame, writes `frames/f0000.jpg` ...). Stills for checking: `node render.mjs stills/x "2,44,95"` then `python3 sheet.py stills/x stills/sheet.jpg 9`.
6. **Encode + QA** - `bash finish.sh "Stop Patting Your Dog"` applies one linear gain to about -14 LUFS plus a -1 dBFS limiter, encodes `out/Stop-Patting-Your-Dog.mp4`, and writes `out/qa_sheet.jpg`.

## Where things live
- `web/story.js` - **the shot plan**: shot list with frame ranges, lights, cameras, depth of field, every character pose and effect as a function of the frame number. Start here. The header comment lists the frame where each spoken word lands.
- `web/main.js` - engine plus the world (backyard, fence, doghouse, oaks, meadow, hawk shadow). Edit the section between `// ---------- world ----------` and `// ---------- cards ----------`.
- `web/dogcast.js` - the cast drawn in code: `dogDraw` (dog), `hawkDraw`, `handDraw` (giant hand), `squirrelDraw`, and effects (`fxDNA`, `fxHeart`, `fxGlyph`, `fxSpark`, `fxArrow`).
- `web/roman.js` - the human (`romanFront`), extended with `pants`/`shoes`/`sleeve` colours, a `"to"` arm pose that reaches any point, mitten hands, and the `sign` chalkboard prop.
- `web/toonbase.js` - the Pen/face library (generated from `../../vendor/toon.ts`, do not edit).
- `web/toon.js` - **generated**: `cat web/toonbase.js web/roman.js web/dogcast.js > web/toon.js`. Rerun after editing the cast files.
- `web/paint.js`, `web/motion.js` - painted textures and motion helpers (unchanged from the kit).
- `web/lib/three.module.js` - three.js r160.
- `web/cast.html` + `shot.mjs` - character test sheet: `node shot.mjs cast.html stills/cast.png`.
- `audio.py` - music sections and the SFX cue table (cue times are frames / 30).

## Rebuild from scratch
```
cat web/toonbase.js web/roman.js web/dogcast.js > web/toon.js
python3 audio.py && python3 mix.py voice.wav music.wav sfx.wav
node render.mjs frames "0-887"
bash finish.sh "Stop Patting Your Dog"
```
Needs Node 22.6+, ffmpeg, Python 3 with numpy and Pillow, and Playwright with Chromium (`node_modules/playwright` is a link to the global install).

`frames/` (233 MB), `*.wav` and `stills/` are generated and can be deleted; the commands above recreate them.

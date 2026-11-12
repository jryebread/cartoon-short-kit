"""Per-frame voice loudness (0..1) for the trainer's lip sync -> web/voiceenv.js.   python3 make_voiceenv.py voice.mp3"""
import sys, json, subprocess, numpy as np
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.float32); n = 1600; k = int(np.ceil(len(x) / n)); x = np.pad(x, (0, k * n - len(x)))
r = np.sqrt((x.reshape(k, n) ** 2).mean(1)); r = r / np.percentile(r, 95)
# mouth flaps on syllables: band-limit the envelope and add a little chatter
e = np.clip(r, 0, 1); e = np.convolve(e, [0.25, 0.5, 0.25], "same")
open("web/voiceenv.js", "w").write("export const VENV = " + json.dumps([round(float(v), 2) for v in e]) + ";\n")
print("frames", k)

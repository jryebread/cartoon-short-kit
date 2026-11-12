#!/usr/bin/env python3
"""Level-locked mix: music at exactly 50 % (-6 dB) of the voice's gated RMS, SFX at 50 % gated RMS with peaks capped
at 0.7x the voice peak. No ducking or compression. Writes mix_raw.wav.   python3 mix.py voice.wav music.wav sfx.wav"""
import sys, subprocess, wave, numpy as np
SR = 48000
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
def gated_rms(x, win=0.4, gate_db=-20):
    n = int(win * SR); k = len(x) // n
    if k == 0: return float(np.sqrt(np.mean(x ** 2)))
    r = np.sqrt(np.mean(x[: k * n].reshape(k, n) ** 2, axis=1)); r = r[r > 1e-6]
    if not len(r): return 0.0
    loud = r[20 * np.log10(r) > 20 * np.log10(r.max()) + gate_db]   # blocks within 20 dB of the loudest block
    return float(np.sqrt(np.mean(loud ** 2)))
db = lambda a, b: 20 * np.log10(a / b)
v, m, s = (load(p) for p in sys.argv[1:4])
N = len(v); m = np.pad(m, (0, max(0, N - len(m))))[:N]; s = np.pad(s, (0, max(0, N - len(s))))[:N]
vr, vp = gated_rms(v), np.abs(v).max()
m *= 0.5 * vr / gated_rms(m)
gs = 0.5 * vr / gated_rms(s); gs = min(gs, 0.7 * vp / np.abs(s).max()); s *= gs
mix = v + m + s
print(f"voice gated RMS {20*np.log10(vr):.1f} dBFS | music {db(gated_rms(m), vr):+.1f} dB vs voice | sfx {db(gated_rms(s), vr):+.1f} dB vs voice, sfx peak {db(np.abs(s).max(), vp):+.1f} dB vs voice peak")
mix /= max(1.0, np.abs(mix).max() / 0.98)   # only prevents clipping in the raw file (one linear gain)
with wave.open("mix_raw.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("mix_raw.wav", N / SR)

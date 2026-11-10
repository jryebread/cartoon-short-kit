"""Synthesized music bed + SFX stems for "Stop patting your dog on the head" (888 frames). Writes music.wav and sfx.wav only.
Mix with: python3 mix.py voice.wav music.wav sfx.wav"""
import numpy as np, wave

SR = 48000
DUR = 888 / 30
N = int(DUR * SR)
rng = np.random.default_rng(7)
F = lambda f: f / 30

def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
def lp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x)).astype(np.float32)
def hp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 - 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x)).astype(np.float32)
def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i < N and j > i: buf[i:j] += sig[: j - i] * gain
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
def noise(d): return rng.standard_normal(int(d * SR)).astype(np.float32)

# ---------------- instruments ----------------
def pluck(f, dur=0.35, bright=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum((bright ** k) * np.sin(2 * np.pi * f * (k + 1) * t) / (k + 1) for k in range(6))
    return (s * env(n, 0.003, dur * 0.35)).astype(np.float32)
def pad(fs, dur, cut=1500):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in fs:
        for det in (-0.12, 0.12):
            ph = 2 * np.pi * (f + det) * t + 0.002 * np.sin(2 * np.pi * 4.5 * t)
            s += sum(np.sin((k + 1) * ph) / (k + 1) ** 1.6 for k in range(6))
    a = np.minimum(1, t / 0.35) * np.minimum(1, (dur - t) / 0.4).clip(0)
    return lp_fast((s * a).astype(np.float32), cut) / (2 * len(fs))
def bell(f, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return (sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) * g for m, k, g in [(1, 3, 1), (2.76, 6, 0.4), (5.4, 9, 0.2)]) * 0.5).astype(np.float32)
def drum(kind):
    if kind == "kick":
        n = int(0.3 * SR); t = np.arange(n) / SR; f = 50 + 90 * np.exp(-t * 30)
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)).astype(np.float32)
    if kind == "shaker":
        n = int(0.08 * SR); t = np.arange(n) / SR
        return hp_fast((rng.standard_normal(n) * np.exp(-t * 60)).astype(np.float32), 4000)
    n = int(0.15 * SR); t = np.arange(n) / SR
    return hp_fast((rng.standard_normal(n) * np.exp(-t * 30) * 0.5 + np.sin(2 * np.pi * 220 * t) * np.exp(-t * 25) * 0.4).astype(np.float32), 400)

# ---------------- music ----------------
music = np.zeros(N, np.float32)
# A: playful (0 - 4.95 s): bouncy bass + pluck, C F G C, 112 bpm
A_END = F(149); beat = 60 / 112; prog = [(48, [60, 64, 67]), (53, [65, 69, 72]), (55, [67, 71, 74]), (48, [60, 64, 67])]
tt = 0.0; bar = 0
while tt < A_END:
    root, ch = prog[bar % 4]
    for b in range(4):
        tb = tt + b * beat
        if tb >= A_END: break
        if b % 2 == 0: place(music, drum("kick"), tb, 0.5)
        else: place(music, drum("snare"), tb, 0.28)
        place(music, drum("shaker"), tb + beat / 2, 0.25)
        place(music, pluck(midi(root - 12 + (7 if b == 2 else 0)), 0.3, 0.45), tb, 0.4)
        place(music, pluck(midi(ch[b % 3]), 0.2, 0.6), tb + beat / 2, 0.16)
    bar += 1; tt += beat * 4
i0, i1 = int((A_END - 0.25) * SR), int(A_END * SR); music[i0:i1] *= np.linspace(1, 0, i1 - i0); music[i1:] = 0
# B: tension (4.97 - 9.97 s): low minor pad + pulsing bass, rising
B0, B1 = F(149), F(299)
place(music, pad([midi(45), midi(48), midi(52)], B1 - B0, 900), B0, 0.55)
pb = 60 / 100; t = B0
while t < B1 - 0.1:
    k = (t - B0) / (B1 - B0); place(music, pluck(midi(33), 0.35, 0.3), t, 0.45 + 0.3 * k); t += pb
# C: hawk + fear (9.97 - 16.3 s): music out, dark drone only
C0, C1 = F(299), F(489)
dn = int((C1 - C0) * SR); td = np.arange(dn) / SR
drone = (np.sin(2 * np.pi * 55 * td) + 0.5 * np.sin(2 * np.pi * 58.3 * td) + 0.3 * np.sin(2 * np.pi * 110 * td)) * np.minimum(1, td / 0.8) * np.minimum(1, (C1 - C0 - td) / 0.3).clip(0)
place(music, lp_fast(drone.astype(np.float32), 500), C0, 0.3)
# D: warm calm (16.3 - end): soft pads + gentle arpeggio, Cmaj7 Fmaj7 Am7 G, 84 bpm
D0 = F(489); beat = 60 / 84; prog = [[48, 60, 64, 67, 71], [41, 57, 60, 64, 69], [45, 57, 60, 64, 67], [43, 55, 59, 62, 67]]
tt = D0; bar = 0
while tt < DUR - 0.2:
    ch = prog[bar % 4]; L = min(beat * 4, DUR - tt)
    place(music, pad([midi(m) for m in ch[1:4]], L * 1.02, 1400), tt, 0.45)
    place(music, pluck(midi(ch[0]), 0.9, 0.3), tt, 0.4)
    for k in range(8):
        tb = tt + k * beat / 2
        if tb < DUR - 0.2: place(music, pluck(midi(ch[1 + (k * 3) % 4] + 12), 0.35, 0.55), tb, 0.13)
    bar += 1; tt += beat * 4
fo = int(1.2 * SR); music[-fo:] *= np.linspace(1, 0, fo)

# ---------------- sfx ----------------
sfx = np.zeros(N, np.float32)
def thunk(f0=90, d=0.3):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f0 * t * (1 + 0.6 * np.exp(-t * 40))) * np.exp(-t * 14) + lp_fast(noise(d), 1200) * np.exp(-t * 30) * 0.5).astype(np.float32)
def pat():  # soft fur "boff"
    d = 0.16; n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), 700) * np.exp(-t * 35) * 1.6 + np.sin(2 * np.pi * 120 * t) * np.exp(-t * 30) * 0.5).astype(np.float32)
def whoosh(d=0.5, cut=1500):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), cut) * np.sin(np.pi * t / d) ** 2 * 0.6).astype(np.float32)
def riser(d):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    s = lp_fast(noise(d), 600) * k ** 2 * 0.8 + np.sin(2 * np.pi * np.cumsum(60 + 140 * k ** 2) / SR) * k ** 2 * 0.4
    return s.astype(np.float32)
def pop(f0=500, f1=1100, d=0.12):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, n)) / SR) * env(n, 0.002, d * 0.35)).astype(np.float32)
def whimper(d=0.6, f0=900):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    f = f0 * (1 + 0.25 * np.sin(np.pi * k)) * (1 - 0.35 * k) + 12 * np.sin(2 * np.pi * 7 * t)
    ph = np.cumsum(f) / SR * 2 * np.pi
    s = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * np.sin(np.pi * k) ** 1.5
    return lp_fast(s.astype(np.float32), 2500) * 0.6
def screech(d=0.75):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    f = 2600 * (1 - 0.45 * k) + 120 * np.sin(2 * np.pi * 31 * t)
    ph = np.cumsum(f) / SR * 2 * np.pi
    s = (np.sin(ph) + 0.5 * np.sin(2 * ph + 0.3)) * (1 + 0.4 * rng.standard_normal(n)) * np.minimum(1, t / 0.03) * (1 - k) ** 0.6
    return hp_fast(lp_fast(s.astype(np.float32), 6000), 900) * 0.45
def flap():
    d = 0.14; n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), 900) * np.sin(np.pi * t / d) * 1.1).astype(np.float32)
def heartbeat():
    return np.concatenate([thunk(55, 0.22), np.zeros(int(0.06 * SR), np.float32), thunk(50, 0.25) * 0.7])
def sting():
    n = int(2.0 * SR); t = np.arange(n) / SR
    low = np.sin(2 * np.pi * 41 * t) * np.exp(-t * 1.5) * 1.2
    hit = lp_fast(noise(2.0), 900) * np.exp(-t * 6) * 0.8
    st = pad([midi(45), midi(48), midi(51)], 1.4, 2000); s = low + hit; s[: len(st)] += st * 2.5 * np.exp(-np.arange(len(st)) / SR * 2)
    return s.astype(np.float32)
def shimmer(d):
    out = np.zeros(int(d * SR), np.float32); r = np.random.default_rng(3)
    for k in range(int(d * 9)):
        b = bell(midi(84 + r.choice([0, 4, 7, 11, 12, 16])), 0.6) * 0.35; i = int(r.uniform(0, d - 0.6) * SR); out[i:i + len(b)] += b
    return out
def wind(d):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp_fast(noise(d), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t) ** 2) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.4)).astype(np.float32)
def chirp(f0):
    d = 0.09; n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.5 * np.sin(np.pi * t / d))) / SR) * np.sin(np.pi * t / d)).astype(np.float32)
def chitter(d):
    out = np.zeros(int(d * SR), np.float32)
    for k in range(int(d * 14)): c = chirp(3200 + 400 * (k % 3)) * 0.5; i = int(k / 14 * SR); out[i:i + len(c)] += c[: len(out) - i]
    return out
def bark():
    d = 0.22; n = int(d * SR); t = np.arange(n) / SR
    f = 420 * (1 + 0.5 * np.exp(-t * 25)); ph = np.cumsum(f) / SR * 2 * np.pi
    s = (np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.3) * env(n, 0.005, 0.07) + lp_fast(noise(d), 1800) * env(n, 0.002, 0.04) * 0.4
    return lp_fast(s.astype(np.float32), 2200)
def chime():
    out = np.zeros(int(1.8 * SR), np.float32)
    for i, m in enumerate([79, 84, 88, 91]): b = bell(midi(m), 1.4) * 0.5; j = int(i * 0.07 * SR); out[j:j + len(b)] += b
    return out

place(sfx, whoosh(0.45), F(0), 0.45)                      # hand swings in
for c in (14, 30, 44, 58): place(sfx, pat(), F(c), 0.9)   # pats on "patting / dog / top / head"
place(sfx, whimper(0.5, 950), F(62), 0.45)
place(sfx, whoosh(0.7, 1200), F(85), 0.45)                # crane down
place(sfx, pop(600, 1200), F(90), 0.5)                    # "?" pops
place(sfx, riser(F(206 - 150)), F(150), 0.6)              # the hand looms
place(sfx, thunk(70, 0.4), F(205), 0.9); place(sfx, whimper(0.7, 1000), F(209), 0.55)   # flinch
place(sfx, pop(700, 1400), F(209), 0.45)                  # "!"
place(sfx, shimmer(2.0), F(234), 0.4); place(sfx, chime(), F(264), 0.4)   # DNA glows on "DNA"
place(sfx, whoosh(0.4), F(296), 0.6)                      # flash to the wild
place(sfx, wind(F(489 - 299)), F(299), 0.5)
place(sfx, screech(0.8), F(306), 0.5)                     # hawk overhead
place(sfx, riser(F(360 - 333)), F(333), 0.5); place(sfx, whoosh(0.9, 2500), F(340), 0.6)   # the dive
place(sfx, screech(0.6), F(348), 0.55)
place(sfx, thunk(60, 0.45), F(361), 0.9); place(sfx, whoosh(0.6, 3000), F(361), 0.6)
for k in range(6): place(sfx, flap(), F(366) + k * 0.16, 0.6)
for k in range(5): place(sfx, heartbeat(), F(400) + k * 0.62, 0.7)                        # fear heartbeat
place(sfx, whimper(0.9, 850), F(420), 0.45)
place(sfx, whoosh(1.0, 900), F(436), 0.45)                # hawk shadow sweeps over
place(sfx, sting(), F(458), 0.8)                          # "fear"
place(sfx, whoosh(0.4), F(486), 0.5)                      # flash back to the yard
for k in range(26):                                       # birdsong for the calm + CTA
    tb = F(492) + k * 0.5 + rng.uniform(0, 0.25)
    if tb < DUR - 0.3: place(sfx, chirp(rng.uniform(2800, 4200)), tb, 0.18); place(sfx, chirp(rng.uniform(3000, 4500)), tb + 0.11, 0.14)
place(sfx, chime(), F(604), 0.4)                          # "unlock"
for i in range(4): place(sfx, pop(500 + i * 120, 900 + i * 150, 0.1), F(622 + i * 5), 0.35)   # hearts on "calm"
place(sfx, whoosh(0.35), F(649), 0.35)
place(sfx, pop(600, 1100), F(712), 0.35)                  # heart on "trust"
place(sfx, chitter(1.2), F(735), 0.3)                     # squirrel on "stop reactivity"
place(sfx, whoosh(0.4, 2000), F(798), 0.5); place(sfx, pop(400, 800, 0.15), F(808), 0.5)   # sign pops up on "Comment"
place(sfx, chime(), F(815), 0.45)                         # "Calm"
place(sfx, pop(900, 500), F(834), 0.4)                    # arrow on "below"
place(sfx, bark(), F(857), 0.45); place(sfx, bark(), F(864), 0.35)
for i in range(3): place(sfx, pop(600 + i * 150, 1100 + i * 150, 0.1), F(858 + i * 6), 0.3)

def write(path, x):
    pcm = (np.clip(x / max(1e-9, np.abs(x).max()) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
write("music.wav", music); write("sfx.wav", sfx); print("stems ok", DUR)

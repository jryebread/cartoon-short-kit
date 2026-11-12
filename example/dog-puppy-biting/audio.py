"""Synthesized music bed + SFX stems for "Why Your Puppy Bites" (1012 frames). Writes music.wav and sfx.wav only.
Mix with: python3 mix.py voice.wav music.wav sfx.wav"""
import numpy as np, wave

SR = 48000
DUR = 1012 / 30
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
# One bright, bouncy groove (C G Am F, 104 bpm): plucked bass, off-beat ukulele-ish chords, kick + shaker.
# It thins out for the "too high" mistake (F 540-590) and lands on a flourish at the reward (F 1046).
music = np.zeros(N, np.float32)
# Bright groove (C G Am F, 104 bpm) for the hook + chart; busier hats for the overtired / zoomies part (F 303-610);
# thins out for "stop... more play" and the stopwatch; a soft pad + bell lullaby for the quiet room (F 779-968);
# the groove comes back lightly for the outro with a small flourish on "fix" (F 988).
beat = 60 / 104; prog = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
tt = 0.0; bar = 0
while tt < DUR - 0.3:
    root, ch = prog[bar % 4]
    for b in range(4):
        tb = tt + b * beat
        if tb >= DUR - 0.3: break
        fr = tb * 30
        lull = 779 <= fr < 969; thin = 611 <= fr < 779; busy = 303 <= fr < 611
        if lull:
            if b == 0: place(music, pad([midi(m - 12) for m in ch], beat * 4 + 0.3, 1100), tb, 0.55)
            if b in (0, 2): place(music, bell(midi(ch[(bar + b) % 3] + 12), 1.4), tb + 0.2, 0.05)
            continue
        if not thin:
            if b % 2 == 0: place(music, drum("kick"), tb, 0.42)
            place(music, drum("shaker"), tb + beat / 2, 0.22)
            if busy: place(music, drum("shaker"), tb + beat / 4, 0.12); place(music, drum("shaker"), tb + 3 * beat / 4, 0.12)
            if b == 3: place(music, drum("snare"), tb, 0.16)
        place(music, pluck(midi(root - 12 + (7 if b == 2 else 0)), 0.32, 0.4), tb, 0.36 if not thin else 0.22)
        for k, m in enumerate(ch): place(music, pluck(midi(m), 0.22, 0.65), tb + beat / 2 + k * 0.012, 0.09 if not thin else 0.06)
        if b == 0 and bar % 2 == 1 and not thin: place(music, bell(midi(ch[2] + 12), 0.5), tb + beat * 1.5, 0.05)
    bar += 1; tt += beat * 4
# "uh-oh" descending pluck when the 12 h bar falls short
for i, m in enumerate([72, 69, 65, 60]): place(music, pluck(midi(m), 0.4, 0.6), F(286) + i * 0.13, 0.2)
# outro flourish
for i, m in enumerate([60, 64, 67, 72, 76, 79, 84]): place(music, pluck(midi(m), 0.4, 0.7), F(986) + i * 0.05, 0.18)
for m in (72, 76, 79): place(music, bell(midi(m), 1.4), F(990), 0.1)
fo = int(0.8 * SR); music[-fo:] *= np.linspace(1, 0, fo)

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

def crunch(d=0.5):
    out = np.zeros(int(d * SR), np.float32)
    for k in range(5):
        n = int(0.05 * SR); t = np.arange(n) / SR; b = hp_fast((rng.standard_normal(n) * np.exp(-t * 70)).astype(np.float32), 1800) * 0.9
        i = int(k * 0.09 * SR); out[i:i + n] += b[: len(out) - i]
    return out
def click():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (hp_fast(rng.standard_normal(n).astype(np.float32) * np.exp(-t * 400), 2500) * 1.4 + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300) * 0.6).astype(np.float32)
def ding(m=88):
    return (bell(midi(m), 0.9) + bell(midi(m + 7), 0.9) * 0.6).astype(np.float32)
def bonk():
    n = int(0.35 * SR); t = np.arange(n) / SR; f = 300 * np.exp(-t * 6)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.9).astype(np.float32)
def slide(d, f0, f1):
    n = int(d * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / d)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.6).astype(np.float32)
def hum(d):
    n = int(d * SR); t = np.arange(n) / SR
    return ((np.sin(2 * np.pi * 220 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t)) * np.sin(np.pi * t / d) * 0.35).astype(np.float32)
def rustle(d):
    n = int(d * SR); t = np.arange(n) / SR
    return (hp_fast(lp_fast(noise(d), 3500), 600) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3 * t))) * np.sin(np.pi * t / d) * 0.7).astype(np.float32)
def sigh(d=0.9):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    return (lp_fast(noise(d), 900) * np.sin(np.pi * k) ** 1.5 * (1 - 0.5 * k) * 0.9).astype(np.float32)
def taps(d, rate=12):
    out = np.zeros(int(d * SR), np.float32)
    for k in range(int(d * rate)): s = thunk(160 + 40 * (k % 2), 0.08) * 0.5; i = int(k / rate * SR); out[i:i + len(s)] += s[: len(out) - i]
    return out

# ---- extra synths for this short ----
def beep(f=1500, d=0.08):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sign(np.sin(2 * np.pi * f * t)) * 0.3 * env(n, 0.002, d * 0.6)).astype(np.float32)
def grr(d=0.6):  # playful puppy growl
    n = int(d * SR); t = np.arange(n) / SR
    s = lp_fast(noise(d), 380) * (0.55 + 0.45 * np.sin(2 * np.pi * 28 * t)) + np.sin(2 * np.pi * (95 + 10 * np.sin(2 * np.pi * 3 * t)) * t) * 0.3
    return (s * np.sin(np.pi * t / d) ** 0.7 * 1.2).astype(np.float32)
def nip():  # quick bite: tooth click + small crunch
    return np.concatenate([click() * 0.9, crunch(0.3)[: int(0.16 * SR)] * 0.8])
def tick():
    n = int(0.025 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300) * 0.5).astype(np.float32)
def yawn(d=1.0):
    return (whimper(d, 520) * 0.7 + sigh(d) * 0.6).astype(np.float32)

# ---- cue table (frames / 30); hard cuts, so no transition whooshes ----
for t0 in (1, 24): place(sfx, nip(), F(t0), 0.6)
place(sfx, grr(2.2), F(0), 0.35)                                                                                 # hook: nipping + play growl
place(sfx, pop(600, 1200), F(41), 0.4); place(sfx, bonk(), F(49), 0.5)                                         # tooth, crossed out
place(sfx, pop(500, 900), F(74), 0.35); place(sfx, slide(1.0, 900, 180), F(84), 0.45)                          # battery pops in, drains
place(sfx, yawn(0.8), F(99), 0.55)
for k in range(3): place(sfx, beep(1400), F(114) + k * 0.33, 0.3)            # yawn, low-battery beeps
place(sfx, pop(400, 900, 0.14), F(142), 0.4); place(sfx, slide(0.8, 300, 900), F(158), 0.35)                   # chart, the NEEDS bar grows
place(sfx, pop(700, 1300), F(186), 0.35); place(sfx, ding(88), F(206), 0.35)                                    # 18-20 cap
place(sfx, slide(0.75, 300, 650), F(258), 0.35); place(sfx, thunk(120, 0.2), F(276), 0.4)                      # GETS bar stops at 12
for k in range(3): place(sfx, beep(900, 0.1), F(290) + k * 0.2, 0.25)                                            # missing hours
for t0 in list(range(311, 337, 10)) + list(range(343, 385, 8)): place(sfx, thunk(160, 0.1), F(t0), 0.4)         # bouncing
place(sfx, pop(500, 1000), F(337), 0.35); place(sfx, slide(0.35, 700, 300), F(355), 0.4)                       # gauge, needle dips
place(sfx, slide(0.25, 300, 1600), F(366), 0.45)
for k in range(4): place(sfx, beep(1800, 0.07), F(372) + k * 0.14, 0.25)  # ...then pins red
place(sfx, rustle(0.4), F(385), 0.4); place(sfx, pop(800, 1500), F(393), 0.35); place(sfx, whoosh(0.6, 1600), F(396), 0.5); place(sfx, thunk(110, 0.25), F(414), 0.5)
place(sfx, whoosh(0.9, 1300), F(428), 0.45); place(sfx, taps(0.9, 16), F(428), 0.35); place(sfx, thunk(110, 0.2), F(446), 0.45)   # zoomies
place(sfx, whoosh(0.3, 1500), F(455), 0.35); place(sfx, nip(), F(459), 0.6); place(sfx, grr(0.6), F(461), 0.35)                 # hands
place(sfx, nip(), F(479), 0.6); place(sfx, nip(), F(492), 0.6); place(sfx, grr(0.9), F(493), 0.4)                              # ankles, sleeves
place(sfx, taps(0.85, 16), F(519), 0.35); place(sfx, pop(500, 1000), F(522), 0.3)                                              # evening zooms, clock
for k in range(int((580 - 525) / 7.5)): place(sfx, tick(), F(525) + k * 0.25, 0.35)                                             # clock hands spin
place(sfx, whoosh(0.5, 1500), F(545), 0.45); place(sfx, thunk(100, 0.25), F(559), 0.5); place(sfx, taps(0.65, 16), F(560), 0.3)  # leap the jump
place(sfx, bonk(), F(563), 0.4)
for t0 in (566, 574, 588): place(sfx, nip(), F(t0), 0.35)                                    # worst: the red wedge
place(sfx, thunk(110, 0.2), F(591), 0.45); place(sfx, whoosh(0.45, 1700), F(592), 0.45); place(sfx, thunk(100, 0.3), F(604), 0.5)
place(sfx, grr(2.6), F(611), 0.35); place(sfx, rustle(2.6), F(611), 0.3); place(sfx, bonk(), F(617), 0.45)                     # tug play, stop sign
for t0 in range(614, 694, 18): place(sfx, nip(), F(t0), 0.35)
place(sfx, slide(0.6, 500, 160), F(640), 0.3); place(sfx, bonk(), F(666), 0.55); place(sfx, grr(0.9), F(668), 0.3)            # battery dips, cross on "play"
place(sfx, pop(500, 900), F(696), 0.3)
for k in range(int((731 - 699) / 7.5)): place(sfx, tick(), F(699) + k * 0.25, 0.35)   # stopwatch
place(sfx, ding(91), F(731), 0.45)
place(sfx, yawn(1.0), F(747), 0.6); place(sfx, shimmer(1.0), F(751), 0.25); place(sfx, thunk(75, 0.3), F(770), 0.4)            # nap time
place(sfx, pop(400, 700), F(783), 0.3); place(sfx, ding(88), F(807), 0.35); place(sfx, ding(91), F(821), 0.35)                  # quiet room, crate, pen
place(sfx, click(), F(838), 0.6); place(sfx, slide(0.45, 700, 250), F(839), 0.25)                                             # lights low
place(sfx, riser(1.5), F(858), 0.25); place(sfx, chime(), F(905), 0.4)                                                         # battery recharges
for k in range(3): place(sfx, pop(600 + 100 * k, 1000 + 100 * k, 0.1), F(912 + 3 * k), 0.22)                                    # bite icons appear
for t0 in (922, 931, 940): place(sfx, bell(midi(96), 0.6) * 0.5, F(t0), 0.3)                                                   # ...and fade away
place(sfx, sigh(1.0), F(948), 0.35)
place(sfx, pop(500, 1000), F(972), 0.3); place(sfx, pop(700, 1300), F(975), 0.3); place(sfx, pop(800, 1500, 0.14), F(988), 0.4)

place(sfx, whoosh(0.3, 2200), F(34), 0.4)                                                                        # punch-in on "their teeth"
place(sfx, bell(midi(100), 0.7) * 0.7 + bell(midi(107), 0.7) * 0.4, F(43), 0.45)                              # teeth glint

def write(path, x):
    pcm = (np.clip(x / max(1e-9, np.abs(x).max()) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
write("music.wav", music); write("sfx.wav", sfx); print("stems ok", DUR)

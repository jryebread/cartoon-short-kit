import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("base.en", compute_type="int8")
for path in sys.argv[1:]:
    raw = subprocess.run(["ffmpeg","-v","error","-i",path,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
    a = np.frombuffer(raw, np.float32).copy()
    segs, _ = m.transcribe(a, word_timestamps=True)
    ws = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
    json.dump(ws, open(path + ".words.json", "w"), indent=0)
    print(path); print(" ".join(f"{w['w']}[{w['s']:.2f}-{w['e']:.2f}]" for w in ws))

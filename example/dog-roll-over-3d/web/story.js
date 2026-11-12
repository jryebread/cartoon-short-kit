// "Teach Your Dog to Roll Over" — 3D puppy version (dog-puppy.glb + the 2D bald trainer), 1073 frames, timed to voice.mp3.
// Word frames: Let's 0 teach 8 dog 20 roll 35 over 41-54 | Ask 67 dog 76 lie 90 down 94-103 | then 112 settle 130 onto 137
// one 147 hip 154-161 | A 184 relaxed 185 down 193 foundation 217 trick 240-247 | Hold 262 treat 269 right 274 nose 308-314
// like 325 magnet 334-342 | Slowly 354 move 361 shoulder 389-400 back 413 toward 420 spine 433-442 | Keep 456 low 463 close 474-481 |
// Because 497 drifts 509 too 518 high 523-532 | dog 546 stand 565 up 573-580 | At 596 first 599 reward 611 little 622 things 628-635 |
// head 651 turn 656-663 | settling 679 side 703-713 | Let 728 choose 743 each 752 movement 762-773 | Once 785 comfortable 799 side 822-833 |
// keep 840 treat 851 moving 856 smooth 874 arc 882-889 follow 901 all 916 way 922 across 926-934 |
// The 955 moment 958 finish 970 roll 985-989 | say 1000 yes 1007-1016 | click 1024-1031 | then 1041 reward 1046-1052 | end 1072.
// Pointers: the HAND (W.hand, trainer's-eyes POV shots) and the floating PAW cursor (W.paw, floating / overhead shots).
// Hard cuts only, no flashes. Roll sign: negative roll = the puppy goes down on its RIGHT side first (belly turns to world -z).
import { M, camFromKeys, idle, blinkAt, q, clamp, lerp, lerp3, ramp, spline } from './motion.js';
import { trainerShoulder } from './toon.js';
import { VENV } from './voiceenv.js';
export const FPS = 30, TOTAL = 1073, DECK = 0;
export const SHOTS = [
  { id: 'hook', a: 0, b: 66, light: 'day' },          // trainer leads a full roll, chomp
  { id: 'povLie', a: 67, b: 110, light: 'day' },      // POV hand: sit -> down
  { id: 'overHip', a: 111, b: 176, light: 'day' },    // overhead, paw cursor: settle onto one hip
  { id: 'relax', a: 177, b: 260, light: 'day' },      // low orbit, check on "foundation"
  { id: 'povNose', a: 261, b: 352, light: 'day' },    // POV hand: treat at the nose, "like a magnet" wiggle
  { id: 'povShoulder', a: 353, b: 452, light: 'day' },// POV hand: nose -> shoulder -> spine
  { id: 'overLow', a: 453, b: 495, light: 'day' },    // floating, paw cursor: low and close (green path, check)
  { id: 'tooHigh', a: 496, b: 595, light: 'day' },    // floating, paw cursor drifts too high (red), puppy stands, cross
  { id: 'povReward', a: 596, b: 727, light: 'day' },  // POV hand: reward a head turn, then settling onto the side
  { id: 'choose', a: 728, b: 784, light: 'day' },     // low close-up: the puppy shifts on its own, paw waits
  { id: 'comfy', a: 785, b: 839, light: 'day' },      // on its side, tail thumps, check
  { id: 'arc', a: 840, b: 994, light: 'day' },        // the big smooth arc: paw cursor + full roll across
  { id: 'yes', a: 995, b: 1040, light: 'golden' },    // trainer: "yes" + click
  { id: 'povFinal', a: 1041, b: 1072, light: 'golden' }, // POV hand: reward, confetti
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];
const sm = M.smooth;
const KF = (f, keys, ease = sm) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [fa, va] = keys[i], [fb, vb] = keys[i + 1]; if (f <= fb) { const t = ease((f - fa) / (fb - fa)); return Array.isArray(va) ? va.map((v, k) => lerp(v, vb[k], t)) : lerp(va, vb, t); } }
  return keys[keys.length - 1][1];
};
const add = (a, b) => a.map((v, i) => v + b[i]);

// ---------- lights ----------
export const LIGHTS = {
  day: { az: 135, el: 50, sky: '#c4d6f2', ground: '#8a8262', hemi: 1.2, sun: '#fff1dc', sunI: 2.4, fog: '#cadcf0', fogNear: 60, fogFar: 700,
    skyTop: '#3f80d4', skyHor: '#c3daf2', sat: 1.08, vig: 0.2, shadowExt: 3 },
  golden: { az: 120, el: 30, sky: '#ffe8cc', ground: '#8a7a62', hemi: 1.2, sun: '#ffe2bc', sunI: 2.4, fog: '#f4d6b0', fogNear: 60, fogFar: 650,
    skyTop: '#6f8fd8', skyHor: '#ffd2a0', sat: 1.04, vig: 0.24, shadowExt: 3, gain: '#fffaf2' },
};
export const lightFor = (S) => ({ ...LIGHTS[S.light] });

// ---------- staging ----------
const MAT = 0.064, K = 0.00225, ST = 1.08;
const DOGPOS = [0, MAT, 0], DOGYAW = Math.PI / 2;      // puppy on the mat, nose toward +x
const TRN = [0.52, MAT, -0.66];                           // 2D trainer card (flipped: faces -x), hook only
const FIN = [0, MAT, 0.2], TRN2 = [0.52, MAT, -0.46];  // after the big roll the puppy has moved one body-width toward +z
let CUR = [0, 1, 3], TCUR = TRN;
const axisOf = (pos) => { const ry = Math.atan2(CUR[0] - pos[0], CUR[2] - pos[2]); return [Math.cos(ry), 0, -Math.sin(ry)]; };
/** world point -> trainer design point along the camera ray (flipped card) */
const tD = (P) => {
  const C = CUR, TR0 = TCUR, ax = axisOf(TR0), n = [-ax[2], 0, ax[0]];
  const d = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], den = d[0] * n[0] + d[2] * n[2] || 1e-6;
  const s = ((TR0[0] - C[0]) * n[0] + (TR0[2] - C[2]) * n[2]) / den, Q = [C[0] + d[0] * s, C[1] + d[1] * s, C[2] + d[2] * s];
  return [300 - ((Q[0] - TR0[0]) * ax[0] + (Q[2] - TR0[2]) * ax[2]) / (K * ST), 975 - (Q[1] - TR0[1]) / (K * ST)];
};

// ---------- reference points from the real rig (filled in by calibrate() once the GLB is loaded) ----------
const REF = {};
export const calibrate = (poseFn, root) => {
  root.position.set(...DOGPOS); root.rotation.set(0, DOGYAW, 0); root.updateMatrixWorld(true);
  const far = [3, 0.3, 0];
  REF.sit = poseFn({ w: { sit: 1 }, look: far });
  REF.down = poseFn({ w: { down: 1 }, look: far });
  REF.hip = poseFn({ w: { hip: 1 }, look: far });
  REF.side = poseFn({ w: { flop: 1 }, roll: -90, twist: twistFor(-90), look: [0.9, 0.3, -0.3] });
  REF.stand = poseFn({ w: { stand: 1 }, look: far });
  root.position.set(...DOGPOS);
};
const NOSE = (r) => REF[r].nose;
// lure waypoints for the hip-settled puppy (its LEFT side is up, world -z): the up shoulder, then back over the spine
let SHOULDER = [0.14, 0.24, -0.17], SPINE = [-0.04, 0.3, -0.07];
/** head roll vs body roll for r in [-360, 0]: the head leads, staying upright and flipping through belly-up fast */
const twistFor = (r) => { const u = Math.min(1, Math.abs(r) / 360); return 360 * (0.5 * u + 0.5 * M.smooth(ramp(u, 0.3, 0.7)) - u); };

// ---------- the puppy ----------
// hook: the puppy rolls toward its RIGHT (toward the camera, world +z), so it slides one body-width that way.
const HP0 = [-0.04, MAT, -0.12], HP1 = [-0.04, MAT, 0.12];
const rollT = (f) => M.inOut ? M.inOut(ramp(f, 10, 40)) : sm(ramp(f, 10, 40));
const hookPos = (f) => lerp3(HP0, HP1, rollT(f));
const shift = (P, pos) => [P[0] + pos[0] - DOGPOS[0], P[1], P[2] + pos[2] - DOGPOS[2]];
export const dog3At = (f) => {
  const S = shotAt(f);
  const base = { pos: DOGPOS, yaw: DOGYAW, w: { down: 1 }, roll: 0, blink: blinkAt(f, 8) ? 1 : 0, breath: 0.25 + 0.25 * Math.sin(f * 0.2), wag: 0.4 * Math.sin(f * 0.25), tail: 0.1, neck: 0.85 };
  const W = worldAt(f);
  switch (S.id) {
    case 'hook': {
      const r = -360 * rollT(f), ar = Math.abs(r);
      const hipB = f < 10 ? 0.45 + 0.55 * sm(ramp(f, 0, 9)) : 1, hip = hipB * Math.max(0, 1 - ar / 70);
      const down = f < 10 ? 1 - hipB : sm(ramp(f, 32, 42)), tuck = Math.max(0, 1 - hip - down);
      const chomp = f >= 44 && f < 58 ? Math.abs(Math.sin((f - 44) * 0.75)) : 0;
      // the head leads the roll: it stays upright longer and flips through belly-up ~3x faster than the body
      const twist = twistFor(r);
      return { ...base, pos: hookPos(f), roll: r, twist, w: { hip, tuck, down }, look: W.treat || add(shift(REF.down.nose, HP1), [0.5, 0.25, 0.05]), neck: 1,
        jaw: f >= 58 ? 0.35 : chomp, wag: f > 42 ? Math.sin(f * 0.7) * 1.2 : 0.3 * Math.sin(f * 0.4), tail: f > 42 ? 0.35 : 0.1, ears: f > 14 && f < 38 ? 0.6 : 0, blink: f > 44 && f < 50 ? 1 : base.blink };
    }
    case 'povLie': {
      const dn = sm(ramp(f, 92, 108));
      return { ...base, w: { sit: 1 - dn, down: dn }, look: W.treat, ears: -0.3, tail: 0.2 * (1 - dn) };
    }
    case 'overHip': {
      const h = M.back(ramp(f, 134, 158), 1.1);
      return { ...base, w: { down: 1 - clamp(h), hip: clamp(h) }, look: W.treat, neck: 1, ears: 0.2, wag: 0.25 * Math.sin(f * 0.15) };
    }
    case 'relax': {
      const lid = f > 190 && f < 252 ? 0.55 + 0.15 * Math.sin(f * 0.05) : blinkAt(f, 8) ? 1 : 0;
      return { ...base, w: { hip: 1 }, look: add(NOSE('hip'), [0.45, -0.12, 0.06 + 0.04 * Math.sin(f * 0.03)]), neck: 0.7, blink: lid, breath: 0.35 + 0.35 * Math.sin(f * 0.12), ears: 0.4, wag: 0.3 * Math.sin(f * 0.1) };
    }
    case 'povNose': {
      return { ...base, w: { hip: 1 }, look: W.treat, ears: -0.4 * sm(ramp(f, 270, 290)), neck: 1, wag: 0.6 * Math.sin(f * 0.4) };
    }
    case 'povShoulder': case 'overLow': {
      const tip = S.id === 'povShoulder' ? -22 * sm(ramp(f, 418, 448)) : -18 * Math.sin(Math.PI * ramp(f, 470, 492));
      return { ...base, w: { hip: 1 }, roll: tip, look: W.treat, neck: 1, ears: -0.2, wag: 0.4 * Math.sin(f * 0.3) };
    }
    case 'tooHigh': {
      const st = sm(ramp(f, 548, 572));
      return { ...base, w: { hip: 1 - st, stand: st }, look: W.treat, neck: 0.62 + 0.25 * st, ears: -0.3 * st, tail: 0.4 * st, wag: st > 0.5 ? Math.sin(f * 0.8) : 0.2 * Math.sin(f * 0.3),
        pos: lerp3(DOGPOS, [0.03, MAT, 0], st), blink: f >= 574 && f < 579 ? 1 : base.blink };
    }
    case 'povReward': {
      const sd = sm(ramp(f, 684, 708)), r = -90 * sd;
      const chomp = (t0) => (f >= t0 && f < t0 + 14 ? Math.abs(Math.sin((f - t0) * 0.75)) : 0);
      return { ...base, roll: r, twist: twistFor(r), w: { hip: 1 - sd, flop: sd }, look: W.treat || add(NOSE('hip'), [0.4, 0.1, 0]), neck: 1, jaw: Math.max(chomp(664), chomp(712)),
        wag: 0.7 * Math.sin(f * 0.5), tail: 0.2, ears: f > 664 && f < 676 ? 0.4 : 0, blink: (f > 664 && f < 668) || (f > 712 && f < 716) ? 1 : base.blink };
    }
    case 'choose': {
      const sh = sm(ramp(f, 748, 770)), r = -90 - 14 * sh;
      return { ...base, roll: r, twist: twistFor(r), w: { flop: 1 }, look: W.paw ? W.paw.pos : null, headTilt: 14 * Math.sin(Math.PI * ramp(f, 732, 756)) - 6 * sh, neck: 0.8,
        pedal: f > 750 && f < 770 ? (f - 750) * 0.35 : 0, wag: 0.3 * Math.sin(f * 0.2), ears: 0.2 };
    }
    case 'comfy': {
      return { ...base, roll: -100, twist: twistFor(-100), w: { flop: 1 }, look: W.paw ? W.paw.pos : null, neck: 0.8, wag: 1.1 * Math.sin(f * 0.9), tail: -0.1,
        blink: f > 800 && f < 812 ? 0.6 : base.blink, breath: 0.4 + 0.4 * Math.sin(f * 0.15), ears: 0.4 };
    }
    case 'arc': {
      const k = arcT(f), r = -100 - 260 * k;
      const tuck = sm(ramp(f, 866, 884)) * (1 - sm(ramp(f, 960, 984))), down = sm(ramp(f, 960, 984)), flop = Math.max(0, 1 - tuck - down);
      return { ...base, pos: lerp3(DOGPOS, FIN, k), roll: r, twist: twistFor(r), w: { flop, tuck, down }, look: W.treat, neck: 1,
        ears: k > 0.1 && k < 0.85 ? 0.6 : 0, wag: f > 984 ? Math.sin(f * 0.8) * 1.2 : 0.2 * Math.sin(f * 0.4), tail: f > 984 ? 0.35 : 0 };
    }
    case 'yes': {
      return { ...base, pos: FIN, w: { down: 1 }, look: [TRN2[0] + 0.05, 0.95, TRN2[2]], neck: 1, wag: Math.sin(f * 0.9) * 1.3, tail: 0.4, ears: f > 1022 && f < 1032 ? -0.5 : 0,
        jaw: f > 1004 && f < 1020 ? 0.5 : 0.2 };
    }
    case 'povFinal': {
      const chomp = f >= 1047 && f < 1063 ? Math.abs(Math.sin((f - 1047) * 0.75)) : f >= 1063 ? 0.35 : 0;
      return { ...base, pos: FIN, w: { down: 1 }, look: W.treat || add(shift(NOSE('down'), FIN), [0.5, 0.35, 0]), neck: 1, jaw: chomp, wag: Math.sin(f * 0.9) * 1.3, tail: 0.4,
        blink: f > 1048 && f < 1056 ? 1 : base.blink };
    }
  }
  return base;
};

// ---------- 3D props: hand / paw pointer + biscuit + trail + rings ----------
const treatPath = (f) => {
  const S = shotAt(f);
  switch (S.id) {
    case 'hook': {
      if (f > 52) return null;
      const A = add(shift(REF.hip.nose, HP0), [0.07, 0.01, 0.0]), B = [0.16, 0.28, -0.24], C = [0.34, 0.44, -0.06], D = [0.5, 0.32, 0.12], E = add(shift(REF.down.nose, HP1), [0.07, 0.0, 0.0]);
      return f >= 40 ? E : spline([A, B, C, D, E], f < 10 ? 0.25 * sm(ramp(f, 0, 10)) : 0.25 + 0.75 * rollT(f + 2.5));
    }
    case 'povLie': return KF(f, [[67, add(NOSE('sit'), [0.12, 0.04, 0.02])], [80, add(NOSE('sit'), [0.06, 0.0, 0])], [104, [0.47, MAT + 0.04, 0.0]], [110, [0.5, MAT + 0.045, 0.0]]]);
    case 'overHip': return KF(f, [[111, add(NOSE('down'), [0.06, 0.0, 0.0])], [124, add(NOSE('down'), [0.05, 0.0, 0.0])], [150, [0.2, MAT + 0.12, -0.15]], [176, [0.19, MAT + 0.12, -0.16]]]);
    case 'povNose': {
      const n = add(NOSE('hip'), [0.06, -0.005, 0.0]), wig = f > 322 && f < 348 ? Math.sin((f - 322) / 26 * Math.PI * 2) * Math.sin(Math.PI * ramp(f, 322, 348)) : 0;
      return add(KF(f, [[261, [0.72, 0.46, 0.34]], [294, n]]), [0, 0.02 * Math.abs(wig), 0.07 * wig]);
    }
    case 'povShoulder': return KF(f, [[353, add(NOSE('hip'), [0.06, -0.005, 0.0])], [362, add(NOSE('hip'), [0.06, -0.005, 0.0])], [398, SHOULDER], [410, SHOULDER], [442, SPINE], [452, SPINE]]);
    case 'overLow': return KF(f, [[453, add(NOSE('hip'), [0.06, -0.005, 0.0])], [458, add(NOSE('hip'), [0.06, -0.005, 0.0])], [472, SHOULDER], [490, SPINE], [495, SPINE]]);
    case 'tooHigh': return KF(f, [[496, add(NOSE('hip'), [0.06, -0.005, 0.0])], [506, add(NOSE('hip'), [0.06, -0.005, 0.0])], [520, [0.26, 0.46, -0.14]], [534, [0.3, 0.66, -0.12]], [595, [0.32, 0.68, -0.1]]]);
    case 'povReward': {
      const n = add(NOSE('hip'), [0.06, -0.005, 0.0]), m = add(NOSE('hip'), [0.01, -0.01, 0.0]), sideN = add(NOSE('side'), [0.05, 0.0, 0.0]);
      if (f < 664) return KF(f, [[596, n], [638, n], [658, SHOULDER], [664, SHOULDER]]);
      if (f < 674) return SHOULDER;                                 // held at the mouth while it's eaten
      if (f < 680) return null;
      if (f < 712) return KF(f, [[680, n], [690, n], [706, add(SPINE, [0.08, 0.0, 0.02])], [712, sideN]]);
      return null;
    }
    case 'choose': case 'comfy': return null;
    case 'arc': {
      const P0 = add(NOSE('side'), [0.06, 0.02, 0.0]), P3 = add(shift(NOSE('down'), FIN), [0.07, 0.0, 0.0]);
      return f < 866 ? P0 : f >= 986 ? P3 : spline([P0, [0.4, 0.34, -0.12], [0.48, 0.5, 0.06], [0.52, 0.36, 0.22], P3], M.smooth(ramp(f, 866, 986)) * 0.97 + 0.03 * ramp(f, 866, 986));
    }
    case 'povFinal': return f < 1062 ? KF(f, [[1041, add(shift(NOSE('down'), FIN), [0.3, 0.12, 0.05])], [1047, add(shift(NOSE('down'), FIN), [0.0, -0.01, 0.0])]]) : null;
  }
  return null;
};
const arcT = (f) => M.smooth(ramp(f, 862, 986));
const HANDSHOTS = ['povLie', 'povNose', 'povShoulder', 'povReward', 'povFinal'];
const PAWSHOTS = { overHip: '#ff8fb0', overLow: '#6fe08a', tooHigh: '#ff5a5a', arc: '#ffd84a', choose: '#ff8fb0', comfy: '#ff8fb0' };
const TRAIL_FROM = { hook: 0, povLie: 80, overHip: 124, povNose: 266, povShoulder: 362, overLow: 458, tooHigh: 506, povReward: 638, arc: 866 };
export const worldAt = (f) => {
  const S = shotAt(f), W = {};
  const t = treatPath(f);
  if (t) W.treat = t;
  let from = TRAIL_FROM[S.id];
  if (S.id === 'povReward' && f >= 680) from = 690;
  if (W.treatHide) from = undefined;
  if (t && from !== undefined && f > from) {
    const pts = []; let last = null;
    for (let g = from; g <= Math.min(f, S.id === 'hook' ? 42 : f); g += 0.5) { const p = treatPath(g); if (!p) break; if (!last || Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) > 0.03) { pts.push(p); last = p; } }
    W.trail = pts.slice(0, -1);
  }
  if (t && HANDSHOTS.includes(S.id)) W.hand = { treat: t };
  if ((S.id === 'povReward' && f >= 664 && f < 680) || (S.id === 'povFinal' && f >= 1049)) W.treatHide = true;  // eaten, hand lingers
  if (PAWSHOTS[S.id]) {
    W.trailCol = PAWSHOTS[S.id];
    if (t) W.paw = { pos: t, s: S.id === 'arc' ? 1.15 : 0.95 };
    else { // waiting paw: hovers patiently near the nose of the side-lying puppy
      const n = NOSE('side'); W.paw = { pos: [n[0] + 0.16, n[1] + 0.1 + 0.015 * Math.sin(f * 0.12), n[2] - 0.08], s: 0.85 };
    }
  }
  if (S.id === 'overHip' && f >= 140) {
    const hip = REF.hip.hip, gp = [hip[0], MAT + 0.006, hip[2] + 0.04];
    W.rings = [0, 1].map((i) => { const u = ((f - 140) / 26 + i * 0.5) % 1; return { p: gp, r: 0.1 + 0.2 * u, a: (1 - u) * 0.9 }; });
  }
  return W;
};

// ---------- the 2D trainer (hook only) ----------
const talkAt = (f) => clamp((VENV[f] || 0) * 1.25);
const trainerYes = (f) => {
  const hi = idle(f, 3), clickOn = f >= 1024 && f < 1029;
  return { kneel: 1, expr: f >= 1003 && f < 1020 ? 'yes' : f >= 1020 ? 'proud' : 'grin', talk: talkAt(f) * 0.6, blink: blinkAt(f, 3), look: -0.3, headTilt: hi.headTilt + 4,
    near: { to: [318, 690 - 40 * sm(ramp(f, 1014, 1022))], hand: 'clicker', bend: -1 }, click: clickOn ? 1 : 0, far: f >= 1003 ? 'thumb' : 'present', lean: 6 };
};
const trainerAt = (f) => {
  const hi = idle(f, 3), W = worldAt(f);
  const o = { hose: true, kneel: 1, expr: f > 30 ? 'grin' : 'smile', talk: talkAt(f) * 0.9, blink: blinkAt(f, 3), look: f > 40 ? -0.2 : 0.8, headTilt: hi.headTilt, near: f > 44 ? 'thumb' : { to: [270, 806], hand: 'fist', bend: -1 } };
  if (W.treat) {
    const T = tD(W.treat), S = trainerShoulder(o, 'far'), ang = Math.atan2(T[1] - S[1], T[0] - S[0]);
    const kind = f >= 30 ? 'give' : 'treat', off = kind === 'give' ? [19, -12] : [25, -3], s = 2.08 * 1.05, sy = Math.cos(ang) < 0 ? -1 : 1;
    const Wr = [T[0] - (Math.cos(ang) * off[0] * s - Math.sin(ang) * off[1] * sy * s), T[1] - (Math.sin(ang) * off[0] * s + Math.cos(ang) * off[1] * sy * s)];
    o.far = { to: Wr, hand: kind, bend: 1, rot: ang * 180 / Math.PI }; o.lean = 10;
  } else o.far = 'present';
  return o;
};

// ---------- cameras ----------
const CAMS = {
  hook: [{ f: 0, pos: [-0.02, 0.8, 1.95], look: [0.04, 0.46, -0.25], fov: 42 }, { f: 66, pos: [0.02, 0.76, 1.8], look: [0.06, 0.46, -0.25], fov: 42 }],
  // POV = the trainer's eyes, kneeling in front of the puppy, looking down
  povLie: [{ f: 67, pos: [1.0, 1.08, 0.06], look: [0.28, 0.2, 0.0], fov: 48 }, { f: 110, pos: [0.98, 1.02, 0.08], look: [0.3, 0.12, 0.0], fov: 47 }],
  overHip: [{ f: 111, pos: [-0.12, 1.85, 0.02], look: [0.14, 0.1, 0.0], fov: 42 }, { f: 176, pos: [-0.2, 1.3, 0.0], look: [0.04, 0.1, -0.04], fov: 42 }],
  relax: [{ f: 177, pos: [1.25, 0.42, 0.95], look: [0.14, 0.2, 0.0], fov: 38 }, { f: 260, pos: [-0.1, 0.46, 1.55], look: [0.08, 0.2, 0.0], fov: 38, path: [[0.75, 0.44, 1.4]] }],
  povNose: [{ f: 261, pos: [0.95, 0.98, 0.5], look: [0.28, 0.16, 0.02], fov: 48 }, { f: 352, pos: [0.82, 0.8, 0.42], look: [0.3, 0.2, 0.02], fov: 42 }],
  // POV from the puppy's front-LEFT (its up side): the shoulder and spine are on our side
  povShoulder: [{ f: 353, pos: [0.78, 1.25, -0.5], look: [0.06, 0.1, -0.08], fov: 50 }, { f: 452, pos: [0.7, 1.28, -0.55], look: [0.02, 0.1, -0.08], fov: 48 }],
  overLow: [{ f: 453, pos: [0.5, 1.45, -0.75], look: [0.08, 0.14, -0.06], fov: 44 }, { f: 495, pos: [0.42, 1.3, -0.7], look: [0.06, 0.15, -0.06], fov: 44 }],
  tooHigh: [{ f: 496, pos: [0.7, 0.5, -1.25], look: [0.1, 0.32, -0.05], fov: 44 }, { f: 595, pos: [0.62, 0.62, -1.4], look: [0.1, 0.4, -0.05], fov: 44 }],
  povReward: [{ f: 596, pos: [0.85, 1.22, -0.5], look: [0.1, 0.1, -0.08], fov: 50 }, { f: 727, pos: [0.78, 1.2, -0.55], look: [0.08, 0.08, -0.1], fov: 48 }],
  choose: [{ f: 728, pos: [1.35, 0.62, -0.95], look: [0.3, 0.16, -0.06], fov: 40 }, { f: 784, pos: [1.22, 0.56, -0.88], look: [0.32, 0.16, -0.06], fov: 38 }],
  comfy: [{ f: 785, pos: [-0.1, 1.2, -0.95], look: [0.02, 0.1, -0.05], fov: 42 }, { f: 839, pos: [0.0, 1.12, -0.9], look: [0.04, 0.1, -0.05], fov: 42 }],
  arc: [{ f: 840, pos: [0.3, 1.55, -1.25], look: [0.24, 0.2, 0.04], fov: 46 }, { f: 994, pos: [1.25, 1.15, -0.85], look: [0.26, 0.2, 0.14], fov: 46, path: [[0.85, 1.4, -1.2]] }],
  yes: [{ f: 995, pos: [0.12, 0.82, 2.2], look: [0.16, 0.5, -0.1], fov: 42 }, { f: 1040, pos: [0.16, 0.78, 2.0], look: [0.18, 0.52, -0.1], fov: 42 }],
  povFinal: [{ f: 1041, pos: [1.1, 1.15, 0.72], look: [0.24, 0.2, 0.2], fov: 50 }, { f: 1072, pos: [1.0, 1.05, 0.68], look: [0.26, 0.24, 0.2], fov: 48 }],
};
export const camAt = (f) => {
  const S = shotAt(f), c = camFromKeys(CAMS[S.id], f, {});
  if (S.id.startsWith('pov')) { c.pos = add(c.pos, [0.006 * Math.sin(f * 0.11), 0.005 * Math.sin(f * 0.07 + 1), 0.006 * Math.sin(f * 0.09 + 2)]); c.roll = (c.roll || 0) + 1.2 * Math.sin(f * 0.05); }
  c.shadowAt = [0.1, 0.2, 0];
  return c;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const dofAt = (f) => {
  const S = shotAt(f), C = camAt(f), head = REF.down ? REF.down.head : [0.3, 0.3, 0];
  if (S.id === 'hook') return { focus: dist(C.pos, [0.3, 0.3, -0.1]), cinf: 6 };
  if (S.id === 'relax') return { focus: dist(C.pos, [0.1, 0.25, 0]), cinf: 9 };
  if (S.id === 'overHip') return { focus: dist(C.pos, [-0.1, 0.15, 0]), cinf: 4 };
  if (S.id === 'yes') return { focus: dist(C.pos, [0.3, 0.4, -0.2]), cinf: 6 };
  if (S.id === 'arc' || S.id === 'comfy' || S.id === 'overLow') return { focus: dist(C.pos, [0.1, 0.15, 0.05]), cinf: 4 };
  if (S.id === 'tooHigh') return { focus: dist(C.pos, [0.1, 0.3, 0]), cinf: 6 };
  if (S.id === 'choose') return { focus: dist(C.pos, REF.side.head), cinf: 9 };
  if (S.id === 'povFinal') return { focus: dist(C.pos, shift(head, FIN)), cinf: 6 };
  return { focus: dist(C.pos, head), cinf: 6 };
};

// ---------- 2D actors + effects ----------
const roundAll = (o) => { const r = {}; for (const k in o) { const v = o[k]; r[k] = typeof v === 'number' ? q(v, 2) : Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? Math.round(x) : x)) : v && typeof v === 'object' ? roundAll(v) : v; } return r; };
export const actorsAt = (f, T) => {
  CUR = camAt(f).pos;
  const S = shotAt(f), out = [];
  if (S.id === 'yes') { TCUR = TRN2; const tO = roundAll({ ...trainerYes(f), mirror: true }); out.push({ key: 'tr' + JSON.stringify(tO), draw: (p) => T.trainerDraw(p, tO), x: TRN2[0], y: TRN2[1], z: TRN2[2], s: ST, flip: true, order: 1, ground: MAT, blobW: 0.8 }); }
  if (S.id === 'hook') { TCUR = TRN; const tO = roundAll({ ...trainerAt(f), mirror: true }); out.push({ key: 'tr' + JSON.stringify(tO), draw: (p) => T.trainerDraw(p, tO), x: TRN[0], y: TRN[1], z: TRN[2], s: ST, flip: true, order: 1, ground: MAT, blobW: 0.8 }); }
  return out;
};
const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 6, ...extra });
export const fxAt = (f, T) => {
  CUR = camAt(f).pos;
  const out = [];
  // check badge on "foundation"
  if (f >= 215 && f < 258) { const k = q(M.back(ramp(f, 215, 224)) * (1 - sm(ramp(f, 252, 258))), 2); if (k > 0.02) out.push(FX('ok' + k, (p) => T.fxCheck(p, 1), [0.1, 0.36, 0.15], 0.17 * k, { roll: q(0.06 * Math.sin(f * 0.2), 2) })); }
  const S = shotAt(f);
  const pop = (a, b) => q(M.back(ramp(f, a, a + 9)) * (1 - sm(ramp(f, b - 6, b))), 2);
  // "low and close" check / "too high" cross
  if (S.id === 'overLow' && f >= 474) { const k = pop(474, 496); if (k > 0.02) out.push(FX('ok' + k, (p) => T.fxCheck(p, 1), [0.3, 0.42, -0.2], 0.15 * k)); }
  if (S.id === 'tooHigh' && f >= 572) { const k = pop(572, 596); if (k > 0.02) out.push(FX('no' + k, (p) => T.fxCross(p, 1), [0.1, 0.5, -0.3], 0.18 * k, { roll: q(0.08 * Math.sin(f * 0.5), 2) })); }
  // rewards: hearts + sparkles pop off the puppy's head
  const hearts = (t0, at, n = 3, sc = 0.06) => { for (let i = 0; i < n; i++) { const a = t0 + i * 4, k = ramp(f, a, a + 24); if (k > 0 && k < 1) out.push(FX('ht', (p) => T.fxHeart2(p), [at[0] + (i - 1) * 0.07, at[1] + 0.06 + k * 0.3, at[2]], sc * M.back(ramp(f, a, a + 7)), { alpha: q(1 - k * k, 2) })); } };
  if (S.id === 'povReward') { hearts(665, add(NOSE('hip'), [-0.05, 0.05, 0])); hearts(713, add(NOSE('side'), [-0.05, 0.05, 0])); }
  if (S.id === 'comfy' && f >= 818) { const k = pop(818, 840); if (k > 0.02) out.push(FX('ok' + k, (p) => T.fxCheck(p, 1), [0.1, 0.42, -0.25], 0.16 * k)); }
  if (S.id === 'arc' && f >= 984) { const k = ramp(f, 984, 994); out.push(FX('sp' + q(k, 1), (p) => T.fxSpark2(p, 1), add(shift(NOSE('down'), FIN), [-0.05, 0.12, 0]), 0.14 * M.back(k))); }
  if (S.id === 'yes' && f >= 1024) { const k = q(ramp(f, 1024, 1040), 2); out.push(FX('ck' + k, (p) => T.fxClick(p, k), [TRN2[0] + 0.02, 0.62, TRN2[2] + 0.12], 0.26)); }
  if (S.id === 'povFinal') {
    hearts(1048, add(shift(NOSE('down'), FIN), [-0.05, 0.08, 0]), 4, 0.06);
    if (f >= 1046) for (let i = 0; i < 3; i++) { const t = q(ramp(f, 1046 + i * 3, 1072), 2); out.push(FX('cf' + i + t, (p) => T.fxConfetti(p, t, i + 1), add(shift(NOSE('down'), FIN), [0.05, 0.05, -0.2 + i * 0.2]), 0.4, { order: 7 })); }
  }
  // chomp hearts in the hook
  if (S.id === 'hook') for (let i = 0; i < 3; i++) { const t0 = 34 + i * 5, k = ramp(f, t0, t0 + 26); if (k > 0 && k < 1) out.push(FX('ht', (p) => T.fxHeart2(p), [0.42 + i * 0.08, 0.42 + k * 0.4, 0.05], 0.07 * M.back(ramp(f, t0, t0 + 8)), { alpha: q(1 - k * k, 2) })); }
  return out;
};

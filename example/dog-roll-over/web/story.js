// "Teach Your Dog to Roll Over" — timed to voice.mp3 (35.76 s), 30 fps, 1073 frames.
// Word frames (faster-whisper): Let's 0 teach 8 dog 20 roll 35 over 41-54 | Ask 67 dog 76 lie 90 down 94-103 | then 112 settle 130
// onto 137 one 147 hip 154-161 | A 184 relaxed 185 down 193 foundation 217 trick 240-247 | Hold 262 treat 269 right 274 nose 308-314
// like 325 magnet 334-342 | Slowly 354 move 361 shoulder 389-400 back 413 toward 420 spine 433-442 | Keep 456 low 463 close 474-481 |
// Because 497 drifts 509 too 518 high 523-532 | dog 546 stand 565 up 573-580 | At 596 first 599 reward 611 little 622 things 628-635 |
// head 651 turn 656-663 | settling 679 side 703-713 | Let 728 choose 743 each 752 movement 762-773 | Once 785 comfortable 799 side 822-833 |
// keep 840 treat 851 moving 856 smooth 874 arc 882-889 follow 901 all 916 way 922 across 926-934 |
// The 955 moment 958 finish 970 roll 985-989 | say 1000 yes 1007-1016 | click 1024-1031 | then 1041 reward 1046-1052 | end 1072.
import { M, camFromKeys, idle, blinkAt, q, clamp, lerp, lerp3, ramp, spline } from './motion.js';
import { dogRig, dogProject, trainerShoulder } from './toon.js';
import { VENV } from './voiceenv.js';
export const FPS = 30, TOTAL = 1073, DECK = 0;
export const SHOTS = [
  { id: 'hook', a: 0, b: 66, light: 'day' },
  { id: 'lie', a: 67, b: 176, light: 'day' },
  { id: 'relax', a: 177, b: 260, light: 'day' },
  { id: 'nose', a: 261, b: 352, light: 'day' },
  { id: 'shoulder', a: 353, b: 455, light: 'day' },
  { id: 'low', a: 456, b: 490, light: 'day' },
  { id: 'high', a: 491, b: 590, light: 'day' },
  { id: 'reward', a: 591, b: 645, light: 'day' },
  { id: 'little', a: 646, b: 725, light: 'day' },
  { id: 'choose', a: 726, b: 785, light: 'day' },
  { id: 'comfy', a: 786, b: 838, light: 'day' },
  { id: 'arc', a: 839, b: 945, light: 'day' },
  { id: 'finish', a: 946, b: 1043, light: 'day' },
  { id: 'party', a: 1044, b: 1072, light: 'golden' },
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];
const sm = M.smooth;
/** keyframes [[f, v], ...] for numbers or arrays, smootherstep between keys */
const KF = (f, keys, ease = sm) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [fa, va] = keys[i], [fb, vb] = keys[i + 1];
    if (f <= fb) { const t = (keys[i + 1][2] || ease)((f - fa) / (fb - fa)); return Array.isArray(va) ? va.map((v, k) => lerp(v, vb[k], t)) : lerp(va, vb, t); }
  }
  return keys[keys.length - 1][1];
};

// ---------- lights ----------
export const LIGHTS = {
  day: { az: 135, el: 48, sky: '#c4d6f2', ground: '#8a8262', hemi: 1.15, sun: '#fff1dc', sunI: 2.5, fog: '#cadcf0', fogNear: 60, fogFar: 700,
    skyTop: '#3f80d4', skyHor: '#c3daf2', sat: 1.1, vig: 0.2, shadowExt: 5 },
  golden: { az: 150, el: 30, sky: '#c8b8d8', ground: '#a08a60', hemi: 1.35, sun: '#ffc888', sunI: 2.6, fog: '#f2c094', fogNear: 50, fogFar: 600,
    skyTop: '#6f78c0', skyHor: '#ffc887', sunDisc: '#fff0c8', sunSize: 0.003, sat: 1.14, gain: '#fff2e4', vig: 0.24, shadowExt: 6 },
};
export const lightFor = (S) => ({ ...LIGHTS[S.light] });

// ---------- staging ----------
// The dog lies on the mat facing +x; the trainer kneels BEHIND it (further from camera), facing the same way, and reaches
// down over its back. Both cards turn to face the camera, so design <-> world conversions use each card's own axis and
// the trainer's hand target is found by casting the camera ray through the treat onto the trainer's card plane.
const K = 0.00225, SD = 1.1, ST = 1.08, MAT = 0.064;
const DOG = [-0.15, MAT - (975 - 962) * K * SD, 0];
const TRN = [0.16, MAT, -0.42];
let CUR = [0, 1, 3];                       // current camera position (set per frame)
const axisOf = (pos) => { const ry = Math.atan2(CUR[0] - pos[0], CUR[2] - pos[2]); return [Math.cos(ry), 0, -Math.sin(ry)]; };
const dW = ([x, y]) => { const ax = axisOf(DOG), o = (x - 300) * K * SD; return [DOG[0] + ax[0] * o, DOG[1] + (975 - y) * K * SD, DOG[2] + ax[2] * o]; };
const tD = (P) => { // world point -> trainer design point (along the camera ray)
  const C = CUR, ax = axisOf(TRN), n = [-ax[2], 0, ax[0]];
  const d = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], den = d[0] * n[0] + d[2] * n[2] || 1e-6;
  const s = ((TRN[0] - C[0]) * n[0] + (TRN[2] - C[2]) * n[2]) / den, Q = [C[0] + d[0] * s, C[1] + d[1] * s, C[2] + d[2] * s];
  return [300 + ((Q[0] - TRN[0]) * ax[0] + (Q[2] - TRN[2]) * ax[2]) / (K * ST), 975 - (Q[1] - TRN[1]) / (K * ST)];
};
const d3W = (p3) => dW(dogProject(p3));

// ---------- dog poses + treat waypoints (dog space) ----------
const DOWN = { down: 1 }, FLOP = { flop: 1 }, STAND = { stand: 1 }, SIT = { sit: 1 };
const mixW = (a, b, t) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = (a[k] || 0) * (1 - t) + (b[k] || 0) * t; return o; };
const HIP = 62;
const base = dogRig({ legsF: DOWN, legsR: DOWN, rollR: HIP, look: [600, 110, 20] });
const NOSE = [base.nose[0] + 26, base.nose[1] + 2, base.nose[2] + 8];
const SHOULDER = base.X([88, 84, 48]);
const SPINE = base.X([40, 100, 22]);
const SPINE2 = base.X([-14, 92, 30]);
const HIGH = [110, 330, 30];
// the big arc (dog lying on its side): near side over the top to the far side
const ARC = [[150, 150, 95], [110, 215, 40], [80, 215, -40], [90, 150, -110], [120, 105, -130]];

// ---------- dog timeline ----------
const roll = (f, keys) => KF(f, keys);
const dogAt = (f) => {
  const S = shotAt(f);
  let o = { legsF: DOWN, legsR: DOWN, rollF: 0, rollR: HIP, eyes: 'dot', mouth: 'smile', blink: blinkAt(f, 8), wag: 0.25 * Math.sin(f * 0.18), tail: 0.15 };
  let treat = null, hand = 'treat', look = [520, 120, 120];
  switch (S.id) {
    case 'hook': {
      const w = sm(ramp(f, 4, 24));
      o = { ...o, rollF: KF(f, [[0, 182], [20, 360]]), rollR: KF(f, [[0, 170], [26, 360]]), legsF: mixW(FLOP, DOWN, w), legsR: mixW(FLOP, DOWN, sm(ramp(f, 8, 28))), mouth: f > 26 ? 'pant' : 'smile', eyes: f > 26 ? 'happy' : 'dot', wag: Math.sin(f * 0.6) * 0.8, tail: 0.3 };
      treat = KF(f, [[0, [100, 170, -90]], [18, [240, 150, 30]], [30, [NOSE[0] - 6, NOSE[1] - 4, NOSE[2]]]]);
      if (f >= 30) { hand = 'give'; treat = KF(f, [[30, [NOSE[0] - 6, NOSE[1] - 4, NOSE[2]]], [40, [NOSE[0] + 30, NOSE[1] + 10, 40]], [66, [NOSE[0] + 60, NOSE[1] + 40, 60]]]); look = [500, 260, 200]; o.mouth = f < 46 ? 'chew' : 'pant'; o.chew = (f % 8) / 8; }
      break;
    }
    case 'lie': {
      const down = sm(ramp(f, 93, 110)), hip = M.back(ramp(f, 134, 158), 1.2);
      o = { ...o, legsF: mixW(SIT, DOWN, down), legsR: mixW(SIT, DOWN, down), rollR: HIP * hip, rollF: 0, eyes: f > 150 ? 'half' : 'dot', tail: 0.4 * (1 - down) + 0.15 };
      if (f < 112) { look = KF(f, [[67, [420, 330, 120]], [86, [430, 360, 80]], [100, [430, 170, 60]], [111, [520, 120, 120]]]); }
      else look = [560, 110, 120];
      o.wag = 0.35 * Math.sin(f * 0.25);
      treat = null; hand = null;
      break;
    }
    case 'relax': {
      o = { ...o, eyes: f > 186 && f < 252 ? 'half' : 'dot', headDrop: 10 * sm(ramp(f, 180, 200)), mouth: 'smile', wag: 0.3 * Math.sin(f * 0.12) };
      look = [560, 70, 150]; treat = null; hand = null;
      break;
    }
    case 'nose': {
      const wig = f >= 326 ? Math.sin((f - 326) * 0.32) * sm(ramp(f, 326, 334)) : 0;
      treat = KF(f, [[261, [520, 260, 160]], [304, NOSE]]);
      treat = [treat[0] + wig * 8, treat[1] + wig * 14, treat[2] + wig * 16];
      o = { ...o, eyes: f > 296 ? 'wide' : 'dot', ears: -0.4 * sm(ramp(f, 290, 306)), mouth: 'closed', wag: 0.5 * Math.sin(f * 0.3) };
      look = treat;
      break;
    }
    case 'shoulder': {
      treat = KF(f, [[353, NOSE], [361, NOSE], [400, SHOULDER], [412, SHOULDER], [445, SPINE]]);
      o = { ...o, rollF: KF(f, [[400, 0], [445, 22]]), rollR: KF(f, [[400, HIP], [445, HIP + 10]]), eyes: 'dot', ears: -0.2, mouth: 'closed', neck: 0.9 };
      look = treat;
      break;
    }
    case 'low': {
      treat = KF(f, [[456, SPINE], [490, SPINE2]]);
      o = { ...o, rollF: KF(f, [[456, 22], [490, 34]]), rollR: HIP + 10 + 6 * ramp(f, 456, 490), eyes: 'dot', mouth: 'closed', neck: 0.9 };
      look = treat;
      break;
    }
    case 'high': {
      treat = KF(f, [[491, SPINE2], [504, SPINE2], [536, HIGH], [590, [HIGH[0] + 10, HIGH[1] + 10, HIGH[2]]]]);
      const up = sm(ramp(f, 556, 574));
      o = { ...o, rollF: KF(f, [[504, 34], [526, 0]]), rollR: KF(f, [[510, HIP + 16], [548, 0]]), legsF: mixW(DOWN, STAND, up), legsR: mixW(DOWN, STAND, up),
        eyes: f > 520 ? 'wide' : 'dot', ears: -0.5, mouth: f > 576 ? 'pant' : 'closed', neck: 0.95, wag: f > 570 ? Math.sin(f * 0.7) * 0.9 : 0, tail: f > 560 ? 0.8 : 0.15 };
      look = treat;
      break;
    }
    case 'reward': {
      hand = 'give';
      treat = KF(f, [[591, [NOSE[0] + 120, NOSE[1] - 20, 120]], [610, [NOSE[0] - 4, NOSE[1] - 10, NOSE[2] + 4]], [618, [NOSE[0] + 20, NOSE[1] - 6, NOSE[2] + 10]], [645, [NOSE[0] + 90, NOSE[1] + 10, 90]]]);
      o = { ...o, mouth: f >= 611 && f < 640 ? 'chew' : 'smile', chew: ((f - 611) % 7) / 7, eyes: f >= 611 ? 'happy' : 'dot', wag: Math.sin(f * 0.5) * 0.7 };
      look = f < 611 ? treat : [600, 160, 140];
      break;
    }
    case 'little': {
      treat = KF(f, [[646, NOSE], [649, NOSE], [662, SHOULDER], [676, SHOULDER], [700, SPINE], [725, [70, 150, 90]]]);
      const side = sm(ramp(f, 680, 712));
      o = { ...o, rollF: KF(f, [[680, 0], [712, 90]]), rollR: KF(f, [[684, HIP], [714, 90]]), legsF: mixW(DOWN, FLOP, side), legsR: mixW(DOWN, FLOP, sm(ramp(f, 684, 714))),
        eyes: f > 664 && f < 672 ? 'happy' : 'dot', mouth: 'closed', neck: 0.9 };
      look = treat;
      break;
    }
    case 'choose': {
      treat = [150 + 4 * Math.sin(f * 0.05), 160, 100];
      const tilt = Math.sin(ramp(f, 738, 758) * Math.PI) * 20, own = sm(ramp(f, 758, 780));
      o = { ...o, legsF: FLOP, legsR: FLOP, rollF: 90 + 14 * own, rollR: 90 + 8 * own, headTilt: tilt, ears: f > 740 ? -0.6 : -0.2, eyes: 'dot', mouth: f > 768 ? 'smile' : 'closed', neck: 0.9 };
      look = [treat[0], treat[1] - 10 * own, treat[2]];
      break;
    }
    case 'comfy': {
      treat = [150, 165, 100];
      o = { ...o, legsF: FLOP, legsR: FLOP, rollF: 102, rollR: 96, eyes: f > 796 && f < 830 ? 'happy' : 'dot', mouth: 'smile', wag: 0.5 * Math.sin(f * 0.5), neck: 0.8 };
      look = treat;
      break;
    }
    case 'arc': {
      const u = sm(ramp(f, 852, 934));
      treat = f < 852 ? KF(f, [[839, [150, 165, 100]], [852, ARC[0]]]) : spline(ARC, u);
      const ul = sm(ramp(f, 858, 940)), ur = sm(ramp(f, 864, 944));
      o = { ...o, legsF: FLOP, legsR: FLOP, rollF: 102 + 168 * ul, rollR: 96 + 172 * ur, eyes: 'dot', ears: -0.3, mouth: 'closed', neck: 0.95, pedal: f * 0.35 };
      look = treat;
      break;
    }
    case 'finish': case 'party': {
      const fin = sm(ramp(f, 952, 986)), lg = sm(ramp(f, 956, 990));
      const end = [ARC[4][0] + 60, ARC[4][1] + 10, ARC[4][2] + 40];
      treat = KF(f, [[946, ARC[4]], [990, end], [1030, [NOSE[0] + 40, NOSE[1] + 30, 60]]]);
      if (f >= 1030) { hand = 'give'; treat = KF(f, [[1030, [NOSE[0] + 40, NOSE[1] + 30, 60]], [1046, [NOSE[0] - 4, NOSE[1] - 10, NOSE[2] + 4]], [1056, [NOSE[0] + 30, NOSE[1], 40]], [1072, [NOSE[0] + 80, NOSE[1] + 30, 90]]]); }
      o = { ...o, legsF: mixW(FLOP, DOWN, fin), legsR: mixW(FLOP, DOWN, lg), rollF: 270 + 90 * fin, rollR: 268 + 92 * lg, rollFix: true,
        eyes: f >= 1000 ? 'happy' : 'dot', mouth: f >= 1046 && f < 1066 ? 'chew' : f >= 1000 ? 'pant' : 'closed', chew: ((f - 1046) % 7) / 7, wag: f > 990 ? Math.sin(f * 0.75) * 0.9 : 0, tail: f > 990 ? 0.35 : 0.15 };
      look = f < 1046 ? treat : [600, 200, 160];
      break;
    }
  }
  o.look = look;
  return { o, treat, hand };
};

// ---------- trainer ----------
const UA = 55, FA = 51; // in head units (trainer U = 2.08)
const TU = 2.08, REACH = (UA + FA) * TU * 0.96;
/** pose the far (treat) arm so the biscuit sits exactly at treatTr (trainer design); returns opts patch */
const reachFor = (o, target, handKind) => {
  let lean = o.lean || 0;
  const off = handKind === 'give' ? [19, -12] : [25, -3];
  let W, ang;
  for (let it = 0; it < 24; it++) {
    const S = trainerShoulder({ ...o, lean }, 'far');
    ang = Math.atan2(target[1] - S[1], target[0] - S[0]);
    if (handKind === 'give') ang = Math.max(-0.5, Math.min(0.5, ang)); // palm stays roughly flat
    const sy = Math.cos(ang) < 0 ? -1 : 1, s = TU * 0.98;
    W = [target[0] - (Math.cos(ang) * off[0] * s - Math.sin(ang) * off[1] * sy * s), target[1] - (Math.sin(ang) * off[0] * s + Math.cos(ang) * off[1] * sy * s)];
    if (Math.hypot(W[0] - S[0], W[1] - S[1]) <= REACH || lean >= 42) break;
    lean += 2;
  }
  return { lean, far: { to: W, hand: handKind, bend: 1, rot: ang * 180 / Math.PI - lean } };
};
const talkAt = (f) => clamp((VENV[f] || 0) * 1.25);
const trainerAt = (f, D) => {
  const S = shotAt(f), hi = idle(f, 3);
  let o = { kneel: 1, expr: 'smile', talk: talkAt(f) * 0.9, blink: blinkAt(f, 3), look: 0.7, headTilt: hi.headTilt, bob: 0, near: { to: [270, 806], hand: 'fist', bend: -1 } };
  // near hand resting on the forward knee by default
  switch (S.id) {
    case 'hook': o = { ...o, expr: f > 30 ? 'grin' : 'smile', look: f > 34 ? -0.2 : 0.8 }; break;
    case 'lie': {
      const kn = sm(ramp(f, 112, 134));
      o = { ...o, kneel: kn, expr: f > 140 ? 'smile' : 'talk', look: 0.8 };
      if (f < 116) { // palm-down "lie down" signal over the dog's head
        const hy = KF(f, [[67, 0.95], [86, 0.95], [100, 0.62], [116, 0.66]]), hx = KF(f, [[67, 0.5], [86, 0.42], [116, 0.44]]);
        const r = reachFor({ ...o, lean: 0 }, tD([hx, hy, 0.05]), 'palm');
        o = { ...o, ...r, far: { ...r.far, hand: 'palm', rot: (f < 104 ? 8 : 0) - r.lean } };
      } else o.far = 'hip';
      o.near = kn > 0.5 ? o.near : 'hang';
      break;
    }
    case 'relax': o = { ...o, expr: f > 214 ? 'proud' : 'smile', near: f > 212 && f < 256 ? 'thumb' : o.near, far: 'hip', look: 0.6 }; break;
    case 'high': o = { ...o, expr: f > 556 ? 'oops' : 'focus' }; break;
    case 'reward': o = { ...o, expr: f > 612 ? 'grin' : 'smile' }; break;
    case 'choose': o = { ...o, expr: 'patient' }; break;
    case 'comfy': o = { ...o, expr: 'smile' }; break;
    case 'finish': case 'party': {
      const yes = f >= 1005 && f < 1022, clk = sm(ramp(f, 1014, 1022)) * (1 - sm(ramp(f, 1036, 1046)));
      o = { ...o, expr: f >= 1046 ? 'laugh' : yes ? 'yes' : f >= 1022 ? 'grin' : 'focus', talk: yes ? 0 : o.talk };
      if (clk > 0.05) { o.near = { to: [lerp(270, 330, clk), lerp(806, 560, clk)], hand: 'clicker', bend: -1, rot: -60 }; o.click = f >= 1024 && f < 1030 ? 1 : 0; }
      if (f >= 1058) o.near = 'thumb';
      break;
    }
    default: o = { ...o, expr: 'focus' };
  }
  if (D.treat && D.hand) Object.assign(o, reachFor(o, tD(d3W(D.treat)), D.hand));
  else if (!o.far) o.far = 'hip';
  if (o.far && o.far.hand) o.glow = D.hand === 'treat' && S.id !== 'high' ? 0.6 + 0.3 * Math.sin(f * 0.3) : 0;
  return o;
};

// ---------- cameras ----------
const CAMS = {
  hook: [{ f: 0, pos: [0.08, 0.95, 2.2], look: [0.06, 0.5, -0.1], fov: 40 }, { f: 66, pos: [0.08, 1.0, 2.6], look: [0.05, 0.58, -0.15], fov: 40 }],
  lie: [{ f: 67, pos: [0.15, 1.05, 3.0], look: [0.12, 0.66, -0.15], fov: 40 }, { f: 122, pos: [0.1, 1.0, 2.8], look: [0.05, 0.56, -0.15], fov: 39 },
    { f: 150, pos: [-0.3, 0.7, 1.75], look: [-0.38, 0.27, 0], fov: 37, path: [[-0.05, 0.9, 2.4]] }, { f: 176, pos: [-0.34, 0.68, 1.65], look: [-0.4, 0.26, 0], fov: 36 }],
  relax: [{ f: 177, pos: [-0.2, 0.85, 2.2], look: [-0.12, 0.36, 0], fov: 38 }, { f: 205, pos: [-0.12, 0.85, 2.25], look: [-0.06, 0.37, 0], fov: 38 }, { f: 240, pos: [0.05, 1.0, 2.6], look: [0.02, 0.58, -0.15], fov: 40 }, { f: 260, pos: [0.06, 1.0, 2.55], look: [0.03, 0.58, -0.15], fov: 40 }],
  nose: [{ f: 261, pos: [0.42, 0.62, 1.4], look: [0.27, 0.38, 0], fov: 35 }, { f: 352, pos: [0.38, 0.56, 1.2], look: [0.25, 0.36, 0], fov: 34 }],
  shoulder: [{ f: 353, pos: [0.12, 0.9, 1.85], look: [0.04, 0.4, -0.05], fov: 38 }, { f: 455, pos: [0.06, 0.88, 1.7], look: [0.0, 0.38, -0.05], fov: 37 }],
  low: [{ f: 456, pos: [0.08, 0.82, 1.65], look: [0.0, 0.38, 0], fov: 37 }, { f: 490, pos: [0.06, 0.8, 1.55], look: [-0.02, 0.38, 0], fov: 36 }],
  high: [{ f: 491, pos: [0.08, 0.82, 1.65], look: [0.0, 0.4, 0], fov: 37 }, { f: 540, pos: [0.12, 1.0, 2.8], look: [0.1, 0.68, -0.15], fov: 40, ease: 'easeOut' }, { f: 590, pos: [0.12, 0.98, 2.65], look: [0.1, 0.65, -0.15], fov: 39 }],
  reward: [{ f: 591, pos: [0.25, 0.85, 2.2], look: [0.15, 0.55, -0.15], fov: 39 }, { f: 645, pos: [0.22, 0.82, 2.0], look: [0.13, 0.52, -0.15], fov: 38 }],
  little: [{ f: 646, pos: [0.05, 0.95, 2.0], look: [0.0, 0.4, -0.05], fov: 38 }, { f: 725, pos: [-0.02, 0.98, 1.95], look: [-0.05, 0.38, -0.05], fov: 38 }],
  choose: [{ f: 726, pos: [0.25, 0.64, 1.35], look: [0.1, 0.32, 0], fov: 34 }, { f: 785, pos: [0.22, 0.6, 1.18], look: [0.08, 0.32, 0], fov: 33 }],
  comfy: [{ f: 786, pos: [-0.1, 1.75, 1.9], look: [-0.12, 0.25, -0.1], fov: 40 }, { f: 838, pos: [-0.04, 1.0, 2.1], look: [-0.06, 0.42, -0.05], fov: 38, path: [[-0.08, 1.35, 2.0]] }],
  arc: [{ f: 839, pos: [-0.04, 1.0, 2.1], look: [-0.06, 0.42, -0.05], fov: 38 }, { f: 945, pos: [0.0, 0.96, 1.95], look: [-0.03, 0.42, -0.05], fov: 37 }],
  finish: [{ f: 946, pos: [0.0, 0.96, 1.95], look: [-0.03, 0.42, -0.05], fov: 37 }, { f: 995, pos: [0.12, 0.95, 2.4], look: [0.1, 0.62, -0.2], fov: 39 }, { f: 1043, pos: [0.14, 0.92, 2.15], look: [0.12, 0.64, -0.2], fov: 38 }],
  party: [{ f: 1044, pos: [0.14, 0.92, 2.1], look: [0.12, 0.64, -0.2], fov: 38 }, { f: 1072, pos: [0.1, 1.25, 3.5], look: [0.05, 0.62, -0.2], fov: 40, ease: 'easeOut' }],
};
const KICKS = [{ f: 20, a: 0.006 }, { f: 574, a: 0.012 }, { f: 1008, a: 0.01 }, { f: 1046, a: 0.012 }];
export const camAt = (f) => {
  const S = shotAt(f), c = camFromKeys(CAMS[S.id], f, { kicks: KICKS });
  const fl = (a, n, k) => (f >= a && f < a + n ? (1 - (f - a) / n) * k : 0);
  c.flash = fl(67, 6, 0.7) + fl(591, 6, 0.7) + fl(1044, 8, 0.6);
  c.shadowAt = [0.2, 0.3, 0];
  return c;
};

// ---------- lens ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const dofAt = (f) => {
  const S = shotAt(f), C = camAt(f); CUR = C.pos;
  const head = d3W(dogRig(dogAt(f).o).head);
  switch (S.id) {
    case 'nose': case 'choose': return { focus: dist(C.pos, head), cinf: 11 };
    case 'low': return { focus: dist(C.pos, head), cinf: 9 };
    case 'lie': return { focus: dist(C.pos, f > 140 ? d3W([-60, 60, 0]) : head), cinf: lerp(5, 9, sm(ramp(f, 120, 150))) };
    case 'hook': case 'reward': case 'finish': case 'party': case 'relax': return { focus: dist(C.pos, head), cinf: 7 };
    default: return { focus: dist(C.pos, head), cinf: 5 };
  }
};

export const worldAt = () => ({});

// ---------- actors ----------
const roundAll = (o) => { const r = {}; for (const k in o) { const v = o[k]; r[k] = typeof v === 'number' ? q(v, 2) : Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? Math.round(x) : x)) : v && typeof v === 'object' ? roundAll(v) : v; } return r; };
export const actorsAt = (f, T) => {
  CUR = camAt(f).pos;
  const D = dogAt(f), out = [];
  const dO = roundAll(D.o);
  out.push({ key: 'dog' + JSON.stringify(dO), draw: (p) => T.dogRoll(p, dO), x: DOG[0], y: DOG[1], z: DOG[2], s: SD, order: 3, noDepth: true, ground: MAT, blobW: 1.25, blobD: 0.55, blobX: -0.05 });
  const tO = roundAll(trainerAt(f, D));
  out.push({ key: 'tr' + JSON.stringify(tO), draw: (p) => T.trainerDraw(p, tO), x: TRN[0], y: TRN[1], z: TRN[2], s: ST, order: 1, ground: MAT, blobW: 0.8 });
  return out;
};

// ---------- 2D effects ----------
const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 6, ...extra });
/** card aligned with the dog card (draws in dog design coords), slightly in front */
const dogFx = (key, draw, dz = 0.12) => FX(key, draw, [DOG[0], DOG[1], DOG[2] + dz], SD, { order: 7 });
const pop = (f, a, n = 9) => M.back(ramp(f, a, a + n));
const trailOf = (f, a, b, step = 2) => { const pts = []; for (let t = a; t <= Math.min(f, b); t += step) { const D = dogAt(t); if (D.treat) pts.push(dogProject(D.treat)); } return pts; };
export const fxAt = (f, T) => {
  CUR = camAt(f).pos;
  const S = shotAt(f), out = [];
  const above = (dx = 0, dy = 0) => d3W([40 + dx, 260 + dy, 0]);
  // hip highlight on "settle onto one hip"
  if (f >= 146 && f < 178) { const hp = dogProject(dogRig(dogAt(f).o).X([-70, 0, 40])), t = q(((f - 146) / 26) % 1, 2);
    out.push(dogFx('hip' + t, (p) => { p.g.translate(hp[0] - 300 * 0.45, hp[1] - 500 * 0.45); p.g.scale(0.45, 0.45); T.fxPulse(p, t); })); }
  // relaxed sigh
  if (f >= 186 && f < 214) { const t = q(ramp(f, 186, 214), 2), hd = dogProject(dogRig(dogAt(f).o).nose); out.push(dogFx('sigh' + t, (p) => { p.g.translate(hd[0] - 60, hd[1] - 140); p.g.scale(0.4, 0.4); T.fxSigh(p, t); })); }
  // badges: good on "foundation" / "close" / "side", bad on "stand up"
  const badge = (a, b, good, pos) => { if (f >= a && f < b) { const k = q(pop(f, a) * (1 - sm(ramp(f, b - 6, b))), 2); if (k > 0.02) out.push(FX((good ? 'ok' : 'no') + k, (p) => (good ? T.fxCheck(p, 1) : T.fxCross(p, 1)), pos, 0.34 * k, { roll: q(0.06 * Math.sin(f * 0.2), 2) })); } };
  badge(215, 258, true, above(0, 30));
  badge(472, 491, true, d3W([60, 230, 0]));
  badge(572, 590, false, d3W([160, 470, 0]));
  badge(820, 838, true, d3W([-20, 230, 0]));
  // magnet field between treat and nose
  if (S.id === 'nose' && f >= 330) { const D = dogAt(f), a = dogProject(D.treat), b = dogProject(dogRig(D.o).nose), ph = q((f * 0.2) % 1, 2), al = q(sm(ramp(f, 330, 338)), 2);
    out.push(dogFx('mag' + a.map(Math.round) + b.map(Math.round) + ph + al, (p) => T.fxMagnet(p, a, b, ph, al))); }
  // treat-path trails
  const trail = (a, b, col, glow) => { const pts = trailOf(f, a, b); if (pts.length > 1) { const key = 'tr' + a + '_' + Math.min(f, b) + col; out.push(dogFx(key, (p) => T.fxTrail(p, pts, 1, col, glow))); } };
  if (S.id === 'shoulder') trail(361, 445, '#ffffff', '#ffe27a');
  if (S.id === 'low') trail(456, 490, '#7dff9a', '#3fbf6a');
  if (S.id === 'high' && f < 560) trail(504, 540, '#ff8a80', '#e2463c');
  if (S.id === 'little') trail(649, 700, '#ffffff', '#ffe27a');
  if (S.id === 'arc') trail(852, 934, '#ffffff', '#ffe27a');
  // reward sparkles / hearts / crumbs
  const sparks = (a, pos) => { for (let i = 0; i < 3; i++) { const t0 = a + i * 3, k = ramp(f, t0, t0 + 14); if (k > 0 && k < 1) { const kk = q(Math.sin(k * Math.PI), 1); out.push(FX('sp' + kk, (p) => T.fxSpark2(p, kk), [pos[0] - 0.12 + i * 0.12, pos[1] + i * 0.07 + k * 0.08, pos[2] + 0.2], 0.1)); } } };
  const hearts = (a, pos, n = 3) => { for (let i = 0; i < n; i++) { const t0 = a + i * 5, k = ramp(f, t0, t0 + 28); if (k > 0 && k < 1) out.push(FX('ht', (p) => T.fxHeart2(p), [pos[0] - 0.15 + i * 0.15 + 0.03 * Math.sin(f * 0.2 + i), pos[1] + k * 0.6, pos[2] + 0.2], 0.11 * pop(f, t0, 8), { alpha: q(1 - k * k, 2) })); } };
  const crumbs = (a) => { const k = ramp(f, a, a + 16); if (k > 0 && k < 1) { const n = dogProject(dogRig(dogAt(f).o).nose), w = dW(n), kk = q(k, 2); out.push(FX('cr' + kk, (p) => T.fxCrumbs(p, kk), [w[0], w[1] - 0.05, 0.3], 0.18)); } };
  const headW = () => d3W(dogRig(dogAt(f).o).head);
  if (S.id === 'hook') { crumbs(32); hearts(36, headW()); }
  if (S.id === 'reward') { crumbs(611); hearts(614, headW()); }
  if (S.id === 'little') { sparks(663, headW()); sparks(711, d3W([0, 140, 0])); }
  if (S.id === 'finish' && f >= 984 && f < 1000) { const t = q(ramp(f, 984, 1000), 2); out.push(FX('dust' + t, (p) => { p.g.translate(150, 300); T.fxPuff(p, t); }, d3W([-20, 0, 60]), 0.5)); }
  if (S.id === 'finish' && f >= 1006 && f < 1022) { const t = q(ramp(f, 1006, 1022), 2); out.push(FX('yes' + t, (p) => { p.g.translate(50, 250); T.fxBurst(p, t, '#ffe27a'); }, [TRN[0] + 0.15, 1.15, TRN[2] + 0.1], 0.45)); }
  if (f >= 1024 && f < 1036) { const t = q(ramp(f, 1024, 1036), 2), c = trainerAt(f, dogAt(f)); void c;
    out.push(FX('clk' + t, (p) => T.fxClick(p, t), [TRN[0] - 0.12, 0.72, TRN[2] + 0.1], 0.22)); }
  if (S.id === 'party') { crumbs(1046); hearts(1048, headW(), 4); const t = q(ramp(f, 1046, 1072), 2); if (t > 0 && t < 1) out.push(FX('conf' + t, (p) => T.fxConfetti(p, t), [0.3, 0.6, 0.35], 1.0)); }
  return out;
};

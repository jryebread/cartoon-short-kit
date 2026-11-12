// "Why Your Puppy Bites" — informational short, 3D puppy (dog-puppy.glb) + the 2D bald trainer, 1012 frames, timed to voice.mp3.
// Word frames (round(s*30)):
//  Puppies 0 don't 11 bite 18 because 23 of 34 their 39 teeth 43-51 | they 73 bite 74 because 80 they 95 are 100 tired 103-116 |
//  A 142 young 143 puppy 148 needs 155 18 167 to 179 20 190 hours 204 of 212 sleep 218 a 226 day 232-241 | most 256 get 264 around 271 12 276-288 |
//  and 303 an 310 overtired 313 puppy 329 doesn't 337 slow 355 down 362-373 | It 385 gets 388 wilder 393-414 |
//  zoomies 428-443 | hands 455-458 | ankles 479-481 | your 491 sleeves 491-501 |
//  that's 519 why 531 the 535 biting 538 is 547 always 553 worst 563 in 576 the 584 evening 587-598 |
//  so 611 stop 616 trying 625 to 632 tire 637 them 645 out 650 with 655 more 659 play 666-673 |
//  After 695 about 701 an 710 hour 714 awake 722-731 | it's 746 nap 751 time 756-766 | quiet 779 room 787-797 crate 806 or 812 pen 820-827 lights 836 low 843-854 |
//  Fix 854 the 875 sleep 881-889 and 897 most 898 of 905 the 911 biting 913 fades 921-932 on 941 its 944 own 944-952 | Follow 969 for 975 the 981 next 984 fix 988-997 | end 1011.
// Pointers: POV = the trainer's hand on the black stick arm (W.hand). Hard cuts only, no flashes.
import { M, camFromKeys, idle, blinkAt, q, clamp, lerp, lerp3, ramp, spline } from './motion.js';
import { trainerShoulder } from './toon.js';
import { VENV } from './voiceenv.js';
export const FPS = 30, TOTAL = 1012, DECK = 0;
export const SHOTS = [
  { id: 'hook', a: 0, b: 72 },        // the trainer gets nipped; tooth icon crossed out on "teeth"
  { id: 'tired', a: 73, b: 141 },     // sleepy puppy, the 3D battery drains to red, yawn on "tired"
  { id: 'chart', a: 142, b: 302 },    // 2D screen: two bars, needs 18-20 h vs gets 12 h
  { id: 'wild', a: 303, b: 427 },     // overtired: bouncing, gauge needle dips then pins red, play bow + spin
  { id: 'zoom', a: 428, b: 454 },     // overhead: zoomies around the mat (orange speed trail)
  { id: 'hands', a: 455, b: 478 },    // POV: the puppy leaps and nips the hand
  { id: 'ankles', a: 479, b: 490 },   // ground level: tugging the trainer's jeans cuff
  { id: 'sleeves', a: 491, b: 518 },  // POV: tugging a sleeve
  { id: 'evening', a: 519, b: 610 },  // sunset: zooming + leaping over the jump, clock wedge on "worst ... evening"
  { id: 'play', a: 611, b: 694 },     // dusk POV: more tug play just winds it up; stop sign, cross on "play"
  { id: 'hour', a: 695, b: 745 },     // stopwatch fills to 1 h, the puppy nods off
  { id: 'nap', a: 746, b: 778 },      // yawn, lies down, zZz + moon
  { id: 'room', a: 779, b: 853 },     // the quiet room: crate check, pen check, lights dim
  { id: 'fix', a: 854, b: 968 },      // asleep in the crate, battery recharges, bite icons fade away
  { id: 'outro', a: 969, b: 1011 },   // morning: calm puppy + the trainer waves, thumbs up
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];
const sm = M.smooth;
const KF = (f, keys, ease = sm) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [fa, va] = keys[i], [fb, vb] = keys[i + 1]; if (f <= fb) { const t = ease((f - fa) / (fb - fa)); return Array.isArray(va) ? va.map((v, k) => lerp(v, vb[k], t)) : lerp(va, vb, t); } }
  return keys[keys.length - 1][1];
};
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, s) => a.map((v) => v * s);
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// ---------- lights (keyed by frame, blended inside a shot; cuts may jump) ----------
export const LIGHTS = {
  day: { az: 135, el: 50, sky: '#c4d6f2', ground: '#8a8262', hemi: 1.2, sun: '#fff1dc', sunI: 2.4, fog: '#cadcf0', fogNear: 60, fogFar: 700,
    skyTop: '#3f80d4', skyHor: '#c3daf2', sat: 1.08, vig: 0.2, shadowExt: 3, gain: '#ffffff', lift: '#000000', sunDisc: '#000000', sunSize: 0 },
  late: { az: 205, el: 30, sky: '#ccd6ee', ground: '#8a7e62', hemi: 1.15, sun: '#ffe6c8', sunI: 2.4, fog: '#d8dcea', fogNear: 60, fogFar: 700,
    skyTop: '#4a84d0', skyHor: '#e6dccc', sat: 1.08, vig: 0.22, shadowExt: 3, gain: '#fffaf4', lift: '#000000', sunDisc: '#000000', sunSize: 0 },
  golden: { az: 255, el: 17, sky: '#ffe2c4', ground: '#8a7460', hemi: 1.05, sun: '#ffd09a', sunI: 2.5, fog: '#f2cfa6', fogNear: 60, fogFar: 650,
    skyTop: '#5c86cf', skyHor: '#ffcf98', sat: 1.06, vig: 0.24, shadowExt: 4.5, gain: '#fff8ee', lift: '#000000', sunDisc: '#fff0c0', sunSize: 0.0025 },
  sunset0: { az: 262, el: 22, sky: '#ffc49a', ground: '#7a5a52', hemi: 0.95, sun: '#ffb070', sunI: 2.4, fog: '#f0a882', fogNear: 60, fogFar: 600,
    skyTop: '#5258a8', skyHor: '#ff9a58', sat: 1.08, vig: 0.26, shadowExt: 6, gain: '#fff2ea', lift: '#000000', sunDisc: '#ffe0a0', sunSize: 0.003 },
  sunset1: { az: 264, el: 14, sky: '#ffad88', ground: '#6a4a52', hemi: 0.9, sun: '#ff9258', sunI: 2.2, fog: '#e8907a', fogNear: 60, fogFar: 550,
    skyTop: '#464a98', skyHor: '#ff8048', sat: 1.08, vig: 0.28, shadowExt: 6, gain: '#fff0ea', lift: '#000000', sunDisc: '#ffd080', sunSize: 0.0035 },
  dusk: { az: 266, el: 10, sky: '#d0b4e0', ground: '#6a5a6a', hemi: 1.25, sun: '#ffa888', sunI: 1.8, fog: '#9a78a4', fogNear: 50, fogFar: 450,
    skyTop: '#2e3470', skyHor: '#e47a92', sat: 1.0, vig: 0.3, shadowExt: 3, gain: '#f6eeff', lift: '#06030c', sunDisc: '#ff9a70', sunSize: 0.0025 },
  room: { az: 270, el: 33, sky: '#ffe6cc', ground: '#8a6a58', hemi: 1.0, sun: '#ffb98a', sunI: 1.6, fog: '#3a3666', fogNear: 40, fogFar: 400,
    skyTop: '#2e3470', skyHor: '#e47a92', sat: 1.04, vig: 0.28, shadowExt: 3.5, gain: '#fff8f0', lift: '#000000', sunDisc: '#000000', sunSize: 0, lamp: 3.2 },
  night: { az: 270, el: 33, sky: '#8a90d0', ground: '#3a3048', hemi: 0.55, sun: '#9fb2ff', sunI: 0.7, fog: '#1a1c40', fogNear: 30, fogFar: 300,
    skyTop: '#0c1034', skyHor: '#252a62', sat: 0.96, vig: 0.38, shadowExt: 3.5, gain: '#e8ecff', lift: '#04030a', sunDisc: '#000000', sunSize: 0, lamp: 0.7 },
  morning: { az: 110, el: 38, sky: '#cfe0f6', ground: '#8a8262', hemi: 1.25, sun: '#fff6e6', sunI: 2.4, fog: '#d6e6f6', fogNear: 60, fogFar: 700,
    skyTop: '#4a8ee0', skyHor: '#d4e8f8', sat: 1.08, vig: 0.18, shadowExt: 3, gain: '#ffffff', lift: '#000000', sunDisc: '#000000', sunSize: 0 },
};
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mixL = (A, B, t) => { const o = {}; for (const k in A) { const a = A[k], b = B[k] ?? a; o[k] = typeof a === 'number' ? lerp(a, b, t) : typeof a === 'string' && a[0] === '#' ? toHex(lerp3(hex(a), hex(b), t)) : t < 0.5 ? a : b; } return o; };
const LKEYS = [[0, 'day'], [330, 'day'], [427, 'late'], [428, 'golden'], [518, 'golden'], [519, 'sunset0'], [610, 'sunset1'], [611, 'dusk'], [778, 'dusk'],
  [779, 'room'], [838, 'room'], [856, 'night'], [968, 'night'], [969, 'morning'], [1011, 'morning']];
export const lightAt = (f) => {
  for (let i = 0; i < LKEYS.length - 1; i++) { const [fa, a] = LKEYS[i], [fb, b] = LKEYS[i + 1]; if (f <= fb) return mixL(LIGHTS[a], LIGHTS[b], fb > fa ? sm((f - fa) / (fb - fa)) : 1); }
  return { ...LIGHTS.morning };
};
export const lightFor = (S, f) => lightAt(f);

// ---------- staging ----------
const MAT = 0.064, K = 0.00225, ST = 1.08;
const DOGPOS = [0, MAT, 0], DOGYAW = Math.PI / 2;      // puppy on the mat, nose toward +x
const TRN = [0.52, MAT, -0.66];                          // 2D trainer card (flipped: faces -x), hook + outro
const TA = [0.62, MAT, -0.34];                           // trainer standing (ankles shot)
const ROOM = { x: 0, z: 39 }, CRATE = { x: -0.95, z: 39 - 1.45 }, PEN = { x: 1.25, z: 39 - 1.25 }, LAMP = { x: 0.15, y: 1.02, z: 39 - 2.1 };
const SLEEPPOS = [CRATE.x + 0.06, 0.118, CRATE.z + 0.02];  // on the crate cushion
let CUR = [0, 1, 3], TCUR = TRN;
const axisOf = (pos) => { const ry = Math.atan2(CUR[0] - pos[0], CUR[2] - pos[2]); return [Math.cos(ry), 0, -Math.sin(ry)]; };
/** world point -> trainer design point along the camera ray (flipped card) */
const tD = (P) => {
  const C = CUR, TR0 = TCUR, ax = axisOf(TR0), n = [-ax[2], 0, ax[0]];
  const d = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], den = d[0] * n[0] + d[2] * n[2] || 1e-6;
  const s = ((TR0[0] - C[0]) * n[0] + (TR0[2] - C[2]) * n[2]) / den, Q = [C[0] + d[0] * s, C[1] + d[1] * s, C[2] + d[2] * s];
  return [300 - ((Q[0] - TR0[0]) * ax[0] + (Q[2] - TR0[2]) * ax[2]) / (K * ST), 975 - (Q[1] - TR0[1]) / (K * ST)];
};
/** design point on a (flipped) trainer card -> world point on the card plane, for camera position C */
const tW = (C, TR0, x, y) => { const ry = Math.atan2(C[0] - TR0[0], C[2] - TR0[2]), ax = [Math.cos(ry), 0, -Math.sin(ry)], u = (300 - x) * K * ST;
  return [TR0[0] + ax[0] * u, TR0[1] + (975 - y) * K * ST, TR0[2] + ax[2] * u]; };
/** camera basis (for HUD-like cards that sit in the 3D world relative to the camera) */
const camBasis = (c) => { const fw = norm(sub(c.look, c.pos)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw); return { fw, rt, up }; };

// ---------- reference points from the real rig ----------
const REF = {};
export const calibrate = (poseFn, root) => {
  root.position.set(...DOGPOS); root.rotation.set(0, DOGYAW, 0); root.updateMatrixWorld(true);
  const far = [3, 0.3, 0];
  REF.sit = poseFn({ w: { sit: 1 }, look: far });
  REF.down = poseFn({ w: { down: 1 }, look: far });
  REF.stand = poseFn({ w: { stand: 1 }, look: far });
  REF.tug = poseFn({ w: { stand: 0.45, bow: 0.55 }, look: [3, 0.2, 0], neck: 1 });
  REF.bow = poseFn({ w: { bow: 1 }, look: [3, 0.0, 0], neck: 1 });
  REF.side = poseFn({ w: { flop: 1 }, roll: -90, twist: twistFor(-90), look: [0.9, 0.3, -0.3] });
  { const { pos, ...hk } = dog3At(45); REF.hk = poseFn(hk); REF.hkPos = pos; }
  root.position.set(...DOGPOS);
};
const twistFor = (r) => { const u = Math.min(1, Math.abs(r) / 360); return 360 * (0.5 * u + 0.5 * M.smooth(ramp(u, 0.3, 0.7)) - u); };
const shift = (P, pos) => [P[0] + pos[0] - DOGPOS[0], P[1] + pos[1] - DOGPOS[1], P[2] + pos[2] - DOGPOS[2]];
const chompAt = (f, t0, n = 14) => (f >= t0 && f < t0 + n ? Math.abs(Math.sin((f - t0) * 0.75)) : 0);

// ---------- tug of war (hook / hands / sleeves / play): the puppy hangs on and shakes its head ----------
const tug = (f, pos, amp = 1, speed = 1) => {
  const pull = -0.028 * amp * (0.5 + 0.5 * Math.sin(f * 0.45 * speed)), shake = Math.sin(f * 0.8 * speed) * amp;
  const P = [pos[0] + pull, pos[1], pos[2]];
  const nose = shift(REF.tug.nose, P);
  return { P, shake, mouth: add(nose, [0.025, 0.004 * Math.sin(f * 0.9), 0.022 * shake]) };
};
const tugDog = (f, base, T, extra = {}) => ({ ...base, pos: T.P, w: { stand: 0.45, bow: 0.55 }, look: add(T.mouth, [0.6, -0.04, 0.08 * T.shake]), neck: 1,
  headTilt: 16 * T.shake, jaw: 0.42 + 0.08 * Math.sin(f * 1.3), wag: Math.sin(f * 0.9) * 1.2, tail: 0.45, ears: 0.15 * T.shake, blink: 0, ...extra });

// ---------- zoomies: legs (spline runs) with hops; gallop by blending reach <-> gather ----------
const onMat = (x, z) => { const ex = Math.min(x + 1.0, 1.1 - x), ez = Math.min(z + 0.62, 0.62 - z); return clamp(Math.min(ex, ez) / 0.04 + 0.5); };
const P3 = (p) => [p[0], 0, p[1]];
// a run is a list of legs { a, b, pts:[[x,z]...], hop?: height, spin?: turns }
const runAt = (legs, f) => {
  const L = legs.find((l) => f <= l.b) || legs[legs.length - 1], u = ramp(f, L.a, L.b);
  const p = spline(L.pts.map(P3), L.ease ? L.ease(u) : u);
  return { p, L, u };
};
const RUN_ZOOM = [
  { a: 428, b: 438, pts: [[0.1, 0.0], [0.55, 0.45], [0.95, 0.95]], ease: (u) => u * u * (2 - u) },
  { a: 438, b: 446, pts: [[0.95, 0.95], [0.35, 1.45], [-0.3, 1.25]], hop: 0.22 },
  { a: 446, b: 456, pts: [[-0.3, 1.25], [-0.85, 0.6], [-0.85, -0.35], [-0.45, -1.0]] },
];
const RUN_EVE = [
  { a: 519, b: 545, pts: [[0.95, 1.4], [0.6, 0.1], [0.28, -1.5], [0.22, -2.1]] },
  { a: 545, b: 559, pts: [[0.22, -2.1], [0.15, -3.15]], hop: 0.52 },
  { a: 559, b: 579, pts: [[0.15, -3.15], [-0.35, -3.6], [-0.95, -3.3], [-1.05, -2.45]] },
  { a: 579, b: 591, pts: [[-1.05, -2.45], [-0.85, -1.3]], hop: 0.32 },
  { a: 591, b: 604, pts: [[-0.85, -1.3], [-0.3, -0.1]], hop: 0.5, spin: 1 },
  { a: 604, b: 611, pts: [[-0.3, -0.1], [-0.2, 0.05]], ease: (u) => 1 - (1 - u) ** 3 },
];
const yawAt = (legs, f) => { const a = runAt(legs, f - 0.6).p, b = runAt(legs, f + 0.6).p, d = sub(b, a); return Math.hypot(d[0], d[2]) > 1e-4 ? Math.atan2(d[0], d[2]) : null; };
const zoomDog = (legs, f, base) => {
  const { p, L, u } = runAt(legs, f), sp = dist(runAt(legs, f - 0.5).p, runAt(legs, f + 0.5).p);
  let yaw = yawAt(legs, f); if (yaw === null) yaw = yawAt(legs, L.a + 1) ?? 0;
  const y0 = MAT * onMat(p[0], p[2]);
  const ph = (f - legs[0].a) * 0.17 * 2 * Math.PI, s = 0.5 + 0.5 * Math.sin(ph);
  let y = y0 + 0.035 * Math.max(0, Math.sin(ph + 0.6)) * clamp(sp / 0.05), pitch = 6 * Math.cos(ph), w = { reach: s, gather: 1 - s }, sq = 0;
  if (L.hop) { const h = 4 * u * (1 - u); y = y0 + L.hop * h; pitch = 24 * (1 - 2 * u); const ext = Math.sin(Math.PI * u); w = { reach: 0.3 + 0.7 * ext, gather: 0.7 - 0.7 * ext + 0.0001 }; if (L.spin) yaw += L.spin * 2 * Math.PI * sm(ramp(u, 0.1, 0.9)); }
  // squash on landing after a hop
  const prev = legs.find((l) => l.hop && f >= l.b && f < l.b + 6); if (prev) { const k = (f - prev.b) / 6; sq = 0.14 * Math.sin(Math.PI * k) * (prev.hop / 0.4); }
  const yA = yawAt(legs, f - 2), yB = yawAt(legs, f + 2); const bank = yA !== null && yB !== null && !L.hop ? clamp(-wrapA(yB - yA) * 55, -22, 22) : 0;
  const fwd = [Math.sin(yaw), 0, Math.cos(yaw)];
  return { ...base, pos: [p[0], y, p[2]], yaw, pitch, bank, sq, w, look: add([p[0], y + 0.25, p[2]], mul(fwd, 2)), neck: 0.8, ears: 0.8, tail: 0.25, wag: Math.sin(f * 1.1) * 0.8, jaw: 0.45, blink: 0 };
};
const runPos = (legs, f) => { const { p, L, u } = runAt(legs, f); return [p[0], MAT * onMat(p[0], p[2]) + (L.hop ? L.hop * 4 * u * (1 - u) : 0), p[2]]; };

// ---------- the puppy ----------
export const dog3At = (f) => {
  const S = shotAt(f);
  const base = { pos: DOGPOS, yaw: DOGYAW, w: { stand: 1 }, roll: 0, blink: blinkAt(f, 8) ? 1 : 0, breath: 0.25 + 0.25 * Math.sin(f * 0.2), wag: 0.4 * Math.sin(f * 0.25), tail: 0.1, neck: 0.85 };
  switch (S.id) {
    case 'hook': { const T = tug(f, [-0.06, MAT, -0.04], hookAmp(f)); return tugDog(f, base, T); }
    case 'tired': {
      const yawn = sm(ramp(f, 98, 106)) * (1 - sm(ramp(f, 116, 124)));
      const lid = 0.38 + 0.18 * Math.sin(f * 0.05) + 0.3 * sm(ramp(f, 124, 138));
      return { ...base, w: { sit: 1 }, look: yawn > 0.05 ? lerp3([0.9, 0.22, 0.42], [0.55, 1.0, 0.3], yawn) : [0.9, 0.22 - 0.06 * sm(ramp(f, 124, 141)), 0.42], neck: 0.8,
        jaw: yawn * 1.0, blink: yawn > 0.5 ? 1 : blinkAt(f, 8) ? 1 : lid, ears: 0.5, tail: -0.2, wag: 0.12 * Math.sin(f * 0.1), breath: 0.35 + 0.35 * Math.sin(f * 0.1), headTilt: 5 * Math.sin(f * 0.04) };
    }
    case 'wild': {
      const camP = camAt(f).pos;
      if (f < 385) { // jittery bouncing: overtired, can't settle
        const per = f < 337 ? 10 : 8, k = ((f - 303) % per) / per, h = (f < 337 ? 0.05 : 0.085) * 4 * k * (1 - k), side = f >= 337 ? 0.05 * Math.sin((f - 337) * Math.PI / 8) : 0;
        return { ...base, pos: [0, MAT + h, side], yaw: DOGYAW + 0.25 * Math.sin(f * 0.21), w: { stand: 1 - 0.6 * Math.sin(Math.PI * k), gather: 0.6 * Math.sin(Math.PI * k) + 0.0001 }, pitch: 10 * (1 - 2 * k),
          look: camP, neck: 0.7, ears: -0.4 + 0.5 * Math.sin(Math.PI * k), wag: Math.sin(f * 1.1) * 1.3, tail: 0.5, jaw: 0.4, blink: 0 };
      }
      if (f < 396) { const b = sm(ramp(f, 385, 391)); // play bow + butt wiggle
        return { ...base, w: { stand: 1 - b, bow: b + 0.0001 }, yaw: DOGYAW + 0.12 * Math.sin(f * 1.1) * b, look: camP, neck: 1, ears: -0.5, tail: 0.7, wag: Math.sin(f * 1.3) * 1.5, jaw: 0.5, blink: 0 };
      }
      if (f < 414) { const u = ramp(f, 396, 414), h = 0.16 * Math.sin(Math.PI * u), ph = (f - 396) * 0.9; // a spinning leap
        return { ...base, pos: [0, MAT + h, 0], yaw: DOGYAW + 2 * Math.PI * sm(u), w: { reach: 0.5 + 0.5 * Math.sin(ph), gather: 0.5 - 0.5 * Math.sin(ph) + 0.0001 }, pitch: 18 * (1 - 2 * u),
          bank: 14 * Math.sin(Math.PI * u), look: null, neck: 0.6, ears: 0.8, tail: 0.3, wag: Math.sin(f * 1.4), jaw: 0.6, blink: 0 };
      }
      { const sq = f < 420 ? 0.12 * Math.sin(Math.PI * (f - 414) / 6) : 0, b = sm(ramp(f, 414, 420));
        return { ...base, sq, w: { stand: 1 - b, bow: b + 0.0001 }, yaw: DOGYAW + 0.1 * Math.sin(f * 1.2), look: camP, neck: 1, ears: -0.5, tail: 0.7, wag: Math.sin(f * 1.4) * 1.5, jaw: 0.5, blink: 0 }; }
    }
    case 'zoom': return zoomDog(RUN_ZOOM, f, base);
    case 'hands': {
      const T = tug(f, [0, MAT, 0], 1.1);
      if (f < 461) { // runs in and lunges up at the hand
        const u = ramp(f, 452, 461), P = lerp3([-0.5, MAT, -0.4], [0, MAT, 0], sm(u)), h = 0.08 * Math.sin(Math.PI * ramp(f, 456, 462));
        const yaw = lerp(DOGYAW - 0.7, DOGYAW, sm(u)), ph = f * 1.0;
        return { ...base, pos: [P[0], P[1] + h, P[2]], yaw, w: { reach: 0.5 + 0.5 * Math.sin(ph), gather: 0.5 - 0.5 * Math.sin(ph) + 0.0001 }, pitch: 22 * Math.sin(Math.PI * ramp(f, 455, 462)),
          look: add(T.mouth, [0.5, 0.05, 0]), neck: 1, jaw: f >= 457 ? 0.9 - chompAt(f, 459, 6) * 0.5 : 0.4, ears: 0.6, tail: 0.4, wag: Math.sin(f) * 1.2, blink: 0 };
      }
      return tugDog(f, base, T);
    }
    case 'ankles': { const C = ankleCuff(f), sh = Math.sin(f * 0.9);
      const pos = [C[0] - (REF.bow.nose[0] - DOGPOS[0]) - 0.035 - 0.02 * (0.5 + 0.5 * Math.sin(f * 0.5)), MAT, C[2] - (REF.bow.nose[2] - DOGPOS[2])];
      return { ...base, pos, w: { bow: 1 }, look: add(C, [0.6, -0.12, 0.1 * sh]), neck: 1, headTilt: 16 * sh, jaw: 0.45, wag: Math.sin(f * 1.0) * 1.3, tail: 0.6, ears: 0.2 * sh, blink: 0 }; }
    case 'sleeves': { const T = tug(f, [0, MAT, 0], 1.2, 1.1); return tugDog(f, base, T); }
    case 'evening': {
      if (f < 604) return zoomDog(RUN_EVE, f, base);
      const z = zoomDog(RUN_EVE, f, base), b = sm(ramp(f, 604, 609)), camP = camAt(f).pos;
      return { ...z, w: { reach: 0.3 * (1 - b), gather: 0.7 * (1 - b), bow: b + 0.0001 }, yaw: lerp(z.yaw, Math.atan2(camP[0] - z.pos[0], camP[2] - z.pos[2]), sm(ramp(f, 603, 609))), pitch: z.pitch * (1 - b), bank: 0,
        look: b > 0.3 ? camP : z.look, neck: 1, ears: -0.4, tail: 0.7, wag: Math.sin(f * 1.4) * 1.5 };
    }
    case 'play': { const amp = 1 + 0.5 * sm(ramp(f, 630, 660)), T = tug(f, [0, MAT, 0], amp, 1 + 0.35 * sm(ramp(f, 630, 660))); return tugDog(f, base, T, { jaw: 0.4 }); }
    case 'hour': {
      const nod = Math.max(0, Math.sin((f - 700) * 0.13)) ** 2 * sm(ramp(f, 705, 720));
      return { ...base, w: { sit: 1 }, look: [0.9, 0.25 - 0.35 * nod, 0.45], neck: 0.8, blink: blinkAt(f, 8) ? 1 : 0.45 + 0.35 * nod, ears: 0.5, tail: -0.1, wag: 0.1 * Math.sin(f * 0.1), breath: 0.35 + 0.35 * Math.sin(f * 0.1) };
    }
    case 'nap': {
      const yawn = sm(ramp(f, 747, 753)) * (1 - sm(ramp(f, 760, 765))), dn = sm(ramp(f, 763, 774));
      return { ...base, w: { sit: 1 - dn, down: dn + 0.0001 }, look: yawn > 0.05 ? lerp3([0.9, 0.2, 0.4], [0.5, 1.0, 0.3], yawn) : lerp3([0.9, 0.2, 0.4], [0.7, -0.05, 0.3], dn), neck: lerp(0.8, 1, dn),
        jaw: yawn, blink: yawn > 0.5 || f > 770 ? 1 : 0.55 + 0.3 * dn, ears: 0.6, tail: -0.2, wag: 0, breath: 0.4 + 0.4 * Math.sin(f * 0.09) };
    }
    case 'room': case 'fix': {
      const r = -92, tw = Math.sin(Math.PI * ramp(f, 870, 890));
      return { ...base, pos: SLEEPPOS, yaw: -Math.PI / 2, roll: r, twist: twistFor(r), w: { flop: 1 }, look: add(SLEEPPOS, [-0.6, -0.06, 0.35]), neck: 0.5, lift: -12, blink: 1,
        breath: 0.45 + 0.45 * Math.sin(f * 0.085), wag: f > 948 && f < 962 ? 0.3 * Math.sin(f * 0.8) : 0, tail: -0.2, pedal: S.id === 'fix' && tw > 0 ? (f - 870) * 0.45 : 0, ears: f > 938 && f < 944 ? 0.5 : 0.25 };
    }
    case 'outro': {
      const camP = camAt(f).pos;
      return { ...base, pos: [-0.02, MAT, 0.02], w: { sit: 1 }, look: f < 990 ? camP : [TRN[0], 1.0, TRN[2]], neck: 0.9, ears: -0.2, tail: 0.3, wag: Math.sin(f * 0.6) * 0.9, jaw: 0.3, breath: 0.25 + 0.25 * Math.sin(f * 0.2) };
    }
  }
  return base;
};
/** the puppy's mouth in the hook, without the head shake (camera target for the teeth punch-in) */
const hookAmp = (f) => 1 - 0.6 * sm(ramp(f, 33, 41));
const TEETH = () => add(shift(REF.hk.nose, REF.hkPos), [-0.004, 0.062, -0.015]);
const zoomK = (f) => M.easeOut(ramp(f, 35, 43));
const ankleCuff = (f) => { const C = camAt(f).pos; return add(tW(C, TA, 318, 932), [0, 0, 0.05]); };

// ---------- 3D props: battery, hand, rope, trails, rings ----------
const BAT_TIRED = (f) => KF(f, [[73, 1], [84, 1], [112, 0.1]]);
export const worldAt = (f) => {
  const S = shotAt(f), W = {};
  switch (S.id) {
    case 'tired': W.battery = { pos: add(REF.sit.head, [0.02, 0.27, 0.0]), level: BAT_TIRED(f), s: 1.05 * M.back(ramp(f, 74, 82)), blink: f > 112 }; break;
    case 'wild': W.battery = { pos: [-0.05, 0.86, -0.12], level: 0.1, s: 1.0, blink: true }; break;
    case 'hands': { const T = tug(f, [0, MAT, 0], 1.1); W.hand = { treat: add(T.mouth, [0.035, 0.0, 0]), roll: 0.15 * T.shake }; W.treatHide = true; break; }
    case 'sleeves': { const T = tug(f, [0, MAT, 0], 1.2, 1.1); W.hand = { treat: add(T.mouth, [0.0, 0.015, 0.15]), side: 0.5, sleeve: true, roll: 0.2 * T.shake }; W.treatHide = true; break; }
    case 'play': {
      const amp = 1 + 0.5 * sm(ramp(f, 630, 660)), T = tug(f, [0, MAT, 0], amp, 1 + 0.35 * sm(ramp(f, 630, 660)));
      const A = add(T.mouth, [0.27, 0.07 + 0.02 * Math.sin(f * 0.6), 0.04 + 0.05 * Math.sin(f * 0.55)]);
      W.hand = { treat: A, roll: 0.1 * Math.sin(f * 0.5) }; W.treatHide = true; W.rope = { a: A, b: add(T.mouth, [-0.01, 0, 0]), sag: 0.03 };
      W.battery = { pos: [-0.12, 0.72, -0.12], level: KF(f, [[611, 0.1], [637, 0.1], [655, 0.03]]), s: 0.85, blink: true };
      break;
    }
    case 'zoom': case 'evening': {
      const legs = S.id === 'zoom' ? RUN_ZOOM : RUN_EVE, pts = []; let last = null;
      for (let g = Math.max(legs[0].a, f - 22); g <= f - 2; g += 0.5) { const p = add(runPos(legs, g), [0, 0.12, 0]); if (!last || dist(p, last) > 0.07) { pts.push(p); last = p; } }
      W.trail = pts; W.trailCol = '#ff9a3d'; W.trailS = S.id === 'zoom' ? 3.2 : 2.6;
      break;
    }
    case 'room': {
      if (f >= 804 && f < 830) { const gp = [CRATE.x, 0.02, CRATE.z]; W.rings = [0, 1].map((i) => { const u = ((f - 804) / 22 + i * 0.5) % 1; return { p: gp, r: 0.35 + 0.45 * u, a: (1 - u) * 0.9 * (1 - ramp(f, 822, 830)) }; }); }
      if (f >= 818 && f < 846) { const gp = [PEN.x, 0.02, PEN.z]; W.rings = [0, 1].map((i) => { const u = ((f - 818) / 22 + i * 0.5) % 1; return { p: gp, r: 0.4 + 0.45 * u, a: (1 - u) * 0.9 * (1 - ramp(f, 838, 846)) }; }); }
      break;
    }
    case 'fix': W.battery = { pos: add(SLEEPPOS, [-0.06, 0.5, 0.06]), level: KF(f, [[854, 0.06], [858, 0.06], [905, 1]]), s: 0.85, charge: f < 906, glow: f < 906 ? 1 : 1 + 0.6 * (1 - ramp(f, 906, 930)) }; break;
    case 'outro': W.battery = { pos: [-0.12, 0.84, 0.02], level: 1, s: 0.7 * M.back(ramp(f, 972, 981)) }; break;
  }
  const L = lightAt(f); if (L.lamp !== undefined) { W.lamp = L.lamp; W.lampCol = toHex(lerp3(hex('#fff0c8'), hex('#a88a5a'), ramp(f, 838, 856))); }
  return W;
};

// ---------- the 2D trainer ----------
const talkAt = (f) => clamp((VENV[f] || 0) * 1.25);
const armTo = (o, P, hand, off, extra = {}) => { const T = tD(P), S = trainerShoulder(o, 'far'), ang = Math.atan2(T[1] - S[1], T[0] - S[0]), s = 2.08 * 1.05, sy = Math.cos(ang) < 0 ? -1 : 1;
  const Wr = [T[0] - (Math.cos(ang) * off[0] * s - Math.sin(ang) * off[1] * sy * s), T[1] - (Math.sin(ang) * off[0] * s + Math.cos(ang) * off[1] * sy * s)];
  return { to: Wr, hand, bend: 1, rot: ang * 180 / Math.PI, ...extra }; };
const trainerHook = (f) => {
  const hi = idle(f, 3), T = tug(f, [-0.06, MAT, -0.04], hookAmp(f));
  const o = { kneel: 1, expr: f < 56 ? 'oops' : 'laugh', brow: -0.7, talk: talkAt(f) * 0.8, blink: blinkAt(f, 3), look: -0.6, headTilt: hi.headTilt - 5 + 2 * Math.sin(f * 0.8), lean: 4,
    near: { to: [228 + 8 * Math.sin(f * 0.5), 700], hand: 'palm', bend: -1 }, treat: false };
  o.far = armTo(o, REF.hk ? lerp3(T.mouth, add(TEETH(), [-0.025, -0.005, 0.07]), zoomK(f)) : T.mouth, 'treat', [25, -3]);
  return o;
};
const trainerAnkles = (f) => ({ kneel: 0, expr: 'oops', brow: -0.8, talk: talkAt(f) * 0.6, blink: blinkAt(f, 3), look: -0.8, lookY: 0.8, headTilt: -6, lean: -4, far: 'hip', near: { to: [240, 560], hand: 'palm', bend: -1 } });
const trainerOutro = (f) => { const hi = idle(f, 3);
  return { kneel: 1, expr: f < 986 ? 'talk' : 'grin', talk: talkAt(f) * 0.9, blink: blinkAt(f, 3), look: 0.0, headTilt: hi.headTilt + 3, lean: 2,
    near: f < 986 ? 'wave' : 'thumb', far: f < 986 ? 'present' : 'thumb' }; };

// ---------- cameras ----------
const CAMS = {
  hook: [{ f: 0, pos: [-0.05, 0.95, 2.75], look: [0.08, 0.6, -0.25], fov: 42 }, { f: 72, pos: [0.0, 0.9, 2.45], look: [0.1, 0.58, -0.25], fov: 41 }],
  tired: [{ f: 73, pos: [1.55, 0.62, 1.15], look: [0.08, 0.56, 0.0], fov: 38 }, { f: 141, pos: [1.35, 0.6, 1.0], look: [0.08, 0.56, 0.0], fov: 37 }],
  wild: [{ f: 303, pos: [1.55, 0.7, 1.5], look: [0.05, 0.5, 0.0], fov: 44 }, { f: 427, pos: [0.7, 0.62, 1.95], look: [0.02, 0.46, 0.0], fov: 44, path: [[1.35, 0.68, 1.8]] }],
  zoom: [{ f: 428, pos: [0.15, 3.3, 2.9], look: [0.0, 0.0, 0.2], fov: 50 }, { f: 454, pos: [-0.1, 3.2, 2.8], look: [-0.1, 0.0, 0.15], fov: 50 }],
  hands: [{ f: 455, pos: [1.05, 1.05, 0.14], look: [0.28, 0.2, 0.0], fov: 50 }, { f: 478, pos: [1.0, 1.02, 0.12], look: [0.3, 0.22, 0.0], fov: 49 }],
  ankles: [{ f: 479, pos: [-0.05, 0.17, 1.15], look: [0.42, 0.24, -0.3], fov: 46 }, { f: 490, pos: [-0.02, 0.17, 1.08], look: [0.42, 0.24, -0.3], fov: 45 }],
  sleeves: [{ f: 491, pos: [1.0, 1.0, 0.25], look: [0.26, 0.24, 0.0], fov: 50 }, { f: 518, pos: [0.96, 0.98, 0.22], look: [0.27, 0.24, 0.0], fov: 48 }],
  play: [{ f: 611, pos: [1.05, 1.02, 0.16], look: [0.26, 0.22, 0.0], fov: 50 }, { f: 694, pos: [0.98, 0.96, 0.14], look: [0.27, 0.22, 0.0], fov: 47 }],
  hour: [{ f: 695, pos: [1.5, 0.66, 1.15], look: [0.06, 0.54, 0.02], fov: 40 }, { f: 745, pos: [1.35, 0.63, 1.02], look: [0.06, 0.53, 0.02], fov: 39 }],
  nap: [{ f: 746, pos: [1.35, 0.63, 1.02], look: [0.06, 0.5, 0.02], fov: 39 }, { f: 778, pos: [1.15, 0.52, 0.88], look: [0.04, 0.38, 0.02], fov: 38 }],
  room: [{ f: 779, pos: [0.85, 1.55, 41.0], look: [0.0, 0.5, 37.5], fov: 54 }, { f: 853, pos: [-0.25, 0.95, 39.15], look: [-0.75, 0.3, 37.6], fov: 50 }],
  fix: [{ f: 854, pos: [CRATE.x + 0.02, 0.88, CRATE.z + 1.75], look: [CRATE.x - 0.18, 0.36, CRATE.z], fov: 42 }, { f: 968, pos: [CRATE.x - 0.02, 0.8, CRATE.z + 1.5], look: [CRATE.x - 0.18, 0.33, CRATE.z], fov: 41 }],
  outro: [{ f: 969, pos: [0.0, 0.95, 2.75], look: [0.14, 0.62, -0.25], fov: 42 }, { f: 1011, pos: [0.04, 0.9, 2.5], look: [0.15, 0.6, -0.25], fov: 41 }],
};
const evePos = (f) => runPos(RUN_EVE, f);
export const camAt = (f) => {
  const S = shotAt(f);
  let c;
  if (S.id === 'evening') { // follows the zooming puppy, sun behind it
    let acc = [0, 0, 0], n = 0; for (let g = f - 8; g <= f + 2; g += 2) { acc = add(acc, evePos(clamp(g, 519, 610))); n++; }
    const tgt = mul(acc, 1 / n);
    c = { pos: KF(f, [[519, [1.2, 0.7, 3.6]], [610, [0.7, 0.6, 2.5]]]), look: [tgt[0] * 0.8, 0.55 + 0.4 * tgt[1], tgt[2] * 0.9], fov: 40, roll: 0 };
  } else c = camFromKeys(CAMS[S.id] || CAMS.hook, f, {});
  if (S.id === 'hook' && f >= 34 && REF.tug) {
    const m = TEETH(), k = M.easeOut(ramp(f, 35, 43)), hold = ramp(f, 43, 72);
    const zp = add(m, [0.46 - 0.05 * hold, 0.2, 0.3 - 0.03 * hold]), zl = add(m, [-0.03, -0.01, 0.05]);
    c = { pos: lerp3(c.pos, zp, k), look: lerp3(c.look, zl, k), fov: lerp(c.fov, 36, k), roll: lerp(c.roll || 0, -4 + 1.5 * Math.sin(f * 0.15), k) };
  }
  if (['hands', 'sleeves', 'play'].includes(S.id)) { c.pos = add(c.pos, [0.006 * Math.sin(f * 0.11), 0.005 * Math.sin(f * 0.07 + 1), 0.006 * Math.sin(f * 0.09 + 2)]); c.roll = (c.roll || 0) + 1.2 * Math.sin(f * 0.05); }
  c.shadowAt = S.id === 'room' || S.id === 'fix' ? [CRATE.x + 0.6, 0.3, CRATE.z + 0.6] : S.id === 'evening' ? [0, 0.2, -1.2] : S.id === 'zoom' ? [0, 0.2, 0.2] : [0.1, 0.2, 0];
  return c;
};
export const dofAt = (f) => {
  const S = shotAt(f), C = camAt(f);
  switch (S.id) {
    case 'hook': return f >= 36 ? { focus: dist(C.pos, TEETH()), cinf: 9, near: 0.25 } : { focus: dist(C.pos, [0.25, 0.32, -0.1]), cinf: 6 };
    case 'tired': case 'hour': case 'nap': return { focus: dist(C.pos, REF.sit.head), cinf: 7, near: 0.4 };
    case 'wild': return { focus: dist(C.pos, [0, 0.35, 0]), cinf: 6, near: 0.4 };
    case 'zoom': return { focus: dist(C.pos, [0, 0.1, 0.2]), cinf: 3 };
    case 'evening': return { focus: dist(C.pos, evePos(f)), cinf: 5, near: 0.3 };
    case 'ankles': return { focus: dist(C.pos, ankleCuff(f)), cinf: 7 };
    case 'room': return { focus: dist(C.pos, [CRATE.x, 0.3, CRATE.z]), cinf: 4, near: 0.3 };
    case 'fix': return { focus: dist(C.pos, add(SLEEPPOS, [-0.1, 0.12, 0])), cinf: 8, near: 0.3 };
    case 'outro': return { focus: dist(C.pos, [0.25, 0.4, -0.2]), cinf: 6 };
  }
  return { focus: dist(C.pos, REF.tug ? REF.tug.head : [0.3, 0.3, 0]), cinf: 6 };
};

// ---------- 2D screen (the sleep chart) ----------
export const screenAt = (f, T) => {
  if (shotAt(f).id !== 'chart') return null;
  const s = { pop: M.back(ramp(f, 142, 151), 1.4), L: 18 * sm(ramp(f, 158, 182)), Lcap: sm(ramp(f, 186, 206)), lab: ramp(f, 158, 168),
    R: 12 * M.back(ramp(f, 258, 282), 1.2), gap: ramp(f, 284, 300), t: f };
  return { key: 'chart' + f, draw: (p) => T.fxSleepChart(p, s) };
};

// ---------- 2D actors + effects ----------
const roundAll = (o) => { const r = {}; for (const k in o) { const v = o[k]; r[k] = typeof v === 'number' ? q(v, 2) : Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? Math.round(x) : x)) : v && typeof v === 'object' ? roundAll(v) : v; } return r; };
const trainerCard = (o, TR) => { const tO = roundAll({ ...o, mirror: true }); return { key: 'tr' + JSON.stringify(tO), draw: (p) => globalThis.__T.trainerDraw(p, tO), x: TR[0], y: TR[1], z: TR[2], s: ST, flip: true, order: 1, ground: MAT, blobW: 0.8 }; };
export const actorsAt = (f, T) => {
  globalThis.__T = T;
  CUR = camAt(f).pos;
  const S = shotAt(f), out = [];
  if (S.id === 'hook') { TCUR = TRN; out.push(trainerCard(trainerHook(f), TRN)); }
  if (S.id === 'ankles') { TCUR = TA; out.push(trainerCard(trainerAnkles(f), TA)); }
  if (S.id === 'outro') { TCUR = TRN; out.push(trainerCard(trainerOutro(f), TRN)); }
  return out;
};
const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 6, ...extra });
/** pop in (back overshoot) at a, fade out over the last 6 frames before b */
const popK = (f, a, b, n = 9) => q(M.back(ramp(f, a, a + n)) * (1 - sm(ramp(f, b - 6, b))), 2);
/** card centred on world point P (icons sit ~1.12*s m above the card origin) */
const at = (P, s) => [P[0], P[1] - 1.12 * s, P[2]];
export const fxAt = (f, T) => {
  CUR = camAt(f).pos;
  const S = shotAt(f), out = [], C = camAt(f), Bc = camBasis(C);
  const hud = (d, u, r) => add(add(C.pos, mul(Bc.fw, d)), add(mul(Bc.up, u), mul(Bc.rt, r)));
  const hearts = (t0, P, n = 3, sc = 0.06) => { for (let i = 0; i < n; i++) { const a = t0 + i * 4, k = ramp(f, a, a + 24); if (k > 0 && k < 1) out.push(FX('ht', (p) => T.fxHeart2(p), at([P[0] + (i - 1) * 0.07, P[1] + k * 0.3, P[2]], sc), sc * M.back(ramp(f, a, a + 7)), { alpha: q(1 - k * k, 2) })); } };
  const bite = (t0, P, s0 = 0.08, n = 14) => { const s = s0 * 1.7; const t = q(ramp(f, t0, t0 + n), 2); if (t > 0 && t < 1) out.push(FX('bt' + t, (p) => T.fxBite(p, t), at(P, s), s, { order: 7 })); };
  const icon = (key, draw, P, s, a, b, extra = {}) => { const k = popK(f, a, b); if (k > 0.02) out.push(FX(key + k, draw, at(P, s * k), s * k, extra)); };
  switch (S.id) {
    case 'hook': {
      const T_ = tug(f, [-0.06, MAT, -0.04], hookAmp(f)); bite(1, add(T_.mouth, [0.02, 0.07, 0.1])); bite(24, add(T_.mouth, [0.03, 0.08, 0.1]));
      for (const [i, t0, sc, dx] of [[0, 43, 0.05, 0.0], [1, 47, 0.03, 0.035]]) { const k = ramp(f, t0, t0 + 10); if (k > 0 && k < 1) { const P = add(TEETH(), [0.012 - 0.01 * i, 0.002 + 0.016 * i, 0.01 + dx * 0.5]), s_ = sc * Math.sin(Math.PI * k) + 0.001;
        out.push(FX('gl' + i + q(k, 2), (p) => T.fxGlint(p, k), at(P, s_), s_, { order: 8, roll: q(0.6 * k, 2) })); } }
      icon('tooth', (p) => T.fxTooth(p), hud(0.3, 0.07, -0.035), 0.036, 40, 73, { roll: q(0.05 * Math.sin(f * 0.3), 2) });
      { const k = popK(f, 49, 73, 7); if (k > 0.02) out.push(FX('nx' + k, (p) => T.fxCross(p, 1), at(hud(0.29, 0.058, -0.022), 0.02 * k), 0.02 * k, { order: 7 })); }
      break;
    }
    case 'wild': {
      const v = f < 355 ? 0.55 + 0.06 * Math.sin(f * 0.4) : f < 366 ? lerp(0.55, 0.16, sm(ramp(f, 355, 364))) : f < 373 ? lerp(0.16, 1.0, M.back(ramp(f, 366, 373), 2.2)) : 0.98 + 0.03 * Math.sin(f * 1.7);
      const hot = f >= 372 ? (f - 372) / 8 : 0, k = popK(f, 337, 428);
      if (k > 0.02) out.push(FX('g' + q(v, 2) + '_' + Math.floor(hot * 8) % 2 + k, (p) => T.fxGauge(p, v, hot), at(hud(1.8, 0.5, 0.17), 0.26 * k), 0.26 * k, { roll: f >= 372 ? q(0.03 * Math.sin(f * 2.1), 2) : 0 }));
      icon('warn', (p) => T.fxWarn(p), hud(1.75, 0.55, -0.2), 0.16, 393, 428, { roll: q(0.1 * Math.sin(f * 0.9), 2) });
      break;
    }
    case 'zoom': for (const l of RUN_ZOOM) if (l.hop) { const t = q(ramp(f, l.b, l.b + 14), 2); if (t > 0 && t < 1) { const P = runPos(RUN_ZOOM, l.b); out.push(FX('d' + t, (p) => T.fxLandDust(p, t), [P[0], 0, P[2]], 0.3)); } } break;
    case 'hands': bite(460, add(tug(f, [0, MAT, 0], 1.1).mouth, [0.0, 0.08, 0.06])); bite(470, add(tug(f, [0, MAT, 0], 1.1).mouth, [0.0, 0.09, 0.08]), 0.07); break;
    case 'ankles': bite(479, add(ankleCuff(f), [-0.04, 0.1, 0.06]), 0.075, 12); break;
    case 'sleeves': bite(493, add(tug(f, [0, MAT, 0], 1.2, 1.1).mouth, [0.02, 0.09, 0.07])); bite(506, add(tug(f, [0, MAT, 0], 1.2, 1.1).mouth, [0.0, 0.09, 0.08]), 0.07); break;
    case 'evening': {
      for (const l of RUN_EVE) if (l.hop) { const t = q(ramp(f, l.b, l.b + 14), 2); if (t > 0 && t < 1) { const P = runPos(RUN_EVE, l.b); out.push(FX('d' + t, (p) => T.fxLandDust(p, t), [P[0], 0, P[2]], 0.32)); } }
      // the clock hangs in the sky, upper part of the frame
      const B = Bc, k = popK(f, 522, 611, 10), P = hud(5.5, 1.35, -0.3);
      const hrs = KF(f, [[519, 15], [580, 19.1]]), wa = sm(ramp(f, 562, 570)) * (0.75 + 0.25 * Math.sin(f * 0.35)), sunK = 1 - ramp(f, 525, 598);
      if (k > 0.02) out.push(FX('clk' + q(hrs, 2) + q(wa, 2) + q(sunK, 2) + k, (p) => T.fxClock(p, hrs, [17, 20], wa, sunK), at(P, 0.62 * k), 0.62 * k, { order: 7 }));
      // bite bursts pop around the clock's red wedge on "worst"
      for (const [i, t0] of [566, 574, 588].entries()) { const t = q(ramp(f, t0, t0 + 18), 2); if (t > 0 && t < 1) out.push(FX('eb' + i + t, (p) => T.fxBite(p, t), at(add(P, add(mul(B.rt, 0.8 + 0.1 * i), mul(B.up, 0.45 - 0.5 * i))), 0.2), 0.2, { order: 8 })); }
      break;
    }
    case 'play': {
      const T_ = tug(f, [0, MAT, 0], 1 + 0.5 * sm(ramp(f, 630, 660)), 1 + 0.35 * sm(ramp(f, 630, 660)));
      icon('stop', (p) => T.fxStop(p), hud(0.9, 0.24, -0.1), 0.1, 616, 664, { roll: q(0.04 * Math.sin(f * 0.2), 2) });
      { const k = popK(f, 666, 695, 7); if (k > 0.02) out.push(FX('px' + k, (p) => T.fxCross(p, 1), at(add(T_.mouth, [0.14, 0.12, 0.06]), 0.09 * k), 0.09 * k, { order: 8, roll: q(0.06 * Math.sin(f * 0.5), 2) })); }
      if (f > 614) bite(614 + 18 * Math.floor((f - 614) / 18), add(T_.mouth, [0.02, 0.09, 0.08]), 0.06);
      break;
    }
    case 'hour': {
      const k = sm(ramp(f, 699, 731)), done = f >= 731 ? 1 : 0, pk = popK(f, 696, 746) * (done ? 1 + 0.12 * Math.sin(Math.PI * ramp(f, 731, 738)) : 1);
      if (pk > 0.02) out.push(FX('sw' + q(k, 2) + done + q(pk, 2), (p) => T.fxStopwatch(p, k, done), at(hud(1.6, 0.42, -0.22), 0.13 * pk), 0.13 * pk, { roll: 0.03 }));
      if (done) { const t = q(ramp(f, 731, 745), 2); out.push(FX('swr' + t, (p) => T.fxPulse(p, t, '#ffd43a'), at(hud(1.6, 0.42, -0.22), 0.17), 0.17, { order: 5 })); }
      break;
    }
    case 'nap': {
      icon('moon', (p) => T.fxMoon(p, f / 30), hud(1.5, 0.45, -0.2), 0.11, 751, 779);
      if (f >= 767) { const t = q(((f - 767) / 40) % 1, 2); out.push(FX('z' + t, (p) => T.fxZzz(p, t), at(add(REF.down.head, [0.0, 0.32, 0.12]), 0.12), 0.12, { alpha: q(ramp(f, 767, 772), 2) })); }
      break;
    }
    case 'room': {
      icon('quiet', (p) => T.fxQuiet(p), hud(2.2, 0.5, -0.25), 0.28, 783, 806);
      icon('okc', (p) => T.fxCheck(p, 1), [CRATE.x, 1.0, CRATE.z + 0.2], 0.3, 807, 853);
      icon('okp', (p) => T.fxCheck(p, 1), [PEN.x, 0.98, PEN.z + 0.2], 0.3, 821, 853);
      { const k = popK(f, 836, 854), d = 1 - 0.85 * sm(ramp(f, 839, 852)); if (k > 0.02) out.push(FX('dim' + q(d, 2) + k, (p) => T.fxDimmer(p, d), at(hud(1.9, 0.48, 0.22), 0.3 * k), 0.3 * k)); }
      if (f >= 840) { const t = q(((f - 840) / 40) % 1, 2); out.push(FX('z' + t, (p) => T.fxZzz(p, t), at(add(SLEEPPOS, [-0.15, 0.5, 0.1]), 0.15), 0.15, { alpha: q(ramp(f, 840, 846), 2) })); }
      break;
    }
    case 'fix': {
      const t = q(((f - 854) / 44) % 1, 2); out.push(FX('z' + t, (p) => T.fxZzz(p, t), at(add(SLEEPPOS, [-0.25, 0.42, 0.12]), 0.1), 0.1, { alpha: 0.8 }));
      if (f >= 905 && f < 925) { const k = ramp(f, 905, 925); out.push(FX('sp' + q(k, 1), (p) => T.fxSpark2(p, 1), at(add(SLEEPPOS, [-0.06, 0.62, 0.06]), 0.09 * M.back(ramp(f, 905, 912))), 0.09 * M.back(ramp(f, 905, 912)), { alpha: q(1 - k * k, 2), order: 7 })); }
      // bite icons appear on "biting", then fade away one by one on "fades ... own"
      for (const [i, [dx, dy, t1]] of [[0.17, 0.26, 922], [-0.3, 0.3, 931], [-0.02, 0.2, 940]].entries()) {
        const P = add(SLEEPPOS, [dx * 1.3, dy + 0.1, 0.3]), a = 912 + i * 3, kin = M.back(ramp(f, a, a + 8)), fade = sm(ramp(f, t1, t1 + 10));
        if (f >= a && fade < 1) out.push(FX('fb' + i + q(kin * (1 - fade), 2), (p) => T.fxBite(p, 0.34), at(P, 0.09 * kin * (1 - 0.6 * fade)), 0.09 * kin * (1 - 0.6 * fade), { alpha: q(1 - fade, 2), order: 7 }));
        if (f >= t1 && f < t1 + 14) { const k = ramp(f, t1, t1 + 14); out.push(FX('fs' + i + q(k, 1), (p) => T.fxSpark2(p, 1), at(P, 0.05 * Math.sin(Math.PI * k)), 0.05 * Math.sin(Math.PI * k) + 0.001, { order: 7 })); }
      }
      break;
    }
    case 'outro': hearts(975, add([-0.02, MAT, 0.02], [0.3, 0.42, 0.05])); hearts(992, add([-0.02, MAT, 0.02], [0.3, 0.42, 0.05]), 3, 0.055); break;
  }
  return out;
};

// captions: one word at a time (web/captions.js); y of the word's centre in px
export const captionY = (f) => (shotAt(f).id === 'chart' ? 560 : 1420);

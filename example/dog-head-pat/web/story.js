// "Stop Patting Your Dog On The Head" — timed to voice.mp3 = audio_head_touch.mp3 (21.71 s) + call_to_action.mp3 (7.89 s), 30 fps, 888 frames.
// Word frames (whisper): Stop 0 patting 11 dog 27 top 42 head 56 | The 85 simpler 103 think 124 | That 149 looming 153 hand 163 triggers 179
// threat 197 flinch 206 coded 228 dog's 253 DNA 265-272 | Looming 300 overhead 308 touch 319 mimics 333 predatory 353 attack 362-384 |
// forcing 398 eyes 412 shut 418 trapping 438 fear 459-466 | Instead 490 | stroke 515 gently 520 beneath 533 chin 551 side 570 chest 584
// unlock 605 true 610 calm 625-635 | CTA (+651): Want 651 routine 669 unbreakable 696 trust 717 stop 736 reactivity 746 dog 774
// Comment 806 Calm 816 Below 835 I'll 856 send 859 guide 871-878.
import { M, camFromKeys, idle, blinkAt, q, clamp, lerp, lerp3, ramp, spline } from './motion.js';
export const FPS = 30, TOTAL = 888, DECK = 0;
export const SHOTS = [
  { id: 'hook', a: 0, b: 84, light: 'day' },
  { id: 'reason', a: 85, b: 148, light: 'day' },
  { id: 'loom', a: 149, b: 226, light: 'blue' },
  { id: 'dna', a: 227, b: 298, light: 'blue' },
  { id: 'hawk', a: 299, b: 396, light: 'storm' },
  { id: 'fear', a: 397, b: 488, light: 'storm' },
  { id: 'stroke', a: 489, b: 600, light: 'warm' },
  { id: 'calm', a: 601, b: 650, light: 'warm' },
  { id: 'cta', a: 651, b: 790, light: 'day' },
  { id: 'sign', a: 791, b: 887, light: 'day' },
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];
const smooth = M.smooth;

// ---------- lights ----------
export const LIGHTS = {
  day: { az: 140, el: 46, sky: '#c4d6f2', ground: '#8a8262', hemi: 1.15, sun: '#fff1dc', sunI: 2.5, fog: '#cadcf0', fogNear: 60, fogFar: 700,
    skyTop: '#3f80d4', skyHor: '#c3daf2', sat: 1.1, vig: 0.2, shadowExt: 7 },
  blue: { az: 200, el: 34, sky: '#6878c0', ground: '#2a3050', hemi: 0.95, sun: '#a8c0ff', sunI: 1.7, fog: '#34447a', fogNear: 25, fogFar: 320,
    skyTop: '#121a46', skyHor: '#3a56a0', sat: 1.04, vig: 0.36, gain: '#d4e0ff', shadowExt: 6 },
  storm: { az: 30, el: 15, sky: '#b07a86', ground: '#4a3040', hemi: 0.95, sun: '#ff9a60', sunI: 2.7, fog: '#a8606a', fogNear: 35, fogFar: 420,
    skyTop: '#33224a', skyHor: '#ee8650', sunDisc: '#ffd2a0', sunSize: 0.003, sat: 1.12, vig: 0.38, gain: '#ffe4dc', shadowExt: 12 },
  warm: { az: 150, el: 16, sky: '#a898c8', ground: '#6a4c40', hemi: 1.05, sun: '#ffbe78', sunI: 2.8, fog: '#f2c094', fogNear: 50, fogFar: 600,
    skyTop: '#6f78c0', skyHor: '#ffc887', sunDisc: '#fff0c8', sunSize: 0.003, sat: 1.12, gain: '#fff2e4', vig: 0.24, shadowExt: 7 },
};
export const lightFor = (S, f) => {
  const L = { ...LIGHTS[S.light] };
  if (S.id === 'hook' || S.id === 'reason') L.shadowExt = S.id === 'reason' ? lerp(14, 7, smooth(ramp(f, 85, 135))) : 6;
  if (S.id === 'calm') L.shadowExt = 8;
  return L;
};

// ---------- staging ----------
const K = 0.00225;
const HUM = [-0.2, 0, 0.06];   // human card (in front so the hand overlaps the dog)
const DOGP = [0.5, 0, 0];      // dog card, flipped: faces the human
const WILD = [60, 0, 0];       // dog in the wild meadow (not flipped)
/** dog design point -> human design point (dog flipped at DOGP, both cards scale 1, same plane) */
const toHum = ([xd, yd]) => [300 + (DOGP[0] - (xd - 300) * K - HUM[0]) / K, yd];
let TDOG = { dogHead: () => [372, 612] };
const crownOf = (o) => { const [hx, hy] = TDOG.dogHead(o); return [hx - 6, hy - 70]; };
const chinOf = (o) => { const [hx, hy] = TDOG.dogHead(o); const a = -(o.chinUp || 0) * 0.38; const dx = 44, dy = 26; return [hx + dx * Math.cos(a) - dy * Math.sin(a), hy + 40 + dx * Math.sin(a) + dy * Math.cos(a)]; };

// ---------- cameras ----------
const CAMS = {
  hook: [
    { f: 0, pos: [0.36, 1.08, 1.55], look: [0.3, 0.95, 0], fov: 36 },
    { f: 22, pos: [0.34, 1.08, 1.7], look: [0.3, 0.95, 0], fov: 36 },
    { f: 64, pos: [0.22, 1.15, 3.7], look: [0.2, 0.95, 0], fov: 40 },
    { f: 84, pos: [0.22, 1.15, 3.55], look: [0.2, 0.95, 0], fov: 40 },
  ],
  reason: [
    { f: 85, pos: [2.4, 4.4, 8.6], look: [0.1, 0.7, -1], fov: 44 },
    { f: 132, pos: [0.85, 1.35, 4.2], look: [0.2, 0.8, 0], fov: 40, path: [[1.9, 2.8, 6.6]] },
    { f: 148, pos: [0.8, 1.3, 4.0], look: [0.2, 0.8, 0], fov: 40 },
  ],
  loom: [
    { f: 149, pos: [0.42, 0.5, 2.15], look: [0.36, 1.25, 0], fov: 46 },
    { f: 206, pos: [0.4, 0.58, 1.7], look: [0.36, 1.1, 0], fov: 44 },
    { f: 226, pos: [0.4, 0.6, 1.6], look: [0.36, 1.05, 0], fov: 43 },
  ],
  dna: [
    { f: 227, pos: [0.62, 0.8, 2.3], look: [0.58, 0.75, 0], fov: 44, ease: 'easeOut' },
    { f: 298, pos: [0.64, 0.8, 2.0], look: [0.58, 0.75, 0], fov: 42 },
  ],
  hawk: [
    { f: 299, pos: [60.9, 0.5, 3.6], look: [59.9, 5.2, -10], fov: 52 },
    { f: 330, pos: [60.85, 0.52, 3.4], look: [60.0, 4.6, -10], fov: 51 },
    { f: 362, pos: [60.7, 0.6, 2.7], look: [60.25, 1.2, 0], fov: 48 },
    { f: 396, pos: [60.6, 0.62, 2.35], look: [60.25, 0.95, 0], fov: 46 },
  ],
  fear: [
    { f: 397, pos: [60.4, 0.62, 2.15], look: [60.15, 0.66, 0], fov: 42 },
    { f: 458, pos: [60.38, 0.62, 1.8], look: [60.15, 0.64, 0], fov: 40 },
    { f: 488, pos: [60.36, 0.62, 1.6], look: [60.15, 0.62, 0], fov: 37, roll: 4.5, ease: 'easeOut' },
  ],
  stroke: [
    { f: 489, pos: [0.22, 0.9, 3.3], look: [0.18, 0.78, 0], fov: 40 },
    { f: 600, pos: [0.26, 0.82, 2.55], look: [0.2, 0.74, 0], fov: 38 },
  ],
  calm: [
    { f: 601, pos: [0.26, 0.82, 2.55], look: [0.2, 0.74, 0], fov: 38 },
    { f: 640, pos: [0.4, 1.55, 4.6], look: [0.2, 0.85, 0], fov: 42, path: [[0.4, 1.1, 3.2]] },
    { f: 650, pos: [0.4, 1.58, 4.75], look: [0.2, 0.86, 0], fov: 42 },
  ],
  cta: [
    { f: 651, pos: [0.15, 0.85, 3.5], look: [0.12, 0.8, 0], fov: 41 },
    { f: 790, pos: [0.15, 0.85, 3.15], look: [0.12, 0.8, 0], fov: 40 },
  ],
  sign: [
    { f: 791, pos: [0.12, 0.85, 3.4], look: [0.08, 0.8, 0], fov: 40 },
    { f: 830, pos: [0.08, 0.88, 3.0], look: [0.05, 0.82, 0], fov: 39 },
    { f: 887, pos: [0.08, 0.88, 2.85], look: [0.05, 0.82, 0], fov: 38 },
  ],
};
const KICKS = [{ f: 14, a: 0.01 }, { f: 30, a: 0.01 }, { f: 44, a: 0.012 }, { f: 58, a: 0.015 }, { f: 206, a: 0.03 }, { f: 362, a: 0.05 }, { f: 459, a: 0.03 }];
export const camAt = (f) => {
  const S = shotAt(f), c = camFromKeys(CAMS[S.id], f, { kicks: KICKS });
  // white flashes on place jumps
  c.flash = f >= 299 && f < 305 ? (1 - (f - 299) / 6) * 0.85 : f >= 489 && f < 495 ? (1 - (f - 489) / 6) * 0.8 : f >= 651 && f < 655 ? (1 - (f - 651) / 4) * 0.4 : 0;
  if (S.id === 'hawk' || S.id === 'fear') c.shadowAt = [60, 0.5, 0];
  else c.shadowAt = [0.2, 0.5, 0];
  return c;
};

// ---------- lens ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const DOGEYE = [DOGP[0] - 0.17, 0.86, 0], WILDEYE = [WILD[0] + 0.17, 0.86, 0];
export const dofAt = (f) => {
  const S = shotAt(f), C = camAt(f);
  switch (S.id) {
    case 'hook': return { focus: dist(C.pos, DOGEYE), cinf: lerp(12, 7, smooth(ramp(f, 22, 64))) };
    case 'reason': return { focus: dist(C.pos, [0.15, 1.0, 0]), cinf: lerp(0, 6, smooth(ramp(f, 100, 140))) };
    case 'loom': return { focus: dist(C.pos, DOGEYE), cinf: 9 };
    case 'dna': return { focus: dist(C.pos, [0.7, 0.86, 0.1]), cinf: 8 };
    case 'hawk': return { focus: f < 340 ? 30 : lerp(30, dist(C.pos, WILDEYE), smooth(ramp(f, 340, 362))), cinf: lerp(3, 8, smooth(ramp(f, 340, 362))) };
    case 'fear': return { focus: dist(C.pos, WILDEYE), cinf: 13 };
    case 'stroke': return { focus: dist(C.pos, [0.2, 0.9, 0]), cinf: 10 };
    case 'calm': return { focus: dist(C.pos, [0.2, 0.9, 0]), cinf: lerp(10, 6, smooth(ramp(f, 601, 640))) };
    case 'cta': return { focus: dist(C.pos, [0.15, 1.0, 0]), cinf: 8 };
    case 'sign': return { focus: dist(C.pos, [0.0, 1.0, 0.1]), cinf: 10 };
  }
  return { focus: 10, cinf: 0 };
};

// ---------- hawk flight ----------
const hawkAt = (f) => {
  if (f < 330) { const t = ramp(f, 299, 330), a = t * 2.2; return { pos: [55 + Math.cos(a) * 3, 18.5 - t * 2, -24 + Math.sin(a) * 3], flap: Math.sin(f * 0.32) * 0.7, claw: 0, screech: f >= 306 && f < 316 ? 1 : 0 }; }
  if (f <= 362) { const t = M.easeIn(ramp(f, 330, 362)) * 0.85 + ramp(f, 330, 362) * 0.15; return { pos: spline([[55 + Math.cos(2.2) * 3, 16.5, -24 + Math.sin(2.2) * 3], [58.4, 9, -10], [59.8, 3.4, -2.2], [60.15, 1.75, 0.25]], t), flap: -0.75, claw: smooth(ramp(f, 344, 358)), screech: f >= 348 && f < 360 ? 1 : 0 }; }
  const t = smooth(ramp(f, 362, 392)); return { pos: spline([[60.15, 1.75, 0.25], [60.6, 2.3, 1.6], [61.8, 4.0, 3.2], [63.5, 6.5, 4.5]], t), flap: Math.sin((f - 362) * 0.5) * 0.9, claw: 1 - t, screech: 0 };
};

// ---------- world state ----------
export const worldAt = (f) => {
  const S = shotAt(f), W = { hawkShadow: null };
  if (S.id === 'hawk' && f < 392) {
    const h = hawkAt(f).pos, y = h[1];
    if (y < 16) W.hawkShadow = { x: h[0] - 0.25 * y, z: h[2] + 0.12 * y, s: 1.3 + y * 0.06, o: 0.55 * clamp(1 - y / 16), r: 0.3 };
  }
  if (S.id === 'fear' && f >= 432 && f <= 468) { const t = ramp(f, 432, 468); W.hawkShadow = { x: lerp(58.6, 61.6, t), z: lerp(-0.6, 0.8, t), s: 2.4, o: 0.6 * Math.sin(t * Math.PI), r: 0.9 }; }
  return W;
};

// ---------- actors ----------
const OWN = { tunic: '#3f8f80', skin: '#f5c9a0', hair: '#4a2f22', pants: '#3b4a6b', shoes: '#f2f2ee', sleeve: '#3f8f80' };
const human = (T, o, pos = HUM, extra = {}) => ({ key: 'own' + JSON.stringify(o), draw: (p) => T.romanFront(p, OWN, o), x: pos[0], y: pos[1], z: pos[2], order: 3, ...extra });
const dog = (T, o, pos = DOGP, extra = {}) => ({ key: 'dog' + JSON.stringify(o), draw: (p) => T.dogDraw(p, o), x: pos[0], y: pos[1], z: pos[2], flip: pos === DOGP, order: 2, ...extra });
const roundAll = (o) => { for (const k in o) if (typeof o[k] === 'number') o[k] = q(o[k], 2); else if (Array.isArray(o[k])) o[k] = o[k].map((v) => Math.round(v)); return o; };
const PATS = [14, 30, 44, 58];
const patLift = (f) => { // hand height above the crown (design units)
  if (f < PATS[0]) return lerp(170, 0, M.easeIn(ramp(f, 0, PATS[0])));
  for (let i = 0; i < PATS.length - 1; i++) if (f < PATS[i + 1]) { const t = ramp(f, PATS[i], PATS[i + 1]); return 85 * Math.sin(Math.PI * t) ** 0.8; }
  return lerp(0, 60, smooth(ramp(f, 64, 80)));
};
const flinchAt = (f) => { let k = 0; for (const c of PATS) { const d = f - c + 2; if (d >= 0 && d < 14) k = Math.max(k, d < 3 ? d / 3 : Math.exp(-(d - 3) / 6)); } return k; };

export const actorsAt = (f, T) => {
  TDOG = T;
  const S = shotAt(f), out = [];
  const tint = S.light === 'warm' ? '#ffe6cc' : S.light === 'blue' ? '#c4d0ff' : S.light === 'storm' ? '#ffd8cc' : '#ffffff';
  const hi = idle(f, 3);
  switch (S.id) {
    case 'hook': {
      const fl = flinchAt(f), patting = f < 66;
      const d = roundAll({ eyes: fl > 0.25 || (f > 8 && f < 64) ? 'squeeze' : 'dot', mouth: fl > 0.2 ? 'tight' : f < 64 ? 'wave' : 'tight', duck: 0.35 + 0.65 * fl, ears: patting ? 0.75 + 0.25 * fl : 0.6,
        brows: 1, tuck: 0.6, wag: 0, tremble: f > 10 && f < 70 ? (f % 2 ? 2 : -2) : 0, look: 0, blink: blinkAt(f, 8), crouch: 0.3 });
      const cr = crownOf(d), [tx, ty] = toHum(cr);
      out.push(dog(T, d, DOGP, { tint }));
      const lift = patLift(f), off = f > 66 ? smooth(ramp(f, 66, 82)) : 0;
      out.push(human(T, roundAll({ expr: 'grin', facing: 1, look: 0.6, R: 'to', toR: [lerp(tx + 4, tx - 30, off), ty - lift - 8], bendR: -0.6, blink: blinkAt(f, 3), headTilt: hi.headTilt + 2 * Math.sin(f * 0.4), bob: hi.bob }), HUM, { tint }));
      break;
    }
    case 'reason': {
      const d = roundAll({ eyes: 'dot', mouth: 'tight', look: -0.6, lookUp: 0.8, chinUp: 0.2 + 0.08 * Math.sin(f * 0.07), ears: 0.35, brows: 0.6, tuck: 0.3, wag: 0, blink: blinkAt(f, 8), crouch: 0.15 });
      out.push(dog(T, d, DOGP, { tint }));
      out.push(human(T, roundAll({ expr: f < 112 ? 'nervous' : 'smile', facing: 1, look: 0.4, L: 'temple', noswirl: true, R: 'hang', bob: -0.42 + hi.bob, headTilt: 6 * Math.sin(f * 0.09), tilt: hi.tilt, blink: blinkAt(f, 3) }), HUM, { tint }));
      break;
    }
    case 'loom': case 'dna': {
      // the giant hand descends on the dog (blue "explanation" light)
      const hit = 206, nearK = S.id === 'loom' ? smooth(ramp(f, 160, hit)) : 1;
      const fl = S.id === 'loom' ? (f >= hit - 1 ? 1 : 0) : 1;
      const d = roundAll({ eyes: fl ? 'squeeze' : 'wide', mouth: fl ? 'tight' : 'wave', lookUp: fl ? 0 : 1, look: 0, duck: fl ? (S.id === 'loom' ? M.back(ramp(f, hit - 1, hit + 5)) : 1) : 0.15 * nearK, ears: fl ? 1 : 0.3 + 0.4 * nearK,
        brows: 1, tuck: fl ? 1 : 0.5, tremble: fl || nearK > 0.5 ? (f % 2 ? 3 : -3) : 0, crouch: fl ? 0.8 : 0.2, sweat: S.id === 'dna' ? 1 : 0, blink: fl ? 0 : blinkAt(f, 8) });
      out.push(dog(T, d, DOGP, { tint }));
      // hand card: fingertips (design y ~ 830) come down to the crown
      const hs = 0.78, crownY = 0.97 - (fl ? 0.12 : 0), handY = (tip) => tip - (975 - 830) * K * hs;
      let tipY;
      if (S.id === 'loom') tipY = lerp(2.55, crownY + 0.04, M.easeIn(ramp(f, 149, hit)) * 0.6 + smooth(ramp(f, 149, hit)) * 0.4);
      else tipY = lerp(crownY + 0.04, 2.9, M.easeIn(ramp(f, 232, 262)));
      if (tipY < 2.85) out.push({ key: 'hand' + q(nearK, 1), draw: (p) => T.handDraw(p, { tint: 0.05 + 0.12 * q(nearK, 1) }), x: DOGP[0] - 0.13, y: handY(tipY), z: 0.14, s: hs, blob: false, order: 4, tint });
      break;
    }
    case 'hawk': case 'fear': {
      const isF = S.id === 'fear', h = hawkAt(Math.min(f, 395));
      const hitK = isF ? 1 : f >= 356 ? M.back(ramp(f, 356, 364)) : 0;
      const shadowDark = isF && f >= 436 && f <= 464 ? Math.sin(ramp(f, 436, 464) * Math.PI) : 0;
      let eyes = hitK > 0.3 ? 'squeeze' : 'wide';
      if (isF) eyes = f < 412 ? 'wide' : f < 418 ? 'squeeze' : 'shut';
      const d = roundAll({ eyes, mouth: hitK > 0.3 || isF ? 'wave' : 'tight', lookUp: hitK > 0.3 || (isF && f >= 412) ? 0 : 1, look: isF ? 0 : -0.3, duck: isF ? 1 : 0.1 + 0.9 * hitK, ears: isF ? 1 : 0.2 + 0.8 * hitK, brows: 1,
        tuck: isF ? 1 : 0.3 + 0.7 * hitK, crouch: isF ? 1 : 0.8 * hitK, tremble: isF || hitK > 0.3 ? (f % 2 ? 3.5 : -3.5) : 0, sweat: isF && f > 428 ? 1 : 0, blink: !isF && hitK < 0.3 ? blinkAt(f, 8) : 0 });
      const dt = shadowDark > 0 ? `rgb(${Math.round(255 - 120 * shadowDark)},${Math.round(216 - 110 * shadowDark)},${Math.round(204 - 80 * shadowDark)})` : tint;
      out.push(dog(T, d, WILD, { tint: dt, flip: false }));
      if (!isF && f < 392) out.push({ key: 'hawk' + q(h.flap, 1) + q(h.claw, 1) + h.screech, draw: (p) => T.hawkDraw(p, { flap: q(h.flap, 1), claw: q(h.claw, 1), screech: h.screech }), x: h.pos[0], y: h.pos[1] - 1.1, z: h.pos[2], s: 1.25, blob: false, order: 4, tint });
      if (isF) { const a = (f - 397) * 0.05; out.push({ key: 'hawkF' + q(Math.sin(f * 0.3), 1), draw: (p) => T.hawkDraw(p, { flap: q(Math.sin(f * 0.3) * 0.6, 1) }), x: 59.2 + Math.cos(a) * 2.5, y: 3.6 + Math.sin(a * 1.3) * 0.4, z: -7 + Math.sin(a) * 2, s: 1.1, blob: false, order: 1, tint }); }
      break;
    }
    case 'stroke': case 'calm': {
      const calm = S.id === 'calm';
      const cu = calm ? 0.65 : smooth(ramp(f, 515, 551)) * 0.7;
      const ln = calm ? 1 : smooth(ramp(f, 572, 596));
      const happy = calm || f >= 548;
      const d = roundAll({ eyes: happy ? 'happy' : f >= 525 ? 'half' : 'dot', mouth: happy ? 'smile' : 'tight', tongue: f >= 560, chinUp: cu, lean: ln, look: -0.6, ears: lerp(0.45, 0.15, smooth(ramp(f, 515, 560))),
        brows: lerp(0.7, 0, smooth(ramp(f, 500, 545))), tuck: lerp(0.4, 0, smooth(ramp(f, 520, 570))), wag: Math.sin(f * (calm ? 0.75 : 0.35)) * smooth(ramp(f, 575, 610)) * 0.9, crouch: 0.15, blink: happy ? 0 : blinkAt(f, 8) });
      out.push(dog(T, d, DOGP, { tint }));
      // hand: low approach on "Instead", chin strokes, then side of the chest
      const chin = toHum(chinOf(d)), chest = toHum(T.dogHead(d).map((v, i) => v + (i ? 175 : -38)));
      const rest = [430, 760];
      const toChin = smooth(ramp(f, 497, 518)), toChest = smooth(ramp(f, 562, 576));
      const sChin = Math.sin((f - 515) * 0.2) * 16, sChest = Math.sin((f - 575) * 0.17) * 26;
      const tgt = [lerp(lerp(rest[0], chin[0] + sChin, toChin), chest[0], toChest), lerp(lerp(rest[1], chin[1] + 10, toChin), chest[1] + sChest, toChest)];
      out.push(human(T, roundAll({ expr: f > 540 ? 'smile_closed' : 'smile', facing: 1, look: 0.5, R: 'to', toR: tgt, bendR: 0.8, bob: -0.45 + hi.bob, headTilt: 4 + hi.headTilt, blink: blinkAt(f, 3) }), HUM, { tint }));
      break;
    }
    case 'cta': case 'sign': {
      const sg = S.id === 'sign';
      const sq = !sg && f >= 728 && f <= 778, glance = sq ? Math.sin(ramp(f, 728, 778) * Math.PI) : 0;
      const pawK = sg ? Math.max(0, Math.sin(ramp(f, 852, 884) * Math.PI)) : 0;
      const d = roundAll({ eyes: glance > 0.4 ? 'dot' : 'happy', mouth: sg && f > 856 && f < 880 ? 'happy' : 'smile', tongue: true, lean: 0.8, chinUp: 0.25, look: lerp(-0.4, 0.9, glance), ears: lerp(0.15, -0.25, glance),
        wag: Math.sin(f * 0.55) * 0.8, paw: pawK, crouch: 0.15, blink: blinkAt(f, 8) });
      out.push(dog(T, d, DOGP, { tint }));
      if (!sg) {
        const chest = toHum(T.dogHead(d).map((v, i) => v + (i ? 175 : -38)));
        out.push(human(T, roundAll({ expr: f > 705 && f < 730 ? 'grin' : 'smile', facing: 0, look: glance > 0.4 ? -0.6 : 0, R: 'to', toR: [chest[0], chest[1] + 6 * Math.sin(f * 0.15)], bendR: 0.6, bob: -0.42 + hi.bob, headTilt: hi.headTilt, blink: blinkAt(f, 3) }), HUM, { tint }));
        if (sq) { const t = ramp(f, 728, 778); out.push({ key: 'sq' + q((f * 0.25) % 1, 1), draw: (p) => T.squirrelDraw(p, { ph: q((f * 0.25) % 1, 1) }), x: lerp(-3.2, 3.6, t), y: 1.12, z: -6.95, s: 0.9, blob: false, order: 1 }); }
      } else {
        const up = M.back(ramp(f, 800, 812)), dy = lerp(380, 0, up);
        const sx = 300, sy = 433 + 0.62 * 222 + 100; // sign centre for a kneeling human (bob 0.45)
        const glow = f >= 814 ? Math.max(0, 1 - (f - 814) / 22) : 0;
        out.push(human(T, roundAll({ expr: f >= 856 ? 'grin' : 'smile', facing: 0, look: 0, sign: f >= 800 ? 'CALM' : undefined, signDy: dy, signGlow: glow, L: f >= 800 ? 'to' : 'hang', R: f >= 800 ? 'to' : 'hang',
          toL: [sx - 160, sy + dy + 10], toR: [sx + 160, sy + dy + 10], bendL: -0.5, bendR: -0.5, bob: -0.45 + hi.bob, headTilt: hi.headTilt + (f >= 836 && f < 852 ? 6 : 0), blink: blinkAt(f, 3) }), HUM, { tint }));
      }
      break;
    }
  }
  return out;
};

// ---------- 2D effects ----------
const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 6, ...extra });
const burst = (T, t, col) => (p) => { p.g.translate(50, 250); T.fxBurst(p, 0.5 + 0.5 * t, col); };
export const fxAt = (f, T) => {
  const S = shotAt(f), out = [];
  // pat impact ticks
  if (S.id === 'hook') for (const c of PATS) if (f >= c && f < c + 8) { const t = q((f - c) / 8, 2); out.push(FX('pb' + t, burst(T, t, '#fff3b0'), [DOGP[0] - 0.15, 0.62, 0.2], 0.32)); }
  if (S.id === 'reason') { const k = M.back(ramp(f, 90, 100)); if (k > 0.02) out.push(FX('q', (p) => T.fxGlyph(p, '?'), [HUM[0] + 0.12, 1.45 + 0.04 * Math.sin(f * 0.15), 0.15], 0.3 * k, { roll: q(0.15 * Math.sin(f * 0.1), 2) })); }
  if (S.id === 'loom' && f >= 206) { const t = q(ramp(f, 206, 222), 2); out.push(FX('fb' + t, burst(T, t, '#ffe24a'), [DOGP[0] - 0.12, 0.45, 0.25], 0.55)); }
  if ((S.id === 'loom' && f >= 208) || (S.id === 'dna' && f < 250)) { const k = M.back(ramp(f, 208, 216)); out.push(FX('ex', (p) => T.fxGlyph(p, '!', '#ffdf4a'), [DOGP[0] + 0.2, 0.62, 0.3], 0.22 * k, { roll: q(0.1 * Math.sin(f * 0.5), 2) })); }
  if (S.id === 'dna') {
    const rise = M.back(ramp(f, 232, 252)), glow = f >= 263 ? Math.max(0.35, 1 - (f - 263) / 25) : 0.35 * smooth(ramp(f, 240, 262));
    out.push(FX('dna' + q((f * 0.11) % 6.283, 2) + q(glow, 1), (p) => T.fxDNA(p, (f * 0.11) % 6.283, q(glow, 1)), [0.92, lerp(-1.0, 0.1, rise), 0.25], 0.6, { order: 1 }));
  }
  if (S.id === 'hawk' && f >= 360 && f < 376) { const t = q(ramp(f, 360, 376), 2); out.push(FX('hb' + t, burst(T, t, '#ffd27a'), [WILD[0] + 0.15, 0.55, 0.3], 0.7)); }
  if (S.id === 'fear' && f >= 456 && f < 474) { const t = q(ramp(f, 456, 474), 2); out.push(FX('fb2' + t, burst(T, t, '#ff8a6a'), [WILD[0] + 0.15, 0.45, 0.2], 0.6, { alpha: 0.85 })); }
  // calm: sparkles on "unlock", hearts on "calm"
  if (S.id === 'calm' || (S.id === 'stroke' && f > 590)) {
    for (let i = 0; i < 3; i++) { const t0 = 603 + i * 4, k = ramp(f, t0, t0 + 18); if (k > 0 && k < 1) { const kk = q(Math.sin(k * Math.PI), 1); out.push(FX('sp' + kk, (p) => T.fxSpark(p, kk), [DOGP[0] - 0.1 + i * 0.18, 0.55 + i * 0.12 + k * 0.1, 0.25], 0.12)); } }
    for (let i = 0; i < 4; i++) { const t0 = 622 + i * 5, k = ramp(f, t0, t0 + 30); if (k > 0) out.push(FX('ht', (p) => T.fxHeart(p), [DOGP[0] - 0.25 + i * 0.16 + 0.05 * Math.sin(f * 0.2 + i), 0.95 + k * 0.9, 0.2], 0.14 * M.back(ramp(f, t0, t0 + 8)) * (1 - 0.3 * k), { alpha: q(1 - k * k, 2) })); }
  }
  if (S.id === 'cta') { const k = ramp(f, 712, 750); if (k > 0 && k < 1) out.push(FX('ht2', (p) => T.fxHeart(p), [0.18, 1.2 + k * 0.5, 0.3], 0.16 * M.back(ramp(f, 712, 720)), { alpha: q(1 - k * k, 2) })); }
  if (S.id === 'sign') {
    if (f >= 814 && f < 840) for (let i = 0; i < 4; i++) { const k = ramp(f, 814 + i * 3, 832 + i * 3); if (k > 0 && k < 1) { const kk = q(Math.sin(k * Math.PI), 1); out.push(FX('sg' + kk, (p) => T.fxSpark(p, kk), [HUM[0] + [-0.3, 0.3, -0.22, 0.26][i], [0.95, 1.0, 0.62, 0.6][i], 0.25], 0.1)); } }
    if (f >= 834) { const b = 0.03 * Math.abs(Math.sin((f - 834) * 0.25)), k = M.back(ramp(f, 834, 842)); out.push(FX('arrow', (p) => T.fxArrow(p), [HUM[0], 0.12 - b, 0.3], 0.11 * k)); }
    if (f >= 856) for (let i = 0; i < 3; i++) { const t0 = 858 + i * 6, k = ramp(f, t0, t0 + 26); if (k > 0) out.push(FX('ht3', (p) => T.fxHeart(p), [DOGP[0] - 0.1 + i * 0.14, 1.0 + k * 0.7, 0.2], 0.12 * M.back(ramp(f, t0, t0 + 8)), { alpha: q(1 - k * k, 2) })); }
  }
  return out;
};

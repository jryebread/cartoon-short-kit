
// ================= THE TRAINER (reusable host character for the dog-training shorts) =================
// An older, bearded dog trainer: red vest with a white collar over a black tee, blue jeans with rolled cuffs,
// red sneakers, a red-and-white cap with a paw badge, a treat pouch on the belt, a whistle on a lanyard and a clicker.
// Drawn in 3/4 view facing screen-RIGHT on the 600x1000 design canvas (soles at y = 975). Flip the card to face left.
// Lives in module scope after toonbase.js (uses Pen, blobPts, headBlob, eye, taper, mul, mix, INK ...).
//
//   trainerDraw(p, opts)
//   opts.expr   'smile' | 'grin' | 'yes' | 'laugh' | 'talk' | 'oops' | 'focus' | 'patient' | 'proud'
//   opts.talk   0..1 mouth open (lip sync on top of expr)        opts.blink 0..1, opts.look -1..1, opts.lookY -1..1
//   opts.kneel  0 standing .. 1 down on one knee                   opts.lean deg (forward, toward the facing side)
//   opts.headTilt deg, opts.bob (design units, + = down), opts.brow (-1 worried .. 1 raised)
//   opts.far / opts.near: arm = preset string ('hang' | 'hip' | 'wave' | 'thumb' | 'signal' | 'present')
//                         or { to: [x, y], hand: 'treat'|'open'|'fist'|'point'|'thumb'|'palm'|'clicker'|'wave'|'give', bend: 1|-1, rot: deg }
//      far arm = the arm on the facing side (drawn behind the torso; the treat hand); near arm is drawn in front.
//   (no nose by design: eyes, bushy brows, moustache and beard carry the face)
//   opts.click 0..1 (clicker button pressed)   opts.treat false hides the treat in a 'treat' hand
//   trainerShoulder(opts, 'far'|'near') -> design point of that shoulder (for reach checks)
export const TRAINER = {
  skin: "#f2c4a0", skinD: "#d99a7c", nose: "#e9a88a",
  beard: "#cfcac2", beardD: "#a29b92", beardL: "#f1eee8", brow: "#dcd7cf", hair: "#bdb7ae",
  vest: "#d8372f", vestD: "#a5241f", white: "#f6f3ec", whiteD: "#d6d1c6", tee: "#2b2e38",
  jeans: "#3d64b0", jeansD: "#2b4a88", cuff: "#7c9ad6", belt: "#5a3a24", buckle: "#e3b54a",
  shoe: "#d8372f", sole: "#f4f1ea", pouch: "#b58a52", pouchD: "#8d6a3c",
  cap: "#d8372f", capD: "#a5241f", capFront: "#f6f3ec", whistle: "#c9cfd6", cord: "#d8372f",
  clicker: "#2f9fb0", clickBtn: "#f39a2b", watch: "#3a3d46", treat: "#c98a46", treatD: "#9a6230",
};
const TR = TRAINER;
const TR_LIGHT = rad(-120);
const v2 = (x, y) => [x, y];
const lerpP = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rot2 = ([x, y], a, [cx, cy]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
const sm01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

/** ink-rimmed tapered limb along a polyline (w0 at start, w1 at end) */
const limb = (p, pts, col, w0, w1, rim = 4.6) => {
  const g = p.g; g.lineCap = "round"; g.lineJoin = "round";
  for (const pass of [0, 1]) for (let i = 0; i < pts.length - 1; i++) {
    const t = i / Math.max(1, pts.length - 2), w = w0 + (w1 - w0) * t;
    g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]);
    g.strokeStyle = pass ? col : INK; g.lineWidth = pass ? w : w + 2 * rim; g.stroke();
  }
};
/** two-bone IK: shoulder s, target t, lengths a, b, bend sign -> elbow */
const ik2 = (s, t, a, b, bend = 1) => {
  const dx = t[0] - s[0], dy = t[1] - s[1], d0 = Math.hypot(dx, dy) || 1, d = Math.min(Math.max(d0, Math.abs(a - b) + 1), a + b - 0.5);
  const ca = (a * a + d * d - b * b) / (2 * a * d), ang = Math.atan2(dy, dx) + bend * Math.acos(Math.max(-1, Math.min(1, ca)));
  const e = [s[0] + Math.cos(ang) * a, s[1] + Math.sin(ang) * a];
  const ux = dx / d0, uy = dy / d0, w = [s[0] + ux * Math.min(d0, a + b - 0.5), s[1] + uy * Math.min(d0, a + b - 0.5)];
  // wrist = elbow + b along (target - elbow)
  const ex = t[0] - e[0], ey = t[1] - e[1], el = Math.hypot(ex, ey) || 1;
  return { e, w: d0 > a + b - 0.5 ? [e[0] + ex / el * b, e[1] + ey / el * b] : t, reach: d0 / (a + b) };
};

/** bone-shaped dog biscuit centred at 0,0 (local units), length L */
const biscuit = (p, L, col = TR.treat, glow = 0) => {
  const g = p.g;
  if (glow > 0) { g.save(); const gr = g.createRadialGradient(0, 0, 2, 0, 0, L * 1.6); gr.addColorStop(0, `rgba(255,236,150,${0.75 * glow})`); gr.addColorStop(1, "rgba(255,236,150,0)"); g.fillStyle = gr; g.fillRect(-L * 2, -L * 2, L * 4, L * 4); g.restore(); }
  const h = L * 0.2, r = L * 0.2, pts = [];
  // outline: shaft + two double knobs per end
  const knob = (cx, cy, a0, a1) => { for (let i = 0; i <= 10; i++) { const a = rad(a0 + (a1 - a0) * i / 10); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  const xe = L / 2 - r * 0.7;
  knob(xe, -h * 0.95, 200, 400); knob(xe, h * 0.95, -40, 160);
  pts.push([-xe + r * 0.6, h * 0.55]);
  knob(-xe, h * 0.95, 20, 220); knob(-xe, -h * 0.95, 140, 340);
  pts.push([xe - r * 0.6, -h * 0.55]);
  p.poly(pts, col, 2.6);
  p.stroke([[-xe + r * 0.9, -h * 0.15], [xe - r * 0.9, -h * 0.25]], 1.6, "#e6b77a");
  for (const [x, y] of [[-L * 0.1, h * 0.25], [L * 0.12, h * 0.1], [0, -h * 0.35]]) p.dot(x, y, 1.3, TR.treatD);
};

/** cartoon hand in local space: origin = wrist, +x = along the forearm. s = size unit. */
const trainerHand = (p, kind, s, o = {}) => {
  const sk = TR.skin, skD = mul(TR.skin, [0.9, 0.8, 0.78]), ow = 2.3 * s;
  const finger = (x0, y0, x1, y1, w = 5.2 * s) => limb(p, [[x0, y0], [x1, y1]], sk, w, w * 0.92, 1.05 * s);
  const palm = (rx = 10 * s, ry = 9 * s, cx = 9 * s, cy = 0) => p.ell(cx, cy, rx, ry, sk, ow);
  switch (kind) {
    case "open": case "wave": {
      for (const [a, l] of [[-34, 15], [-11, 18], [11, 18], [32, 15]]) { const r = rad(a); finger(14 * s, 0, 14 * s + Math.cos(r) * l * s, Math.sin(r) * l * s); }
      palm(); finger(8 * s, 6 * s, 15 * s, 17 * s, 5.6 * s);
      p.arc(10 * s, 0, 4 * s, 3.5 * s, 200, 320, 1.1 * s, skD);
      break;
    }
    case "palm": { // flat hand, fingers together (lie-down signal), palm facing down
      p.poly([[2 * s, -8 * s], [30 * s, -7 * s], [35 * s, -3 * s], [34 * s, 3 * s], [28 * s, 6 * s], [3 * s, 8 * s]], sk, ow);
      for (const k of [-3, 0, 3]) p.stroke([[20 * s, k * 1.2 * s], [33 * s, k * 1.1 * s]], 0.9 * s, skD);
      finger(6 * s, -6 * s, 16 * s, -12 * s, 5.4 * s);
      break;
    }
    case "give": { // open palm up, treat lying on it
      p.poly([[2 * s, -7 * s], [26 * s, -9 * s], [33 * s, -6 * s], [31 * s, 4 * s], [4 * s, 8 * s]], sk, ow);
      for (const k of [0, 1, 2]) p.arc((16 + k * 5) * s, -7 * s, 2.4 * s, 2 * s, 180, 360, 1 * s, skD);
      if (o.treat !== false) { p.g.save(); p.g.translate(19 * s, -12 * s); p.g.rotate(-0.1); biscuit(p, 15 * s, TR.treat, o.glow || 0); p.g.restore(); }
      finger(6 * s, -5 * s, 14 * s, -13 * s, 5.4 * s);
      break;
    }
    case "treat": { // pinch: thumb + index hold the biscuit out front
      if (o.treat !== false) { p.g.save(); p.g.translate(25 * s, -3 * s); p.g.rotate(rad(-8)); biscuit(p, 15 * s, TR.treat, o.glow || 0); p.g.restore(); }
      palm(10.5 * s, 9.5 * s, 9 * s, 2 * s);
      for (const k of [0, 1, 2]) p.arc((7 + k * 4.2) * s, 9 * s, 2.6 * s, 2.2 * s, 300, 420, 1.2 * s, skD); // curled fingers
      finger(13 * s, -4 * s, 21 * s, -3 * s, 5.2 * s);   // index
      finger(9 * s, -7 * s, 20 * s, -8 * s, 5.4 * s);    // thumb over the top
      break;
    }
    case "point": {
      palm(9.5 * s, 9 * s, 9 * s, 1 * s);
      finger(14 * s, -3 * s, 31 * s, -4 * s, 5.2 * s);
      for (const k of [0, 1]) p.arc((10 + k * 4) * s, 7 * s, 2.6 * s, 2 * s, 300, 420, 1.2 * s, skD);
      finger(8 * s, -6 * s, 16 * s, -9 * s, 5.4 * s);
      break;
    }
    case "thumb": {
      palm(9.5 * s, 10 * s, 10 * s, 0);
      for (const k of [0, 1, 2]) p.arc(18 * s, (-5 + k * 5) * s, 2.4 * s, 2.4 * s, 270, 450, 1.2 * s, skD);
      finger(6 * s, -6 * s, 6 * s, -20 * s, 6 * s);
      break;
    }
    case "clicker": {
      const k = o.click || 0;
      p.poly(rrect(10 * s, -14 * s, 26 * s, 2 * s, 5 * s), TR.clicker, ow);
      p.ell(18 * s, -9 * s + k * 1.5 * s, 4.2 * s, 2.6 * s - k * s, TR.clickBtn, 1.4 * s);
      palm(9.5 * s, 9 * s, 10 * s, 4 * s);
      finger(12 * s, -1 * s, 19 * s, -10 * s + k * 2 * s, 5.4 * s);  // thumb on the button
      for (const j of [0, 1, 2]) p.arc((8 + j * 4) * s, 11 * s, 2.4 * s, 2 * s, 300, 420, 1.2 * s, skD);
      p.stroke([[4 * s, 6 * s], [-2 * s, 12 * s], [2 * s, 16 * s]], 1.3 * s, "#3c3c44"); // wrist coil
      break;
    }
    default: { // fist
      palm(10 * s, 9.5 * s, 10 * s, 0);
      for (const k of [0, 1, 2]) p.arc(17 * s, (-5 + k * 5) * s, 2.4 * s, 2.4 * s, 270, 450, 1.2 * s, skD);
      finger(7 * s, -6 * s, 15 * s, -8 * s, 5.4 * s);
    }
  }
};

/** red sneaker in local space: origin = ankle, +x = toe direction */
const sneaker = (p, s) => {
  p.poly(rrect(-15 * s, 8 * s, 40 * s, 17 * s, 4.5 * s), TR.sole, 2.4 * s);
  const up = [[-14 * s, 10 * s], [-15 * s, -6 * s], [-4 * s, -10 * s], [12 * s, -6 * s], [30 * s, -1 * s], [40 * s, 5 * s], [39 * s, 10 * s]];
  p.gradFill(up, TR.shoe, TR.vestD, TR_LIGHT); p.poly(up, null, 2.4 * s);
  p.clip(up, () => { p.ell(38 * s, 7 * s, 10 * s, 8 * s, TR.sole, 1.6 * s); p.stroke([[-6 * s, 2 * s], [24 * s, 3 * s]], 2.2 * s, TR.sole); });
  for (let i = 0; i < 3; i++) p.stroke([[(4 + i * 6) * s, (-6 + i * 1.6) * s], [(8 + i * 6) * s, (-1 + i * 1.6) * s]], 1.3 * s, TR.sole);
  p.stroke([[-14 * s, 12.5 * s], [39 * s, 12.5 * s]], 0.9 * s, "#cfc9bd");
};

const trArmPreset = (name, S, side, tcx, hipY, U) => {
  const out = side > 0 ? 1 : -1;
  switch (name) {
    case "hip": return { to: [S[0] + out * 16 * U, hipY - 6 * U], hand: "fist", bend: -out };
    case "wave": return { to: [S[0] + out * 22 * U, S[1] - 62 * U], hand: "wave", bend: out, rot: -70 };
    case "thumb": return { to: [S[0] + out * 34 * U, S[1] + 6 * U], hand: "thumb", bend: 1, rot: -10 };
    case "signal": return { to: [S[0] + 52 * U, S[1] + 26 * U], hand: "palm", bend: 1, rot: 0 };
    case "present": return { to: [S[0] + out * 48 * U, S[1] + 10 * U], hand: "open", bend: 1, rot: -20 };
    default: return { to: [S[0] + out * 3 * U, hipY + 22 * U], hand: "fist", bend: out, rot: 90 };
  }
};

/** body landmarks for a pose (used by the draw and by the story to aim hands) */
const trLayout = (o) => {
  const k = sm01(o.kneel || 0), bob = o.bob || 0;
  const H = { a: 104, b: 98, nTop: 1.9, nBot: 2.25, egg: -0.1, asym: 0.07, rot: rad(-2), noise: 0.006, seed: 41 };
  const U = 2 * H.a / 100;
  const hipY = 684 + 124 * k + bob, cx = 300;
  return { k, H, U, cx, hipY, tcx: cx + 4 * U, tcy: hipY - 92, shoulderY: hipY - 176, lean: rad(o.lean || 0) };
};
export const trainerShoulder = (o = {}, which = "far") => {
  const L = trLayout(o), S = which === "far" ? [L.tcx + 33 * L.U, L.shoulderY - 2] : [L.tcx - 37 * L.U, L.shoulderY + 2];
  return rot2(S, L.lean, [L.cx, L.hipY]);
};

export const trainerDraw = (p, o = {}) => {
  const L = trLayout(o), { k, H, U, cx, hipY, tcx, tcy } = L, g = p.g, light = TR_LIGHT, thick = thickAngle(light), ow = 4.8 * U;
  const lean = L.lean, pivot = [cx, hipY];
  const toBody = (pt) => rot2(pt, -lean, pivot); // world design point -> leaned body frame
  p.rot = null;

  // ---------------- legs ----------------
  // stand vs kneel joints. far leg (screen right) steps forward in the kneel; near leg kneels.
  const legJ = (side) => {
    const stand = side > 0
      ? [[cx + 16 * U, hipY], [cx + 19 * U, 826], [cx + 22 * U, 948]]
      : [[cx - 17 * U, hipY], [cx - 19 * U, 826], [cx - 21 * U, 948]];
    const kneel = side > 0
      ? [[cx + 16 * U, hipY], [cx + 72 * U, 808], [cx + 70 * U, 948]]
      : [[cx - 12 * U, hipY], [cx - 10 * U, 944], [cx - 74 * U, 940]];
    return stand.map((q, i) => lerpP(q, kneel[i], k));
  };
  const drawLeg = (side) => {
    const [h, kn, an] = legJ(side);
    const shade = side > 0 ? mul(TR.jeans, [0.86, 0.86, 0.9]) : TR.jeans;
    limb(p, [h, kn], shade, 23 * U, 20 * U, 2.2 * U);
    limb(p, [kn, an], shade, 20 * U, 18 * U, 2.2 * U);
    // knee patch crease + side seam
    p.stroke([lerpP(h, kn, 0.15), lerpP(h, kn, 0.9)], 1.1 * U, TR.jeansD);
    p.stroke([lerpP(kn, an, 0.1), lerpP(kn, an, 0.7)], 1.1 * U, TR.jeansD);
    p.arc(kn[0], kn[1], 6 * U, 3 * U, 200, 340, 1.1 * U, TR.jeansD);
    // rolled cuff
    const dx = an[0] - kn[0], dy = an[1] - kn[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 11 * U, ny = dx / l * 11 * U;
    const c0 = [an[0] - dx / l * 9 * U, an[1] - dy / l * 9 * U];
    p.poly([[c0[0] + nx, c0[1] + ny], [an[0] + nx, an[1] + ny], [an[0] - nx, an[1] - ny], [c0[0] - nx, c0[1] - ny]], TR.cuff, 1.8 * U);
    // shoe
    g.save(); g.translate(an[0], an[1] + 4 * U);
    if (side < 0 && k > 0.5) { g.rotate(rad(180 - 30 * k)); g.scale(1, -1); g.translate(-8 * U, -4 * U); }
    sneaker(p, U * 0.95); g.restore();
  };
  // far leg first, then near leg (kneeling) — near drawn last among legs
  drawLeg(1); drawLeg(-1);

  // ---------------- upper body (leaned) ----------------
  g.save(); g.translate(cx, hipY); g.rotate(lean); g.translate(-cx, -hipY);
  const T = { a: 43 * U, b: 100, nTop: 2.15, nBot: 2.5, egg: 0.1, asym: 0.05, rot: 0, noise: 0.004, seed: 44 };
  const tp = blobPts(tcx, tcy, T);
  const SF = [tcx + 33 * U, L.shoulderY - 2], SN = [tcx - 37 * U, L.shoulderY + 2];
  const UA = 55 * U, FA = 51 * U;
  const armSpec = (spec, side) => {
    const S = side > 0 ? SF : SN;
    const a = typeof spec === "string" || !spec ? trArmPreset(spec || "hang", S, side, tcx, hipY, U) : { hand: "fist", bend: 1, ...spec, to: toBody(spec.to) };
    const r = ik2(S, a.to, UA, FA, a.bend ?? 1);
    return { ...a, S, E: r.e, W: r.w };
  };
  const farA = armSpec(o.far, 1), nearA = armSpec(o.near, -1);
  const drawArm = (A, behind) => {
    const sleeveEnd = lerpP(A.S, A.E, 0.5);
    limb(p, [A.S, A.E], behind ? mul(TR.skin, [0.93, 0.88, 0.88]) : TR.skin, 15 * U, 13 * U, 2 * U);
    limb(p, [A.E, A.W], behind ? mul(TR.skin, [0.93, 0.88, 0.88]) : TR.skin, 13 * U, 11.5 * U, 2 * U);
    // short black tee sleeve
    const dx = A.E[0] - A.S[0], dy = A.E[1] - A.S[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = 10 * U;
    limb(p, [[A.S[0] - dx / l * 2 * U, A.S[1] - dy / l * 2 * U], sleeveEnd], behind ? mul(TR.tee, [0.85, 0.85, 0.85]) : TR.tee, 18 * U, 16.5 * U, 2 * U);
    p.stroke([[sleeveEnd[0] + nx * w * 0.8, sleeveEnd[1] + ny * w * 0.8], [sleeveEnd[0] - nx * w * 0.8, sleeveEnd[1] - ny * w * 0.8]], 1.3 * U, "#4a4f5e");
    // forearm hair hint + watch on the near wrist
    if (!behind) { const wr = lerpP(A.E, A.W, 0.82); p.ell(wr[0], wr[1], 6 * U, 7 * U, TR.watch, 1.6 * U, 0, 360, Math.atan2(A.W[1] - A.E[1], A.W[0] - A.E[0]) * 180 / Math.PI); p.dot(wr[0], wr[1], 2.2 * U, "#e8eef2"); }
    // hand
    const ang = A.rot !== undefined ? rad(A.rot) : Math.atan2(A.W[1] - A.E[1], A.W[0] - A.E[0]);
    g.save(); g.translate(A.W[0], A.W[1]); g.rotate(ang);
    if (Math.cos(ang) < 0 && A.hand !== "thumb") g.scale(1, -1); // keep thumbs on top when pointing left
    trainerHand(p, A.hand, U * 0.98, { click: o.click, treat: o.treat, glow: o.glow });
    g.restore();
  };

  drawArm(farA, true);

  // torso: black tee under the open neck, red vest
  p.gradFill(tp, TR.vest, TR.vestD, light, 0.3);
  p.clip(tp, () => {
    // white yoke over the shoulders
    p.poly([[tcx - 60 * U, L.shoulderY - 30], [tcx + 60 * U, L.shoulderY - 30], [tcx + 60 * U, L.shoulderY + 10], [tcx + 10 * U, L.shoulderY + 20], [tcx - 60 * U, L.shoulderY + 12]], TR.white, 0);
    p.stroke([[tcx - 60 * U, L.shoulderY + 12], [tcx + 10 * U, L.shoulderY + 20], [tcx + 60 * U, L.shoulderY + 10]], 1.8 * U);
    // zipper (pushed toward the facing side for the 3/4 turn)
    const zx = tcx + 9 * U;
    p.stroke([[zx, L.shoulderY + 16], [zx + 2 * U, hipY - 18]], 2.2 * U, TR.vestD);
    for (let y = L.shoulderY + 24; y < hipY - 24; y += 9) p.stroke([[zx - 2 * U, y], [zx + 3 * U, y + 1]], 0.9 * U, "#7d1a17");
    p.poly(rrect(zx - 3 * U, L.shoulderY + 34, zx + 4 * U, L.shoulderY + 52, 2 * U), TR.whistle, 1.2 * U);
    // pockets with white piping
    for (const [x0, w] of [[tcx - 30 * U, 22 * U], [zx + 7 * U, 17 * U]]) {
      p.poly(rrect(x0, hipY - 76, x0 + w, hipY - 34, 3 * U), TR.vestD, 1.6 * U);
      p.band([[x0 - 1 * U, hipY - 76], [x0 + w + 1 * U, hipY - 74]], TR.white, 3.2 * U, 1 * U);
    }
    // white hem band
    p.poly([[tcx - 60 * U, hipY - 22], [tcx + 60 * U, hipY - 20], [tcx + 60 * U, hipY + 40], [tcx - 60 * U, hipY + 40]], TR.white, 0);
    p.stroke([[tcx - 60 * U, hipY - 22], [tcx + 60 * U, hipY - 20]], 1.8 * U);
    // soft fold lines
    p.stroke(curve([tcx - 26 * U, L.shoulderY + 40], [tcx - 20 * U, L.shoulderY + 90], [tcx - 24 * U, hipY - 84]), 1 * U, TR.vestD);
  });
  p.inkRing(tp, ow, thick);
  // belt + buckle peeking under the hem, treat pouch on the near hip
  p.band([[tcx - 33 * U, hipY + 5], [tcx + 33 * U, hipY + 7]], TR.belt, 5 * U, 1.2 * U);
  p.poly(rrect(tcx + 4 * U, hipY + 0, tcx + 15 * U, hipY + 12, 2 * U), TR.buckle, 1.2 * U);
  {
    const px = tcx - 36 * U, py = hipY + 6;
    const bag = [[px - 15 * U, py], [px + 14 * U, py], [px + 16 * U, py + 34 * U], [px + 10 * U, py + 40 * U], [px - 11 * U, py + 40 * U], [px - 17 * U, py + 33 * U]];
    p.gradFill(bag, TR.pouch, TR.pouchD, light); p.poly(bag, null, 2 * U);
    p.poly([[px - 16 * U, py - 2 * U], [px + 15 * U, py - 2 * U], [px + 14 * U, py + 13 * U], [px, py + 18 * U], [px - 15 * U, py + 13 * U]], mul(TR.pouch, [0.92, 0.9, 0.88]), 2 * U);
    // bone patch
    g.save(); g.translate(px, py + 27 * U); g.rotate(-0.25); biscuit(p, 15 * U, "#f1e6cf"); g.restore();
    p.dot(px, py + 13 * U, 2 * U, TR.buckle);
  }
  // whistle lanyard (behind the beard; the beard covers its top)
  p.stroke([[tcx - 14 * U, L.shoulderY - 6], [tcx - 6 * U, L.shoulderY + 46], [tcx + 6 * U, L.shoulderY - 6]], 1.8 * U, TR.cord);
  g.save(); g.translate(tcx - 6 * U, L.shoulderY + 52); g.rotate(0.3);
  p.poly(rrect(-5 * U, -3 * U, 9 * U, 6 * U, 3 * U), TR.whistle, 1.4 * U); p.ell(-4 * U, 6 * U, 4 * U, 4 * U, TR.whistle, 1.4 * U); p.dot(-4 * U, 6 * U, 1.4 * U, "#7d858e");
  g.restore();

  // ---------------- head ----------------
  const neck = [cx + 8 * U, L.shoulderY - 6];
  const hc = L.shoulderY - 10 - H.b * 0.78, hx = cx + 6 * U;
  g.save(); g.translate(neck[0], neck[1]); g.rotate(rad(o.headTilt || 0)); g.translate(-neck[0], -neck[1]);
  // white collar behind the head
  p.poly([[tcx - 34 * U, L.shoulderY + 6], [tcx - 30 * U, L.shoulderY - 24], [tcx + 28 * U, L.shoulderY - 26], [tcx + 34 * U, L.shoulderY + 8], [tcx, L.shoulderY + 22]], TR.white, 2 * U);
  drawTrainerHead(p, hx, hc, H, U, o);
  g.restore();

  drawArm(nearA, false);
  g.restore();
};

/** head + cap + beard + face, centred at hx, hc */
const drawTrainerHead = (p, hx, hc, H, U, o) => {
  const g = p.g, light = TR_LIGHT, thick = thickAngle(light), ow = 4.8 * U, fx = hx + 10 * U;
  const lid = typeof o.blink === "number" ? o.blink : o.blink ? 1 : 0, look = o.look || 0, lookY = o.lookY || 0;
  const expr = o.expr || "smile", talk = o.talk || 0;
  // ear (back side)
  p.ell(hx - 0.86 * H.a, hc + 4 * U, 11 * U, 15 * U, TR.skin, ow * 0.8);
  p.arc(hx - 0.86 * H.a, hc + 4 * U, 5 * U, 8 * U, 120, 300, 1.4 * U, TR.skinD);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, TR.skin, mul(TR.skin, [0.95, 0.84, 0.82]), light, H.a);
  // gray hair at the back/sides under the cap
  p.clip(hp, () => {
    const hr = [[hx - 1.1 * H.a, hc - 0.55 * H.b], [hx - 0.45 * H.a, hc - 0.5 * H.b], [hx - 0.55 * H.a, hc - 0.05 * H.b], [hx - 0.72 * H.a, hc + 0.18 * H.b], [hx - 1.1 * H.a, hc + 0.25 * H.b]];
    p.poly(hr, TR.hair, 0);
    for (let i = 0; i < 4; i++) p.stroke([[hx - (0.95 - i * 0.07) * H.a, hc - 0.4 * H.b], [hx - (0.9 - i * 0.05) * H.a, hc + 0.05 * H.b]], 1 * U, mul(TR.hair, [0.8, 0.8, 0.8]));
    // soft cheek warmth
    g.save(); g.globalAlpha = 0.22; p.ell(fx + 18 * U, hc + 12 * U, 13 * U, 8 * U, "#ff8f7a", 0); p.ell(fx - 34 * U, hc + 10 * U, 11 * U, 7 * U, "#ff8f7a", 0); g.restore();
  });
  p.inkRing(hp, ow, thick);

  // ---- beard (big, rounded, salt-and-pepper) ----
  const bt = hc + 0.98 * H.b + 24 * U; // beard tip
  const beard = [];
  const cheekL = [hx - 0.8 * H.a, hc + 0.1 * H.b], cheekR = [hx + 0.88 * H.a, hc + 0.3 * H.b];
  const outer = (t) => { // t 0..1 from near cheek round the chin to the far jaw
    const a = rad(170 - 175 * t);
    const rx = H.a * (1.02 + 0.1 * Math.sin(Math.PI * t)), ry = H.b * 0.98 + 28 * U * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.4;
    return [hx + 6 * U + Math.cos(a) * rx * (t < 0.5 ? 0.98 : 0.94), hc + 0.05 * H.b + Math.sin(a) * ry];
  };
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, q = outer(t), wob = 2.2 * U * Math.sin(t * 38);
    beard.push([q[0] + wob * 0.4, q[1] + Math.abs(wob)]);
  }
  // inner edge: under the cheekbones, up around the mouth
  const inner = [cheekR, [fx + 32 * U, hc + 20 * U], [fx + 10 * U, hc + 22 * U], [fx - 16 * U, hc + 20 * U], [fx - 40 * U, hc + 16 * U], cheekL];
  for (const q of inner) beard.push(q);
  p.shadedFill(beard, TR.beard, TR.beardD, light, H.a * 1.1, 0.35);
  p.clip(beard, () => {
    // curly texture
    for (let i = 0; i < 46; i++) {
      const t = (i * 0.618) % 1, r = (i * 0.383) % 1, q = outer(0.06 + 0.88 * t);
      const x = lerpP(q, [fx, hc + 26 * U], 0.18 + 0.7 * r);
      p.arc(x[0], x[1], 4.4 * U, 3.2 * U, 20 + (i % 3) * 30, 200 + (i % 3) * 30, 1.2 * U, i % 3 ? TR.beardL : TR.beardD);
    }
    p.stroke(curve([fx - 6 * U, hc + 50 * U], [fx - 2 * U, bt - 30 * U], [fx - 10 * U, bt - 6 * U]), 1.3 * U, TR.beardD);
  });
  p.inkRing(beard, ow * 0.9, thick);

  // ---- mouth (inside the beard), moustache on top ----
  const mx = fx + 6 * U, my = hc + 37 * U;
  const open = Math.max(talk, expr === "yes" ? 1 : expr === "grin" || expr === "laugh" ? 0.75 : expr === "oops" ? 0.6 : 0);
  if (open > 0.08) {
    const mw = (expr === "oops" ? 9 : 14) * U, mh = (4 + 12 * open) * U;
    if (expr === "oops") p.ell(mx, my + 2 * U, 7 * U, mh * 0.8, "#5a1e28", 2.6 * U);
    else {
      p.poly([[mx - mw, my - 2 * U], [mx + mw, my - 3 * U], ...ellPts(mx, my - 2.5 * U, mw, mh, 0, 180).reverse().slice(0, 0), ...ellPts(mx, my - 2.5 * U, mw, mh, 0, 180)], "#5a1e28", 0);
      p.clip(ellPts(mx, my - 2.5 * U, mw, mh, 0, 180), () => {
        p.poly(rrect(mx - mw, my - 4 * U, mx + mw, my + 2.5 * U, 1 * U), "#ffffff", 0);
        p.ell(mx + 3 * U, my + mh * 0.85, mw * 0.55, mh * 0.42, "#e86e78", 0);
      });
      p.ell(mx, my - 2.5 * U, mw, mh, null, 2.6 * U, 0, 180);
      p.stroke([[mx - mw, my - 2.5 * U], [mx + mw, my - 2.5 * U]], 2.6 * U);
    }
  } else if (expr === "focus") p.stroke([[mx - 8 * U, my], [mx + 8 * U, my - 1 * U]], 2.8 * U);
  else p.arc(mx, my - 5 * U, 11 * U, 6 * U, 20, 160, 2.8 * U);
  // moustache: two soft lobes
  for (const s of [-1, 1]) {
    const m = blobPts(mx + s * 11 * U, hc + 26 * U, { a: 15 * U, b: 7.5 * U, nTop: 2, nBot: 1.6, egg: 0, asym: 0, rot: rad(s * 14), noise: 0.02, seed: 47 + s });
    p.poly(m, s > 0 ? mul(TR.beard, [0.93, 0.93, 0.93]) : TR.beard, 2.4 * U);
    for (let i = 0; i < 3; i++) p.stroke([[mx + s * (5 + i * 6) * U, hc + 23 * U], [mx + s * (7 + i * 6) * U, hc + 31 * U]], 1 * U, TR.beardD);
  }
  // ---- eyes ----
  const kinds = { smile: "dot", grin: "happy", yes: "happy", laugh: "squeeze", talk: "dot", oops: "shock", focus: "lid", patient: "happy", proud: "happy" };
  const ek = kinds[expr] || "dot";
  const eyePos = [[fx - 20 * U, hc + 0 * U, -1, 1], [fx + 16 * U, hc - 1 * U, 1, 0.86]];
  for (const [x, y, side, sc] of eyePos) {
    const kind = lid >= 1 && ek !== "happy" && ek !== "squeeze" ? "dash" : lid > 0 && ek === "dot" ? "lid" : ek;
    g.save(); g.translate(x, y + lookY * 2 * U); g.scale(sc, 1);
    if (kind === "dot") { p.ell(look * 2.5 * U, 0, 4.2 * U, 5.8 * U, INK, 0); p.dot(look * 2.5 * U + 1.4 * U, -2 * U, 1.3 * U, "#ffffff"); }
    else eye(p, kind, 0, 0, U, side, look, TR.skin);
    // lower lid line (age)
    if (kind !== "shock") p.arc(0, 4 * U, 6 * U, 3 * U, 30, 150, 1 * U, TR.skinD);
    g.restore();
  }
  // crow's feet on the outer corner of the near eye
  for (const a of [-20, 0, 20]) p.stroke([[fx - 31 * U, hc + a * 0.12 * U], [fx - 37 * U, hc + a * 0.3 * U]], 1.1 * U, TR.skinD);
  // bushy brows
  const br = (o.brow || 0) + (expr === "oops" ? -1 : expr === "yes" || expr === "grin" ? 0.5 : 0);
  for (const [x, side, sc] of [[fx - 20 * U, -1, 1], [fx + 16 * U, 1, 0.85]]) {
    const y = hc - 15 * U - br * 3 * U, inner = side < 0 ? 1 : -1;
    const bp = [[x - 11 * U * sc, y + 3 * U + (inner < 0 ? 0 : -br * 2 * U)], [x - 4 * U * sc, y - 4 * U], [x + 9 * U * sc, y - 3 * U], [x + 12 * U * sc, y + 2 * U + (inner > 0 ? 0 : -br * 2 * U)], [x, y + 3 * U]];
    p.poly(bp, TR.brow, 2.2 * U);
    p.stroke([[x - 6 * U * sc, y - 1 * U], [x + 6 * U * sc, y - 2 * U]], 1 * U, TR.beardD);
  }
  if (expr === "oops") p.ell(hx + H.a * 0.98, hc - 30 * U, 3.4 * U, 5.5 * U, "#9fd4ff", 1.8 * U);

  // ---- cap ----
  const cut = hc - 0.52 * H.b;
  const capPts = hp.filter(([x, y]) => y < cut + 2).map(([x, y]) => [hx + (x - hx) * 1.05, hc + (y - hc) * 1.06]);
  // order the kept points into a contiguous arc (left -> top -> right)
  capPts.sort((a, b) => Math.atan2(a[1] - hc, a[0] - hx) - Math.atan2(b[1] - hc, b[0] - hx));
  const crown = [[hx - 1.05 * H.a, cut + 2], ...capPts, [hx + 1.05 * H.a, cut + 2]];
  p.shadedFill(crown, TR.cap, TR.capD, light, H.a, 0.35);
  // white front panel (toward the facing side) + paw badge
  p.clip(crown, () => {
    const panel = ellPts(fx + 22 * U, cut + 4 * U, 56 * U, 60 * U, 180, 360);
    p.poly(panel, TR.capFront, 0); p.ell(fx + 22 * U, cut + 4 * U, 56 * U, 60 * U, null, 2 * U, 180, 360);
    const bx = fx + 14 * U, by = cut - 17 * U;
    p.ell(bx, by + 3 * U, 6.5 * U, 5.2 * U, TR.cap, 1.1 * U);
    for (const [dx, dy] of [[-7.5, -4], [-3, -8.5], [3, -8.5], [7.5, -4]]) p.ell(bx + dx * U, by + dy * U, 2.4 * U, 3 * U, TR.cap, 1 * U);
    p.stroke([[hx - 0.3 * H.a, cut - 0.62 * H.b], [hx - 0.55 * H.a, cut]], 1.2 * U, TR.capD);
  });
  p.inkRing(crown, ow * 0.9, thick);
  p.dot(hx + 4 * U, hc - 1.0 * H.b - 4 * U, 4 * U, TR.capD);
  // brim to the facing side
  const brim = [...curve([hx - 0.15 * H.a, cut - 2 * U], [hx + 0.75 * H.a, cut - 5 * U], [hx + 1.38 * H.a, cut + 1 * U], 10), [hx + 1.42 * H.a, cut + 6 * U],
    ...curve([hx + 1.3 * H.a, cut + 9 * U], [hx + 0.7 * H.a, cut + 7 * U], [hx - 0.2 * H.a, cut + 6 * U], 10)];
  p.gradFill(brim, TR.capD, mul(TR.capD, [0.75, 0.75, 0.8]), light); p.poly(brim, null, 2.6 * U);
  p.stroke(curve([hx + 0.1 * H.a, cut + 3 * U], [hx + 0.75 * H.a, cut + 1 * U], [hx + 1.3 * H.a, cut + 4 * U]), 1 * U, mul(TR.capD, [0.7, 0.7, 0.7]));
  // back strap
};

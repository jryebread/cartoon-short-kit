
// ================= ROLL DOG: a rigged collie for trick tutorials =================
// A brown-and-white collie built as a tiny 3D rig, projected onto the 600x1000 design canvas and drawn in the
// flat ink style. The rig can stand, sit, lie down, settle onto a hip, lie on its side, lie belly-up and roll over,
// and its head looks at any 3D point (the treat). Body facing screen-RIGHT; flip the card for left.
//
// Dog space (design units, 1 unit = 0.00225 m at card scale 1): x forward, y up, z toward the camera (dog's LEFT side).
// Origin on the ground under the middle of the body. Projected with a 26 deg camera elevation:
//   screen x = OX + x,  screen y = GY - (y cosE - z sinE)
//
//   dogRoll(p, o)
//   o.rollF / o.rollR  body roll in degrees for the chest / hips. 0 upright, 90 lying on its RIGHT side (belly to camera),
//                      180 on its back, 270 lying on its LEFT side (back to camera), 360 upright again.
//   o.legsF / o.legsR  pose weights { stand, sit, down, flop } (normalised). 'flop' = relaxed legs for side / back.
//   o.look  [x, y, z] point the head looks at (dog space)       o.neck 0..1 how far the neck turns toward it (0.75)
//   o.headTilt deg, o.headDrop design units (head rests lower), o.eyes 'dot'|'happy'|'half'|'shut'|'wide'
//   o.mouth 'smile'|'pant'|'closed'|'chew'|'open', o.chew 0..1, o.blink, o.ears -1 perk .. 1 flat, o.wag rad, o.tail 0 down .. 1 up
//   dogRig(o) -> { nose, head, project(pt) } helper for aiming hands and effects (design canvas coords)
export const DOGC = {
  fur: "#8b5330", furD: "#5d3420", furL: "#b0703f", cream: "#fbf1df", creamD: "#dcc8a8", tan: "#d99a55",
  nose: "#2a1c1e", collar: "#2f9fb0", collarD: "#1f6f7c", tag: "#f3c84a", tongue: "#ee7186", mouth: "#6b2230", pad: "#6a4448", eye: "#2a1a12",
};
const DC = DOGC;
const dLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** ink-rimmed tapered stroke along a polyline */
const dLimb = (p, pts, col, w0, w1, rim = 4.6) => {
  const g = p.g; g.lineCap = "round"; g.lineJoin = "round";
  for (const pass of rim ? [0, 1] : [1]) for (let i = 0; i < pts.length - 1; i++) {
    const t = i / Math.max(1, pts.length - 2), w = w0 + (w1 - w0) * t;
    g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]); g.strokeStyle = pass ? col : INK; g.lineWidth = pass ? w : w + 2 * rim; g.stroke();
  }
};
const DE = rad(33), cE = Math.cos(DE), sE = Math.sin(DE), OX = 280, GY = 962;
const dproj = (v) => [OX + v[0], GY - (v[1] * cE - v[2] * sE)];
const ddepth = (v) => v[2] * cE + v[1] * sE;
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3d = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smoothstepD = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- leg poses (left leg, z>0; the right leg mirrors z). Joints: root, mid, low, paw. h = body height ----------
const SIT_P = rad(38);
const unPitch = (pts) => pts.map(([x, y, z]) => [x * Math.cos(-SIT_P) - y * Math.sin(-SIT_P), x * Math.sin(-SIT_P) + y * Math.cos(-SIT_P), z]);
const POSES = {
  stand: { h: 150, pitch: 0, F: [[82, -24, 22], [84, -84, 24], [87, -128, 24], [94, -136, 24]], H: [[-74, -10, 26], [-50, -72, 28], [-92, -112, 26], [-86, -136, 26]] },
  sit: { h: 96, pitch: SIT_P, F: unPitch([[76, 30, 22], [80, -22, 24], [83, -70, 24], [92, -86, 24]]), H: unPitch([[-56, -54, 34], [-12, -66, 44], [-74, -84, 38], [-30, -88, 34]]) },
  down: { h: 58, pitch: 0, F: [[80, -24, 22], [58, -48, 28], [122, -50, 26], [146, -50, 24]], H: [[-70, -8, 30], [-24, -32, 48], [-104, -46, 40], [-62, -50, 34]] },
  flop: { h: 52, pitch: 0, F: [[82, -24, 20], [100, -70, 30], [116, -104, 30], [134, -114, 28]], H: [[-74, -12, 24], [-58, -70, 32], [-96, -100, 30], [-112, -116, 28]] },
};
const normW = (w) => { const s = Object.values(w || {}).reduce((a, b) => a + b, 0) || 1; const o = {}; for (const k in POSES) o[k] = (w?.[k] || 0) / s; if (!w || !Object.keys(w).length) o.down = 1; return o; };
const blendLeg = (W, part) => { const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (const k in POSES) if (W[k]) POSES[k][part].forEach((q, i) => { out[i] = add3(out[i], mul3(q, W[k])); }); return out; };

/** solve the body transform + key points for a pose */
export const dogRig = (o = {}) => {
  const WF = normW(o.legsF || o.legs), WR = normW(o.legsR || o.legs);
  const hF = Object.keys(POSES).reduce((a, k) => a + POSES[k].h * WF[k], 0), hR = Object.keys(POSES).reduce((a, k) => a + POSES[k].h * WR[k], 0);
  const pitchF = Object.keys(POSES).reduce((a, k) => a + POSES[k].pitch * WF[k], 0), pitchR = Object.keys(POSES).reduce((a, k) => a + POSES[k].pitch * WR[k], 0);
  const pitch = (pitchF + pitchR) / 2 + (hF - hR) / 260 * 0.8 * (1 - (pitchF + pitchR) / 2 / SIT_P);
  const h = (hF + hR) / 2 + (o.lift || 0);
  const thF = rad(o.rollF || 0), thR = rad(o.rollR ?? o.rollF ?? 0);
  const theta = (x) => thR + (thF - thR) * smoothstepD(-55, 55, x);
  const X = (lp) => { // local -> dog space
    const th = theta(lp[0]), c = Math.cos(th), s = Math.sin(th);
    const y1 = lp[1] * c + lp[2] * s, z1 = -lp[1] * s + lp[2] * c;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [lp[0] * cp - y1 * sp, lp[0] * sp + y1 * cp + h, z1];
  };
  // the body rests on the ground: lift so the lowest torso point clears it
  let low = Infinity;
  for (let x = -80; x <= 80; x += 20) for (let a = 0; a < 360; a += 30) { const r = x > 20 ? 56 : 50; const q = X([x, Math.cos(rad(a)) * r, Math.sin(rad(a)) * r * 0.82]); low = Math.min(low, q[1]); }
  const fix = Math.max(0, 4 - low);
  const Xf = (lp) => { const q = X(lp); q[1] += fix; return q; };
  // neck + head
  const neckL = [96, 30, 0], neckB = Xf(neckL);
  const fwdUp = sub3(Xf([150, 70, 0]), neckB);
  const look = o.look || add3(neckB, [200, 40, 30]);
  const toT = sub3(look, neckB);
  const k = o.neck ?? 0.75;
  let nd = norm3(lerp3d(norm3(fwdUp), norm3(toT), k));
  let head = add3(neckB, mul3(nd, 64));
  head[1] -= o.headDrop || 0;
  head[1] = Math.max(head[1], 50);
  const f = norm3(sub3(look, head));
  let up = norm3(sub3([0, 1, 0], mul3(f, f[1])));
  if (Math.abs(f[1]) > 0.98) up = [0, 0, 1];
  const tilt = rad(o.headTilt || 0);
  const s0 = cross3(f, up);
  up = norm3(add3(mul3(up, Math.cos(tilt)), mul3(s0, Math.sin(tilt))));
  const side = cross3(f, up);
  const H = (a, b, c) => add3(head, add3(mul3(f, a), add3(mul3(up, b), mul3(side, c))));
  const nose = H(82, -8, 0);
  return { WF, WR, h, pitch, theta, X: Xf, neckB, head, f, up, side, H, nose, project: dproj, depth: ddepth, noseP: dproj(nose), headP: dproj(head) };
};

export const dogRoll = (p, o = {}) => {
  const R = dogRig(o), g = p.g, light = rad(-120), thick = thickAngle(light), ow = 11, u = 2.3;
  const { X, H } = R;
  const parts = [];
  const push = (depth, fn) => parts.push({ depth, fn });
  g.save(); if (o.tremble) g.translate(o.tremble, 0);

  // ---------------- torso ----------------
  const rTop = (x) => x > 30 ? 56 : x > -30 ? 50 + (x + 30) / 60 * 6 : 50;
  const tuck = (x) => 9 * Math.exp(-(((x + 8) / 34) ** 2));
  const torso = () => {
    const xs = []; for (let x = -72; x <= 72; x += 8) xs.push(x);
    const thAt = (x) => R.theta(x);
    // screen spine + normal
    const sp = xs.map((x) => dproj(X([x, 0, 0])));
    const a0 = dproj(X([-72, 0, 0])), a1 = dproj(X([72, 0, 0]));
    const dx = a1[0] - a0[0], dy = a1[1] - a0[1], l = Math.hypot(dx, dy), nx = dy / l, ny = -dx / l; // screen "up" normal
    const radAt = (x, wdeg) => { // silhouette radius toward screen-up (w=0) or down (w=180); ventral tuck
      const th = thAt(x), phi = rad(wdeg) - DE + th; // local angle of the visible extreme (screen-up = world angle -E)
      return rTop(x) - tuck(x) * Math.max(0, -Math.cos(phi));
    };
    const top = xs.map((x, i) => [sp[i][0] + nx * radAt(x, 0), sp[i][1] + ny * radAt(x, 0)]);
    const bot = xs.map((x, i) => [sp[i][0] - nx * radAt(x, 180), sp[i][1] - ny * radAt(x, 180)]);
    const cap = (c, r, a0d, a1d) => { const out = []; const base = Math.atan2(ny, nx); for (let i = 1; i < 12; i++) { const a = base + rad(a0d + (a1d - a0d) * i / 12); out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return out; };
    const rf = (radAt(72, 0) + radAt(72, 180)) / 2, rr = (radAt(-72, 0) + radAt(-72, 180)) / 2;
    const cf = sp[sp.length - 1], cr = sp[0];
    // clockwise on screen: top (back->front), front cap (top->bottom), bottom (front->back), rear cap
    const outline = [...top, ...cap(cf, rf, 0, 180).map((q) => q), ...bot.slice().reverse(), ...cap(cr, rr, 180, 360)];
    // fix cap direction: cap() sweeps from +normal toward -normal through the front if the spine points right
    const sgn = Math.sign(dx) || 1;
    if (sgn < 0) outline.reverse();
    p.gradFill(outline, DC.fur, DC.furD, light, 0.25);
    p.clip(outline, () => {
      // white belly / chest band: visible local angle phi = w + theta, cream where |phi - 180| < beta
      const band = xs.map((x, j) => {
        const th = thAt(x), beta = rad(x > 40 ? 78 : x > 0 ? 62 : 54);
        let lo = null, hi = null;
        for (let w = 0; w <= 180; w += 3) { // w = screen angle from the top silhouette; world angle = w - E
          let phi = (rad(w) - DE + th) % (2 * Math.PI); if (phi < 0) phi += 2 * Math.PI;
          if (Math.abs(phi - Math.PI) < beta) { const v = Math.cos(rad(w)); lo = lo === null ? v : Math.min(lo, v); hi = hi === null ? v : Math.max(hi, v); }
        }
        if (lo === null) return null;
        const yAt = (v) => { const rr_ = v >= 0 ? radAt(x, 0) : radAt(x, 180); return [sp[j][0] + nx * v * rr_ * 1.04, sp[j][1] + ny * v * rr_ * 1.04]; };
        return { hi: yAt(hi), lo: yAt(lo), j };
      });
      let run = [];
      const flush = () => { if (run.length > 1) { const tops = run.map((b, k) => [b.hi[0], b.hi[1] + (b.hi[1] < sp[b.j][1] + 0 ? 2.4 * Math.sin(b.j * 2.1) : 0)]); p.poly([...tops, ...run.map((b) => b.lo).reverse()], DC.cream, 0); } run = []; };
      for (const b of band) { if (b) run.push(b); else flush(); }
      flush();
      // chest bib wraps the front cap
      const fc = dproj(X([86, -14, 0]));
      p.ell(fc[0] + 10, fc[1], 34, 48, DC.cream, 0, 0, 360, 0);
      // ventral shade crescent + fur strokes along the back
      const vd = sub3(X([0, -1, 0]), X([0, 0, 0])), vs = [vd[0], -(vd[1] * cE - vd[2] * sE)];
      for (let i = 0; i < 7; i++) { const x = -60 + i * 20, b = dproj(X([x, rTop(x) * 0.86, 0])); p.stroke([[b[0] - 6, b[1] + 2], [b[0] + 6, b[1] - 3]], 1.6 * u, DC.furD); }
      g.save(); g.globalAlpha = 0.16; const mid = dproj(X([0, 0, 0])); p.ell(mid[0] + vs[0] * 52, mid[1] + vs[1] * 52, 110, 26, "#3a2030", 0, 0, 360, Math.atan2(dy, dx) * 180 / Math.PI); g.restore();
    });
    p.inkRing(outline, ow, thick);
  };
  push(0, torso);

  // ---------------- legs ----------------
  const legPts = (part, W, sideZ) => blendLeg(W, part).map(([x, y, z], i) => { const pd = o.pedal ? Math.sin(o.pedal + (part === 'F' ? 0 : 1.6) + (sideZ > 0 ? 0 : 2.4)) * 14 * (i / 3) : 0; return X([x + pd, y - Math.abs(pd) * 0.4, z * sideZ]); });
  const drawLeg = (pts3, front, near) => {
    const s = pts3.map(dproj), furC = near ? DC.fur : mul(DC.fur, [0.82, 0.8, 0.82]), crC = near ? DC.cream : DC.creamD;
    const w0 = front ? 30 : 34, w1 = 22;
    const L = (a, b, col, wa, wb) => {
      const gg = p.g; gg.lineCap = "round";
      gg.beginPath(); gg.moveTo(...a); gg.lineTo(...b); gg.strokeStyle = INK; gg.lineWidth = (wa + wb) / 2 + 9; gg.stroke();
      gg.beginPath(); gg.moveTo(...a); gg.lineTo(...b); gg.strokeStyle = col; gg.lineWidth = (wa + wb) / 2; gg.stroke();
    };
    const gg = p.g; gg.lineCap = "round"; gg.lineJoin = "round";
    const segs = [[s[0], s[1], furC, w0], [s[1], s[2], front ? crC : furC, w0 - 6], [s[2], s[3], crC, w1]];
    for (const [a_, b_, , w] of segs) { gg.beginPath(); gg.moveTo(...a_); gg.lineTo(...b_); gg.strokeStyle = INK; gg.lineWidth = w + 9; gg.stroke(); }
    for (const [a_, b_, c_, w] of segs) { gg.beginPath(); gg.moveTo(...a_); gg.lineTo(...b_); gg.strokeStyle = c_; gg.lineWidth = w; gg.stroke(); }
    // paw: oval with toe ticks; show pads if the sole faces the camera
    const pv = sub3(pts3[3], pts3[2]), pa = Math.atan2(dproj(pts3[3])[1] - s[2][1], s[3][0] - s[2][0]) * 180 / Math.PI;
    const pc = [s[3][0] + Math.cos(rad(pa)) * 8, s[3][1] + Math.sin(rad(pa)) * 8];
    p.ell(pc[0], pc[1], 21, 14, crC, 4.6, 0, 360, pa);
    const ca = Math.cos(rad(pa)), sa = Math.sin(rad(pa));
    for (const k of [-1, 0, 1]) { const bx = pc[0] + ca * 12 - sa * k * 8, by = pc[1] + sa * 12 + ca * k * 8; p.stroke([[bx, by], [bx + ca * 7, by + sa * 7]], 2.6); }
    if (ddepth(pv) < -10 && o.pads !== false) { p.ell(pc[0] - ca * 2, pc[1] - sa * 2, 7, 6, DC.pad, 0); }
  };
  const legs = [];
  for (const [part, W, front] of [["F", R.WF, true], ["H", R.WR, false]]) for (const sz of [1, -1]) {
    const pts = legPts(part, W, sz);
    legs.push({ pts, front, depth: (ddepth(pts[0]) + ddepth(pts[1])) / 2 + (front ? 2 : 0) });
  }
  const tDepth = 0;
  for (const L of legs) {
    const near = L.depth > tDepth;
    push(near ? L.depth : -60 + L.depth * 0.1, () => {
      drawLeg(L.pts, L.front, near);
      const rr = ((o.rollR ?? o.rollF ?? 0) % 360 + 360) % 360;
      if (!L.front && near && (rr < 115 || rr > 245)) { // haunch over the hind leg root (not when belly-up)
        const hc = dproj(L.pts[0]), kn = dproj(L.pts[1]);
        const c = dLerp(hc, kn, 0.42);
        const hb = blobPts(c[0], c[1], { a: 46, b: 40, nTop: 2.2, nBot: 2.2, egg: 0.05, asym: 0, rot: Math.atan2(kn[1] - hc[1], kn[0] - hc[0]), noise: 0.01, seed: 62 });
        p.shadedFill(hb, DC.fur, DC.furD, light, 46); p.inkRing(hb, 9, thick);
        p.stroke(curve([c[0] - 24, c[1] - 18], [c[0] + 4, c[1] - 30], [c[0] + 26, c[1] - 12]), 2.4, DC.furD);
        // redraw the lower leg over the haunch
        const s = L.pts.map(dproj), gg = p.g; gg.lineCap = "round";
        for (const [a, b, w] of [[s[1], s[2], 26], [s[2], s[3], 22]]) { gg.beginPath(); gg.moveTo(...a); gg.lineTo(...b); gg.strokeStyle = INK; gg.lineWidth = w + 9; gg.stroke(); }
        for (const [a, b, w, c2] of [[s[1], s[2], 26, DC.fur], [s[2], s[3], 22, DC.cream]]) { gg.beginPath(); gg.moveTo(...a); gg.lineTo(...b); gg.strokeStyle = c2; gg.lineWidth = w; gg.stroke(); }
        const pa = Math.atan2(s[3][1] - s[2][1], s[3][0] - s[2][0]) * 180 / Math.PI, pc = [s[3][0] + Math.cos(rad(pa)) * 8, s[3][1] + Math.sin(rad(pa)) * 8];
        p.ell(pc[0], pc[1], 21, 14, DC.cream, 4.6, 0, 360, pa);
        for (const k of [-1, 0, 1]) { const ca = Math.cos(rad(pa)), sa = Math.sin(rad(pa)), bx = pc[0] + ca * 12 - sa * k * 8, by = pc[1] + sa * 12 + ca * k * 8; p.stroke([[bx, by], [bx + ca * 7, by + sa * 7]], 2.6); }
      }
    });
  }

  // ---------------- tail ----------------
  {
    const wag = o.wag || 0, up = o.tail ?? (R.WR.stand > 0.5 ? 0.7 : 0.15);
    const root = [-112, 14, 0];
    const lift = R.h < 80 ? 0 : 1;
    const ch = [root, [-150, 18 + 40 * up, 0], [-182, 6 + 70 * up - 30 * (1 - up) * lift, 0], [-205, -10 + 85 * up - 50 * (1 - up) * lift, 0]]
      .map(([x, y, z], i) => { const a = wag * i / 3; return [root[0] + (x - root[0]) * Math.cos(a), y, z + (x - root[0]) * -Math.sin(a) * 0.9 + 18 * Math.sin(wag) * i / 3]; });
    const pts3 = ch.map(X);
    const td = ddepth(pts3[2]);
    push(td > 0 ? 5 : -80, () => {
      const s = pts3.map(dproj), crv = [...curve(s[0], s[1], s[2], 8), ...curve(s[2], dLerp(s[2], s[3], 0.5), s[3], 4).slice(1)];
      dLimb(p, crv, DC.fur, 34, 26, 4.6);
      dLimb(p, crv.slice(-5), DC.cream, 26, 14, 0);
      p.stroke(crv.slice(-5).map(([x, y]) => [x, y]), 1, DC.creamD);
    });
  }

  // ---------------- neck + head ----------------
  const headDepth = ddepth(R.head) - ddepth(R.neckB) * 0.2;
  push(headDepth > -30 ? 40 + headDepth * 0.01 : -40, () => drawDogHead(p, R, o, light, thick));

  parts.sort((a, b) => a.depth - b.depth).forEach((q) => q.fn());
  g.restore();
};

const drawDogHead = (p, R, o, light, thick) => {
  const { H, f, up, side } = R, g = p.g;
  const sk = R.head, skP = dproj(sk), r = 54;
  const vis = (n) => ddepth(n); // > 0 faces camera
  // neck: thick fur trunk from the chest to the head, white ruff, collar
  const nb = dproj(R.neckB), hp = dproj(add3(sk, mul3(f, -14)));
  dLimb(p, [nb, dLerp(nb, hp, 0.55), hp], DC.fur, 70, 62, 4.8);
  const ruffC = dLerp(nb, hp, 0.35);
  const nAng = Math.atan2(hp[1] - nb[1], hp[0] - nb[0]);
  p.ell(ruffC[0] + Math.cos(nAng + Math.PI / 2) * 8, ruffC[1] + Math.sin(nAng + Math.PI / 2) * 8, 30, 36, DC.cream, 0, 0, 360, nAng * 180 / Math.PI);
  const cc = dLerp(nb, hp, 0.62), pa = nAng + Math.PI / 2;
  const cA = [cc[0] + Math.cos(pa) * 33, cc[1] + Math.sin(pa) * 33], cB = [cc[0] - Math.cos(pa) * 33, cc[1] - Math.sin(pa) * 33];
  p.band([cA, cc, cB], DC.collar, 13, 3);
  p.ell(cA[0] * 0.75 + cc[0] * 0.25, cA[1] * 0.75 + cc[1] * 0.25 + 12, 9, 10, DC.tag, 3.4);

  // ears: root on the crown, folded tips (semi-prick collie ears)
  const perk = o.ears || 0;
  const ear = (sd) => {
    // flap whose width runs along the head's forward axis, so it reads in profile; tip folds forward (collie)
    const wd = norm3(add3(mul3(f, 0.9), mul3(side, sd * 0.25))), ou = norm3(add3(up, mul3(side, sd * 0.28)));
    const bc = H(-8, 42, sd * 24), P3 = (a, b, c) => add3(bc, add3(mul3(wd, a), add3(mul3(ou, b), mul3(side, sd * c))));
    const pk = Math.max(0, perk), fl = Math.max(0, -perk);
    const root0 = P3(18, 0, 0), root1 = P3(-20, -2, 0), tip = P3(-2 + 4 * pk, 40 + 12 * pk - 8 * fl, 4), fold = P3(16 - 6 * pk, 26 + 8 * pk - 4 * fl, 8);
    return { pts: [root0, tip, fold, root1].map(dproj), d: vis(sub3(bc, sk)) };
  };
  const ears = [ear(1), ear(-1)].sort((a, b) => a.d - b.d);
  const drawEar = (E, front) => {
    const [a, t, fo, b] = E.pts;
    const mid1 = dLerp(b, t, 0.5), mid2 = dLerp(t, a, 0.5);
    const shape = [...curve(b, [mid1[0] - 5, mid1[1] - 3], t, 8), ...curve(t, [mid2[0] + 3, mid2[1] - 2], a, 6).slice(1), ...curve(a, dLerp(a, b, 0.5).map((v, i) => v + (i ? 6 : 0)), b, 5).slice(1, -1)];
    p.shadedFill(shape, front ? DC.fur : mul(DC.fur, [0.82, 0.8, 0.82]), DC.furD, light, 30, 0.3);
    p.inkRing(shape, 8, thick);
    p.clip(shape, () => p.poly([dLerp(b, t, 0.3), dLerp(b, t, 0.75), dLerp(a, t, 0.7), dLerp(a, b, 0.5)], mul(DC.fur, [0.62, 0.5, 0.5]), 0));
    p.poly([t, fo, dLerp(t, a, 0.5)], DC.furL, 3.2);
  };
  drawEar(ears[0], false);

  // muzzle behind the skull when the dog looks away
  const mz0 = H(22, -12, 0), mz1 = H(66, -16, 0);
  const muzzleFront = vis(f) > -0.25;
  const drawMuzzle = () => {
    const a = dproj(mz0), b = dproj(mz1);
    dLimb(p, [a, b], DC.cream, 56, 44, 4.8);
    // nose
    const n = dproj(H(84, -8, 0)), nv = vis(f);
    if (nv > -0.5) {
      const nf = Math.max(0.55, Math.min(1, 0.6 + nv));
      p.ell(n[0], n[1], 15 * nf + 4, 12, DC.nose, 3);
      p.ell(n[0] - 4, n[1] - 4, 5, 3, "#6a5458", 0);
    }
    // mouth along the muzzle underside
    const m0 = dproj(H(78, -28, 0)), m1 = dproj(H(30, -30, side[2] > 0 ? 12 : -12)), mm = dproj(H(54, -34, 0));
    const mo = o.mouth || "smile";
    if (mo === "pant" || mo === "open" || mo === "chew") {
      const open = mo === "chew" ? 0.4 + 0.6 * Math.abs(Math.sin((o.chew || 0) * Math.PI)) : mo === "open" ? 1.2 : 1;
      const lowJ = dproj(H(54, -34 - 20 * open, 0));
      const mp = [m0, lowJ, m1];
      p.poly(curve(m0, lowJ, m1, 12), DC.mouth, 3.6);
      if (mo !== "chew") { const tg = dproj(H(52, -40 - 16 * open, 0)); p.ell(tg[0], tg[1], 13, 17, DC.tongue, 3.2); p.stroke([[tg[0], tg[1] - 10], [tg[0], tg[1] + 8]], 1.5, "#b84a5c"); }
      void mp;
    } else if (mo === "closed") p.stroke([m0, mm, m1], 3.4);
    else p.stroke(curve(m0, dproj(H(50, -40, 0)), m1), 3.6);
  };
  if (!muzzleFront) drawMuzzle();

  // skull
  const skull = blobPts(skP[0], skP[1], { a: r, b: r * 0.96, nTop: 2.1, nBot: 2.2, egg: -0.04, asym: 0, rot: 0, noise: 0.008, seed: 63 });
  p.shadedFill(skull, DC.fur, DC.furD, light, r, 0.4);
  p.clip(skull, () => {
    // white blaze up the forehead + cream cheeks under the muzzle
    const bl = []; for (let t = 10; t <= 95; t += 7) { const a = rad(t); bl.push(H(r * Math.cos(a), r * Math.sin(a) - 4, 0)); }
    const blS = bl.filter((q) => vis(sub3(q, sk)) > -4).map(dproj);
    if (blS.length > 1) dLimb(p, blS, DC.cream, 22, 10, 0);
    const ch = H(26, -30, 0), chS = dproj(ch); if (vis(sub3(ch, sk)) > -10) p.ell(chS[0], chS[1], 34, 24, DC.cream, 0);
  });
  p.inkRing(skull, 10, thick);

  if (muzzleFront) drawMuzzle();
  // eyes + tan brow pips
  const lid = o.blink || 0, ek = o.eyes || "dot";
  for (const sd of [1, -1]) {
    const ep = H(30, 21, sd * 26), nrm = vis(norm3(sub3(ep, sk)));
    if (nrm < 0.08) continue;
    const e = dproj(ep), k = Math.min(1, 0.35 + nrm * 1.2);
    const pip = dproj(H(26, 40, sd * 21));
    p.ell(pip[0], pip[1], 8 * k + 2, 6, DC.tan, 0);
    const kind = lid >= 1 && (ek === "dot" || ek === "wide") ? "shut" : lid > 0 && ek === "dot" ? "half" : ek;
    const tx = (o.lookShift || 0);
    if (kind === "dot") { p.ell(e[0] + tx, e[1], 10.5 * k + 1.5, 14, DC.eye, 0); p.dot(e[0] + tx + 3.5, e[1] - 5, 3.8, "#ffffff"); }
    else if (kind === "wide") { p.ell(e[0], e[1], 12 * k + 2, 14, "#ffffff", 3.2); p.ell(e[0] + tx, e[1], 6 * k + 1, 8, DC.eye, 0); p.dot(e[0] + tx + 2, e[1] - 3, 2.2, "#fff"); }
    else if (kind === "half") { p.ell(e[0] + tx, e[1] + 2, 8.5 * k + 1, 8, DC.eye, 0, 0, 180); p.stroke([[e[0] - 11 * k, e[1] + 1], [e[0] + 11 * k, e[1] + 1]], 4); }
    else if (kind === "happy") p.arc(e[0], e[1] + 5, 10 * k + 1, 8, 200, 340, 4.4);
    else p.arc(e[0], e[1] - 2, 10 * k + 1, 6, 20, 160, 4.4);
  }
  drawEar(ears[1], true);
};
export const dogProject = dproj;

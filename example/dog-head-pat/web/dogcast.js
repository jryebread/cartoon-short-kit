
// ---------------- "Stop patting your dog" cast (our own designs): dog, hawk, giant hand, squirrel + effects ----------------
// All drawn on the 600x1000 design canvas, soles at y = 975, 1 unit = 0.00225 m at card scale 1.
const DOG = { fur: "#e6a65e", furD: "#c07a3a", cream: "#fbecd2", ear: "#a9622d", nose: "#2a1c1e", collar: "#d63a3a", tag: "#f3c84a", tongue: "#ee7186" };
/** dog head centre (design units) for a given pose; used to aim the human's hand at the crown / chin */
export const dogHead = (o = {}) => {
  const { duck = 0, crouch = 0, lean = 0 } = o, dy = crouch * 38;
  return [372 - duck * 30 + lean * 30, 612 + dy + duck * 62];
};
/** sitting dog, 3/4 view facing screen-right. Flip the card for facing left.
 *  opts: eyes ('dot'|'wide'|'squeeze'|'shut'|'happy'|'half'), mouth ('happy'|'smile'|'tight'|'wave'|'bark'), blink, look (-1..1),
 *  lookUp (0..1), duck (0..1 cower), chinUp (0..1), ears (-0.6 perk .. 1 flat back), wag (rad), tuck (tail 0..1),
 *  tongue, tremble (design units jitter), crouch, lean (toward the human), paw (0..1 near front paw raised), sweat */
export const dogDraw = (p, o = {}) => {
  const { eyes = "dot", mouth = "happy", blink = 0, look = 0, lookUp = 0, duck = 0, chinUp = 0, ears = 0, wag = 0, tuck = 0, tongue = false,
    tremble = 0, crouch = 0, lean = 0, paw = 0, sweat = 0, brows = 0, light = rad(-120) } = o;
  const C = { ...DOG, ...(o.col || {}) };
  const thick = thickAngle(light), u = 2.36, ow = 5 * u, dy = crouch * 38;
  p.g.save(); p.g.translate(tremble, 0);
  // body lean rotates the upper body about the hips
  const hip = [250, 900];
  const L = (pt) => lean ? rotAbout(pt, rad(lean * 7), hip) : pt;
  // ---- tail (behind) ----
  const t0 = [190, 905 + dy * 0.4], tw = Math.sin(wag) * (1 - tuck);
  const tail = tuck > 0.5
    ? curve(t0, [170, 955], [235 + 20 * tw, 972])
    : curve(t0, [140 - 10 * tw, 860 - 40 * (1 - tuck)], [118 + 60 * tw, 790 + 140 * tuck]);
  p.line(tail, C.fur, 30);
  p.line(tail.slice(-3), C.cream, 22, false);
  // ---- far front leg ----
  const fl0 = L([368, 805 + dy]);
  p.line([fl0, [376, 955]], mul(C.fur, [0.82, 0.78, 0.8]), 34);
  p.ell(384, 958, 26, 14, mul(C.cream, [0.88, 0.86, 0.88]), ow * 0.8);
  // ---- body ----
  const bc = L([300, 800 + dy]);
  const bp = blobPts(bc[0], bc[1], { a: 84, b: 138 - dy * 0.4, nTop: 2.1, nBot: 2.4, egg: 0.16, asym: 0, rot: 0.32 + lean * 0.12 + duck * 0.06, noise: 0.01, seed: 61 });
  p.gradFill(bp, C.fur, mul(C.fur, [0.7, 0.66, 0.7]), light);
  p.clip(bp, () => {
    p.ell(...L([352, 790 + dy]), 42, 82, C.cream, 0, 0, 360, 18);
    for (let i = 0; i < 5; i++) p.stroke([[...L([360 + i * 2, 740 + dy + i * 22])], [...L([372 + i * 2, 752 + dy + i * 22])]], 1.4 * u, "#e9d3b0");
  });
  p.inkRing(bp, ow, thick);
  // ---- near haunch + hind paw ----
  const hp = blobPts(235, 888 + dy * 0.5, { a: 96, b: 80 - dy * 0.3, nTop: 2.2, nBot: 2.2, egg: 0.05, asym: 0, rot: -0.15, noise: 0.01, seed: 62 });
  p.shadedFill(hp, C.fur, mul(C.fur, [0.8, 0.74, 0.76]), light, 96);
  p.inkRing(hp, ow, thick);
  p.stroke(curve([200, 860 + dy * 0.5], [250, 840 + dy * 0.5], [300, 870 + dy * 0.5]), 1.6 * u, mul(C.fur, [0.7, 0.62, 0.62]));
  p.ell(295, 963, 40, 15, C.cream, ow * 0.8);
  for (const k of [-1, 0, 1]) p.stroke([[302 + k * 11, 954], [302 + k * 11, 962]], 1.4 * u);
  // ---- near front leg (can lift for a paw wave) ----
  const nl0 = L([336, 800 + dy]);
  const pawPt = paw > 0 ? [345 + 70 * paw, 958 - 230 * paw] : [345, 958];
  p.line(curve(nl0, [(nl0[0] + pawPt[0]) / 2 + 10 * paw, (nl0[1] + pawPt[1]) / 2], pawPt), C.fur, 38);
  p.ell(pawPt[0] + 8, pawPt[1] + 2, 29, 16, C.cream, ow * 0.8, 0, 360, -paw * 50);
  for (const k of [-1, 0, 1]) p.stroke([[pawPt[0] + 14 + k * 10, pawPt[1] - 6], [pawPt[0] + 14 + k * 10, pawPt[1] + 4]], 1.4 * u);
  // ---- head ----
  const [hx0, hy0] = dogHead(o), [hx, hy] = L([hx0, hy0]);
  const A = rad(-chinUp * 22 + duck * 10 + lean * 4);
  // collar (under the head)
  const nk = L([352, 700 + dy + duck * 30]);
  p.band([[nk[0] - 52, nk[1] + 10], [nk[0] + 10, nk[1] + 2], [nk[0] + 50, nk[1] - 12]], C.collar, 15, 2.2 * u, "round");
  p.ell(nk[0] + 10, nk[1] + 24, 11, 12, C.tag, 2.2 * u);
  p.rot = [A, hx, hy + 40];
  const earSwing = ears; // 1 = flat back, negative = perked up
  const ear = (side) => { // side -1 far, +1 near; root on the crown, flop hangs down
    const root = side < 0 ? [hx - 26, hy - 50] : [hx - 50, hy - 36];
    const ang = rad(side < 0 ? 18 : 30) + earSwing * rad(62) - (earSwing < 0 ? 0 : 0);
    const len = 92 * (1 - 0.25 * Math.max(0, earSwing)), wd = 34;
    const dir = [Math.sin(-ang) * -1, Math.cos(ang)]; // mostly down, swung backwards by ang
    const dx = -Math.sin(ang), dyy = Math.cos(ang);
    const tip = [root[0] + dx * len, root[1] + dyy * len - (earSwing < 0 ? -earSwing * 120 : 0)];
    const pts = [root, [root[0] + 18, root[1] + 6], [tip[0] + wd * 0.5, tip[1] - 6], [tip[0], tip[1] + 10], [tip[0] - wd * 0.6, tip[1] - 8], [root[0] - 22, root[1] + 14]];
    const sm = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let k = 0; k < 6; k++) sm.push([a[0] + (b[0] - a[0]) * k / 6, a[1] + (b[1] - a[1]) * k / 6]); }
    // smooth by averaging (keeps the ear soft)
    const so = sm.map((q, i) => { const a = sm[(i + sm.length - 2) % sm.length], b = sm[(i + 2) % sm.length]; return [(a[0] + q[0] * 2 + b[0]) / 4, (a[1] + q[1] * 2 + b[1]) / 4]; });
    p.shadedFill(so, side < 0 ? mul(C.ear, [0.85, 0.82, 0.85]) : C.ear, mul(C.ear, [0.72, 0.66, 0.7]), light, 40);
    p.poly(so, null, ow * 0.85);
    return dir;
  };
  ear(-1);
  const H = { a: 82, b: 72, nTop: 1.9, nBot: 2.3, egg: -0.06, asym: 0.05, rot: 0, noise: 0.006, seed: 63 };
  const head = blobPts(hx, hy, H);
  p.shadedFill(head, C.fur, mul(C.fur, [0.82, 0.76, 0.78]), light, 82);
  p.inkRing(head, ow, thick);
  // muzzle + cheek fluff
  const mz = [hx + 64, hy + 24];
  const muz = blobPts(mz[0], mz[1], { a: 56, b: 38, nTop: 2.2, nBot: 2.0, egg: -0.1, asym: 0.06, rot: rad(-6), noise: 0.004, seed: 64 });
  p.shadedFill(muz, C.cream, mul(C.cream, [0.9, 0.86, 0.86]), light, 56, 0.3);
  p.inkRing(muz, ow * 0.85, thick);
  // blaze stripe up the forehead
  p.clip(head, () => p.ell(hx + 30, hy - 40, 12, 40, C.cream, 0, 0, 360, 25));
  // mouth
  const mo = mouth;
  if (mo === "happy" || mo === "bark") {
    const open = mo === "bark" ? 1.4 : 1;
    const mp = [[mz[0] + 44, mz[1] + 14], [mz[0] + 18, mz[1] + 30 + 16 * open], [mz[0] - 18, mz[1] + 26 + 8 * open], [mz[0] - 30, mz[1] + 12]];
    p.poly(curve(mp[0], [mz[0] + 4, mz[1] + 48 * open], mp[3], 14), "#6b2230", 2.6 * u);
    if (tongue || mo === "happy") p.ell(mz[0] + 8, mz[1] + 42 * open, 15, 22, C.tongue, 2.4 * u);
    p.stroke([[mz[0] + 8, mz[1] + 30 * open], [mz[0] + 8, mz[1] + 50 * open]], 1.2 * u, "#b84a5c");
  } else if (mo === "smile") {
    p.stroke(curve([mz[0] + 44, mz[1] + 14], [mz[0] + 10, mz[1] + 36], [mz[0] - 30, mz[1] + 16]), 2.6 * u);
    if (tongue) { p.ell(mz[0] + 4, mz[1] + 40, 13, 18, C.tongue, 2.2 * u); p.stroke(curve([mz[0] + 44, mz[1] + 14], [mz[0] + 10, mz[1] + 36], [mz[0] - 30, mz[1] + 16]), 2.6 * u); }
  } else if (mo === "tight") {
    p.stroke([[mz[0] + 40, mz[1] + 18], [mz[0] + 6, mz[1] + 24], [mz[0] - 26, mz[1] + 18]], 2.6 * u);
  } else if (mo === "wave") {
    const s = []; for (let i = 0; i <= 12; i++) s.push([mz[0] - 26 + i * 5.5, mz[1] + 22 + 3 * Math.sin(i * 1.4)]); p.stroke(s, 2.4 * u);
  }
  // nose
  p.ell(mz[0] + 50, mz[1] - 14, 17, 12, C.nose, 2 * u);
  p.ell(mz[0] + 45, mz[1] - 19, 5, 3, "#6a5458", 0);
  p.stroke([[mz[0] + 50, mz[1] - 2], [mz[0] + 46, mz[1] + 14]], 1.6 * u);
  // eyes
  const lk = look * 4, lu = -lookUp * 5;
  const eyeAt = (x, y, sc, side) => {
    const kind = blink >= 1 && (eyes === "dot" || eyes === "wide" || eyes === "half") ? "dash" : blink > 0 && eyes === "dot" ? "half" : eyes;
    switch (kind) {
      case "dot": p.ell(x + lk, y + lu, 9 * sc, 12 * sc, INK, 0); p.dot(x + lk + 3, y + lu - 4, 2.6 * sc, "#ffffff"); break;
      case "half": p.ell(x + lk, y + 2, 9 * sc, 8 * sc, INK, 0, 0, 180); p.stroke([[x - 12 * sc, y + 2], [x + 12 * sc, y + 2]], 2.4 * u); break;
      case "wide": p.ell(x, y, 15 * sc, 16 * sc, "#ffffff", 2.4 * u); p.dot(x + lk, y + lu, 6 * sc); break;
      case "squeeze": p.stroke([[x + 10 * sc * side, y - 9], [x - 8 * sc * side, y], [x + 10 * sc * side, y + 9]], 3.2 * u); break;
      case "shut": p.arc(x, y + 4, 12 * sc, 7, 190, 350, 3.4 * u); p.stroke([[x - 14 * sc, y - 4], [x - 20 * sc, y - 10]], 1.6 * u); p.stroke([[x + 14 * sc, y - 4], [x + 19 * sc, y - 11]], 1.6 * u); break;
      case "happy": p.arc(x, y + 6, 11 * sc, 8, 200, 340, 3.2 * u); break;
      default: p.stroke([[x - 11 * sc, y], [x + 11 * sc, y]], 3 * u);
    }
  };
  eyeAt(hx + 36, hy - 16, 1, 1);
  eyeAt(hx - 4, hy - 20, 0.82, -1);
  // brows (worried: inner end up)
  for (const [x, y, s] of [[hx + 36, hy - 40, 1], [hx - 4, hy - 43, -1]]) {
    const inner = brows * 9;
    p.stroke([[x - 9 * s, y + (s > 0 ? -inner : 0) + (s < 0 ? -inner : 0) * 0], [x + 9 * s, y + (s > 0 ? inner * 0.2 : -inner)]], 3 * u);
  }
  ear(1);
  p.rot = null;
  if (sweat > 0) for (const [x, y, r] of [[hx + 95, hy - 70, 1], [hx - 70, hy - 40, 0.8]]) {
    const k = sweat; p.poly([[x, y - 22 * r * k], [x + 10 * r, y], [x, y + 10 * r], [x - 10 * r, y]], "#a6dcff", 2 * u);
  }
  if (tremble) for (const s of [-1, 1]) { const x = s < 0 ? 140 : 470, y = 800; for (let k = 0; k < 2; k++) p.arc(x, y + k * 28, 20, 10, s < 0 ? 120 : -60, s < 0 ? 240 : 60, 2.2 * u); }
  p.g.restore();
};

/** giant cartoon hand reaching DOWN (back of the hand toward camera), sleeve running up off the card top.
 *  open 0..1 finger spread; cuff colour = hoodie */
export const handDraw = (p, o = {}) => {
  const { open = 1, sleeve = "#3f8f80", skin = "#f5c9a0", light = rad(-120), tint = 0 } = o;
  const u = 2.36, thick = thickAngle(light);
  // sleeve
  const sl = [[230, -10], [370, -10], [372, 470], [228, 470]];
  p.gradFill(sl, sleeve, mul(sleeve, [0.62, 0.64, 0.72]), light); p.poly(sl, null, 5 * u);
  p.poly(rrect(214, 440, 386, 520, 18), mul(sleeve, [0.85, 0.85, 0.9]), 5 * u);
  for (let i = 0; i < 6; i++) p.stroke([[236 + i * 26, 452], [236 + i * 26, 508]], 1.4 * u, mul(sleeve, [0.6, 0.6, 0.66]));
  // fingers behind the palm
  const fingers = [[-62, 0.95], [-22, 1.08], [18, 1.04], [56, 0.9]];
  for (const [dx, k] of fingers) {
    const sx = 300 + dx * 0.9, sy = 640, ang = rad(dx * 0.45 * open), len = 175 * k;
    const ex = sx + Math.sin(ang) * len, ey = sy + Math.cos(ang) * len;
    p.line([[sx, sy], [(sx + ex) / 2, (sy + ey) / 2 + 6], [ex, ey]], skin, 46);
    p.stroke([[ex - 14, ey - 30], [ex + 14, ey - 30]], 1.6 * u, mul(skin, [0.8, 0.7, 0.7]));
    p.ell(ex, ey - 8, 13, 16, "#fbe6d8", 1.6 * u);
  }
  // palm / back of hand
  const palm = blobPts(300, 600, { a: 108, b: 100, nTop: 2.4, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.01, seed: 71 });
  p.shadedFill(palm, skin, mul(skin, [0.88, 0.76, 0.74]), light, 108);
  p.inkRing(palm, 5 * u, thick);
  for (const [dx] of fingers) p.arc(300 + dx * 0.9, 662, 12, 7, 200, 340, 1.8 * u, mul(skin, [0.75, 0.62, 0.6]));
  // thumb
  p.line(curve([390, 600], [440, 650], [452, 728]), skin, 50);
  p.ell(452, 726, 15, 18, "#fbe6d8", 1.6 * u);
  if (tint > 0) { const g = p.g; g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(20,16,40,${tint})`; g.fillRect(0, 0, 600, 1000); g.restore(); }
};

/** hawk diving at the camera: wings spread (flap -1..1), talons out (claw 0..1), beak open (screech 0..1) */
export const hawkDraw = (p, o = {}) => {
  const { flap = 0, claw = 0, screech = 0, light = rad(-120), sil = false } = o;
  const u = 2.2, thick = thickAngle(light), ow = 5 * u;
  const BR = sil ? "#000" : "#6e4224", BRD = sil ? "#000" : "#4b2a16", CR = sil ? "#000" : "#f3e6c8", RUST = sil ? "#000" : "#b8552b", Y = sil ? "#000" : "#f2bf2f";
  const o_ = sil ? 0 : ow;
  // tail fan
  const tl = [[262, 600], [338, 600], [380, 720], [300, 745], [220, 720]];
  p.poly(tl, RUST, o_);
  if (!sil) for (let i = -2; i <= 2; i++) p.stroke([[300 + i * 8, 610], [300 + i * 34, 735]], 1.4 * u, "#7d3416");
  if (!sil) p.stroke([[226, 712], [300, 734], [374, 712]], 4 * u, "#3a1d0e");
  // wings
  for (const s of [-1, 1]) {
    const sh = [300 + s * 38, 470], tipY = 455 - flap * 150, tip = [300 + s * 292, tipY];
    const lead = curve(sh, [300 + s * 160, 420 - flap * 70], tip, 12);
    const trail = [];
    for (let k = 0; k < 6; k++) { // primaries as fingers on the trailing edge
      const t = k / 5, bx = 300 + s * (292 - t * 120), by = tipY + 30 + t * 50 + flap * 20 * t;
      trail.push([bx, by], [bx - s * 12, by + 34 - t * 10]);
    }
    trail.push([300 + s * 150, 540 + flap * 10], [300 + s * 60, 560]);
    const w = [...lead, ...trail];
    p.poly(w, CR, o_);
    if (!sil) {
      p.clip(w, () => {
        p.band(lead.map(([x, y]) => [x, y + 14]), BR, 30, 0);
        for (let k = 0; k < 6; k++) { const t = k / 5; p.ell(300 + s * (292 - t * 120) - s * 6, tipY + 58 + t * 50, 12, 26, BRD, 0); }
        for (let r = 0; r < 3; r++) p.stroke(curve([300 + s * 70, 500 + r * 16], [300 + s * 170, 470 + r * 18 - flap * 30], [300 + s * 250, tipY + 60 + r * 14]), 2.2 * u, "#9a7a5a");
      });
      p.poly(w, null, ow);
    }
  }
  // body
  const bd = blobPts(300, 520, { a: 58, b: 108, nTop: 2.0, nBot: 2.2, egg: 0.12, asym: 0, rot: 0, noise: 0.005, seed: 72 });
  if (sil) p.poly(bd, "#000", 0);
  else {
    p.shadedFill(bd, CR, mul(CR, [0.85, 0.8, 0.78]), light, 58);
    p.clip(bd, () => { for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) p.ell(300 + c * 22 + (r % 2) * 11, 520 + r * 22, 6, 3.5, "#8a5a32", 0); p.band([[230, 470], [370, 470]], BR, 30, 0); });
    p.inkRing(bd, ow, thick);
  }
  // legs + talons
  if (claw > 0 || sil) for (const s of [-1, 1]) {
    const k = sil ? 0.8 : claw, f0 = [300 + s * 24, 600], f1 = [300 + s * (40 + 30 * k), 640 + 70 * k];
    p.line([f0, f1], Y, 16);
    for (const a of [-50, 0, 50, 180]) {
      const ang = rad(90 + a * s + (a === 180 ? 0 : -25 * (1 - k))), len = a === 180 ? 22 : 36;
      const t = [f1[0] + Math.cos(ang) * len * s, f1[1] + Math.sin(ang) * len];
      p.line([f1, t], Y, 9);
      if (!sil) p.poly([[t[0] - 5, t[1]], [t[0] + 5, t[1]], [t[0] + Math.cos(ang) * 16 * s, t[1] + Math.sin(ang) * 16]], "#1d1a1c", 1.4 * u);
    }
  }
  // head
  const hc = [300, 396];
  const hd = blobPts(hc[0], hc[1], { a: 50, b: 46, nTop: 1.8, nBot: 2.2, egg: -0.1, asym: 0, rot: 0, noise: 0.005, seed: 73 });
  if (sil) { p.poly(hd, "#000", 0); return; }
  p.shadedFill(hd, BR, mul(BR, [0.8, 0.76, 0.78]), light, 50);
  p.clip(hd, () => p.ell(300, 430, 40, 26, CR, 0));
  p.inkRing(hd, ow, thick);
  // eyes: fierce yellow with heavy brow
  for (const s of [-1, 1]) {
    p.ell(300 + s * 24, 388, 13, 12, "#ffd23a", 2 * u);
    p.dot(300 + s * 22, 389, 6);
    p.poly([[300 + s * 6, 384], [300 + s * 44, 366], [300 + s * 42, 378], [300 + s * 8, 392]], BRD, 1.4 * u);
  }
  // beak: yellow cere + dark hooked bill
  p.poly([[288, 398], [312, 398], [310, 410], [290, 410]], Y, 1.8 * u);
  const op = screech * 18;
  p.poly([[287, 408], [313, 408], [304, 438 - op * 0.2], [300, 450 - op * 0.4], [296, 438 - op * 0.2]], "#33302f", 1.8 * u);
  if (op > 1) { p.ell(300, 432, 9, op * 0.6, "#c04050", 1.6 * u); p.poly([[292, 432 + op * 0.5], [308, 432 + op * 0.5], [300, 444 + op]], "#33302f", 1.6 * u); }
};

/** squirrel scampering (facing right), run phase 0..1, drawn small at the bottom of the card */
export const squirrelDraw = (p, o = {}) => {
  const { ph = 0 } = o, u = 2, b = Math.sin(ph * Math.PI * 2);
  const G = "#8a6a55", GD = "#6a4c3a", CR = "#efe0cc";
  const y0 = 900 - Math.abs(b) * 26;
  p.line(curve([230, y0], [130, y0 - 120], [190, y0 - 200]), G, 70);
  p.line(curve([230, y0], [150, y0 - 110], [195, y0 - 190]), mul(G, [1.15, 1.15, 1.15]), 40, false);
  const bd = blobPts(290, y0, { a: 72, b: 46, nTop: 2.2, nBot: 2.2, egg: 0, asym: 0, rot: -0.15, noise: 0.01, seed: 81 });
  p.shadedFill(bd, G, GD, rad(-120), 72); p.poly(bd, null, 5 * u);
  p.ell(305, y0 + 14, 36, 22, CR, 0);
  for (const [x, k] of [[250, 1], [330, -1]]) p.line([[x, y0 + 30], [x + 26 * b * k, 965]], GD, 18);
  p.ell(372, y0 - 36, 42, 36, G, 5 * u);
  p.poly([[352, y0 - 66], [362, y0 - 104], [376, y0 - 70]], GD, 4 * u);
  p.dot(388, y0 - 44, 7); p.dot(412, y0 - 30, 5, "#2a1c1e");
};

/** DNA double helix (canvas 600x1000), phase rotates it, glow 0..1 */
export const fxDNA = (p, ph = 0, glow = 0) => {
  const g = p.g, rungs = 15, top = 120, bot = 900, A = 120;
  if (glow > 0) { g.save(); const gr = g.createRadialGradient(300, 510, 20, 300, 510, 420); gr.addColorStop(0, `rgba(140,230,255,${0.55 * glow})`); gr.addColorStop(1, "rgba(140,230,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 600, 1000); g.restore(); }
  const S = (k, off) => { const y = top + (bot - top) * k, a = ph + k * Math.PI * 2.4 + off; return [300 + Math.sin(a) * A, y, Math.cos(a)]; };
  const cols = ["#ff6f91", "#ffd166", "#6fe3b4", "#6fb8ff"];
  for (let i = 0; i < rungs; i++) { const k = (i + 0.5) / rungs, a = S(k, 0), b = S(k, Math.PI); p.line([[a[0], a[1]], [b[0], b[1]]], cols[i % 4], 14); }
  for (const off of [0, Math.PI]) {
    const back = [], front = [];
    for (let i = 0; i <= 60; i++) { const s = S(i / 60, off); (s[2] < 0 ? back : front).push(s); }
    const seg = (pts, col) => { let run = []; for (const q of pts) { if (run.length && Math.abs(q[1] - run[run.length - 1][1]) > 20) { if (run.length > 1) p.line(run.map((r) => [r[0], r[1]]), col, 26); run = []; } run.push(q); } if (run.length > 1) p.line(run.map((r) => [r[0], r[1]]), col, 26); };
    seg(back, "#7fb6e6"); seg(front, "#e8f6ff");
  }
};
/** heart (canvas 600x1000, centred at 300,500) */
export const fxHeart = (p, col = "#ff5d7a") => {
  const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([300 + x * 9, 480 - y * 9]); }
  p.poly(pts, col, 12); p.ell(250, 430, 20, 12, "#ffffffaa", 0, 0, 360, -30);
};
/** big ink-outlined glyph ("!", "?") */
export const fxGlyph = (p, ch, col = "#ffffff") => {
  const g = p.g; g.save(); g.font = "900 420px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = 34; g.strokeStyle = INK; g.strokeText(ch, 300, 520); g.fillStyle = col; g.fillText(ch, 300, 520); g.restore();
};
/** four-point sparkle */
export const fxSpark = (p, k = 1, col = "#fff6c2") => {
  const r = 200 * k, w = 40 * k; p.poly([[300, 500 - r], [300 + w, 500 - w], [300 + r, 500], [300 + w, 500 + w], [300, 500 + r], [300 - w, 500 + w], [300 - r, 500], [300 - w, 500 - w]], col, 10);
};
/** hawk ground shadow silhouette (top-down) on a 600x600 canvas */
export const shadowHawk = (g) => {
  g.clearRect(0, 0, 600, 600); g.fillStyle = "rgba(10,6,20,1)"; g.filter = "blur(10px)";
  g.beginPath(); g.ellipse(300, 300, 40, 110, 0, 0, 7); g.fill();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(300 + s * 30, 270); g.quadraticCurveTo(300 + s * 160, 220, 300 + s * 290, 250); g.lineTo(300 + s * 200, 330); g.quadraticCurveTo(300 + s * 120, 330, 300 + s * 30, 340); g.fill(); }
  g.beginPath(); g.moveTo(270, 390); g.lineTo(330, 390); g.lineTo(360, 480); g.lineTo(240, 480); g.fill(); g.filter = "none";
};
/** bouncy down arrow (white with ink rim) */
export const fxArrow = (p) => {
  p.poly([[250, 250], [350, 250], [350, 560], [450, 560], [300, 760], [150, 560], [250, 560]], "#ffffff", 22);
};

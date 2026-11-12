
// ================= tutorial graphics (no text): path trails, check / cross badges, magnet lines, hearts, sparkles =================
// Icons are drawn centred at (300, 500) on the 600x1000 design canvas. Trails / magnet lines take design points
// (use the same card transform as the dog card so they line up with it).

/** dotted path through pts (design coords) drawn up to progress k (0..1) with an arrowhead; col = dot colour */
export const fxTrail = (p, pts, k = 1, col = "#ffffff", glow = "#ffe27a") => {
  if (pts.length < 2 || k <= 0) return;
  // resample by arc length
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1], end = tot * Math.min(1, k);
  const at = (d) => { let i = 1; while (i < L.length - 1 && L[i] < d) i++; const t = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; };
  const g = p.g;
  g.save(); g.globalAlpha = 0.2; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = glow; g.lineWidth = 30;
  g.beginPath(); for (let d = 0; d <= end; d += 6) { const q = at(d); d ? g.lineTo(...q) : g.moveTo(...q); } g.stroke(); g.restore();
  g.save(); g.globalAlpha = 0.9; for (let d = 0; d < end - 30; d += 24) { const q = at(d); p.ell(q[0], q[1], 8, 8, col, 4); } g.restore();
  if (end > 30) {
    const a = at(end), b = at(end - 18), ang = Math.atan2(a[1] - b[1], a[0] - b[0]), c = Math.cos(ang), s = Math.sin(ang);
    p.poly([[a[0] + c * 20, a[1] + s * 20], [a[0] - c * 18 - s * 22, a[1] - s * 18 + c * 22], [a[0] - c * 8, a[1] - s * 8], [a[0] - c * 18 + s * 22, a[1] - s * 18 - c * 22]], col, 5);
  }
};
/** round badge with a check mark (good) */
export const fxCheck = (p, k = 1) => {
  p.ell(300, 500, 150 * k, 150 * k, "#3fbf6a", 16);
  p.ell(300, 500, 118 * k, 118 * k, null, 5);
  const g = p.g; g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const pts = [[230, 505], [285, 560], [380, 440]].map(([x, y]) => [300 + (x - 300) * k, 500 + (y - 500) * k]);
  g.beginPath(); g.moveTo(...pts[0]); g.lineTo(...pts[1]); g.lineTo(...pts[2]); g.strokeStyle = INK; g.lineWidth = 58 * k; g.stroke();
  g.strokeStyle = "#ffffff"; g.lineWidth = 34 * k; g.stroke(); g.restore();
};
/** round badge with a cross (mistake) */
export const fxCross = (p, k = 1) => {
  p.ell(300, 500, 150 * k, 150 * k, "#e2463c", 16);
  p.ell(300, 500, 118 * k, 118 * k, null, 5);
  const g = p.g; g.save(); g.lineCap = "round";
  for (const [a, b] of [[[245, 445], [355, 555]], [[355, 445], [245, 555]]]) {
    const A = [300 + (a[0] - 300) * k, 500 + (a[1] - 500) * k], B = [300 + (b[0] - 300) * k, 500 + (b[1] - 500) * k];
    g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.strokeStyle = INK; g.lineWidth = 58 * k; g.stroke(); g.strokeStyle = "#ffffff"; g.lineWidth = 34 * k; g.stroke();
  }
  g.restore();
};
/** magnet field: curved dashed arcs from a (treat) to b (nose), phase animates the dashes */
export const fxMagnet = (p, a, b, ph = 0, alpha = 1) => {
  const g = p.g; g.save(); g.globalAlpha = alpha; g.lineCap = "round";
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  for (const k of [-1, -0.45, 0.45, 1]) {
    const c = [(a[0] + b[0]) / 2 + nx * k * 46, (a[1] + b[1]) / 2 + ny * k * 46];
    const pts = curve(a, c, b, 16);
    g.setLineDash([10, 9]); g.lineDashOffset = -ph * 38;
    g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q));
    g.strokeStyle = INK; g.lineWidth = 9; g.stroke(); g.strokeStyle = "#7fe0ff"; g.lineWidth = 5; g.stroke();
  }
  g.restore();
};
export const fxHeart2 = (p, col = "#ff5d7a") => {
  const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([300 + x * 9, 480 - y * 9]); }
  p.poly(pts, col, 12); p.ell(250, 430, 20, 12, "#ffffffaa", 0, 0, 360, -30);
};
export const fxSpark2 = (p, k = 1, col = "#fff6c2") => {
  const r = 200 * k, w = 40 * k; p.poly([[300, 500 - r], [300 + w, 500 - w], [300 + r, 500], [300 + w, 500 + w], [300, 500 + r], [300 - w, 500 + w], [300 - r, 500], [300 - w, 500 - w]], col, 10);
};
/** relaxed sigh puff (t 0..1) */
export const fxSigh = (p, t) => {
  const g = p.g; g.save(); g.globalAlpha = Math.max(0, 1 - t * t);
  for (let i = 0; i < 3; i++) { const k = Math.max(0, t * 1.3 - i * 0.12); p.ell(300 + 60 * i + 120 * k, 520 - 30 * i - 60 * k, 70 + 30 * k - 12 * i, 50 + 20 * k - 8 * i, "#ffffff", 9); }
  g.restore();
};
/** highlight ring pulse (t 0..1) */
export const fxPulse = (p, t, col = "#ffe04a") => {
  const g = p.g;
  for (let k = 0; k < 2; k++) { const u = (t + k * 0.5) % 1; g.save(); g.globalAlpha = 1 - u; g.beginPath(); g.ellipse(300, 500, 120 + 140 * u, 80 + 95 * u, 0, 0, Math.PI * 2); g.strokeStyle = INK; g.lineWidth = 22; g.stroke(); g.strokeStyle = col; g.lineWidth = 12; g.stroke(); g.restore(); }
};
/** click ring + ticks (t 0..1) */
export const fxClick = (p, t) => {
  const g = p.g, e = 1 - (1 - t) ** 3; g.save(); g.globalAlpha = 1 - t;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r0 = 80 + 120 * e, r1 = r0 + 70; g.beginPath(); g.moveTo(300 + Math.cos(a) * r0, 500 + Math.sin(a) * r0); g.lineTo(300 + Math.cos(a) * r1, 500 + Math.sin(a) * r1); g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 30; g.stroke(); g.strokeStyle = "#7fe0ff"; g.lineWidth = 16; g.stroke(); }
  g.restore();
};
/** confetti burst (t 0..1) */
export const fxConfetti = (p, t, seed = 1) => {
  const cols = ["#ff5d7a", "#ffd34d", "#4fc3f7", "#7ad36a", "#b07cf0", "#ff8a3d"];
  for (let i = 0; i < 26; i++) {
    const r = Math.sin(i * 91.7 + seed) * 0.5 + 0.5, a = -Math.PI / 2 + (r - 0.5) * 2.4, sp = 300 + 260 * ((i * 0.37) % 1);
    const x = 300 + Math.cos(a) * sp * t, y = 560 + Math.sin(a) * sp * t + 520 * t * t, rot = i + t * 9;
    if (y > 990) continue;
    const g = p.g; g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = Math.min(1, (1 - t) * 3);
    p.poly([[-14, -7], [14, -7], [14, 7], [-14, 7]], cols[i % cols.length], 4); g.restore();
  }
};
/** crumbs flying from a chomp (t 0..1) */
export const fxCrumbs = (p, t) => {
  for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.5, d = 60 + 160 * t, x = 300 + Math.cos(a) * d, y = 500 + Math.sin(a) * d + 300 * t * t; p.ell(x, y, 14 * (1 - t) + 4, 11 * (1 - t) + 3, "#c98a46", 4); }
};

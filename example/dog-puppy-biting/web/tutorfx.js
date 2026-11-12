
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

// ================= "puppy biting" motion graphics (project-local) =================
// All icons centred at (300, 500) on the 600x1000 design canvas, like the ones above.
const RND = '"Arial Rounded MT Bold", "Arial Black", Arial, sans-serif';
const inkText = (g, txt, x, y, size, fill = "#ffffff", ink = INK, lw = 0.22, align = "center") => {
  g.save(); g.font = `900 ${size}px ${RND}`; g.textAlign = align; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = size * lw; g.strokeStyle = ink; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); g.restore();
};
const rrPts = (x0, y0, x1, y1, r) => { const pts = [], seg = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  seg(x1 - r, y0 + r, -Math.PI / 2); seg(x1 - r, y1 - r, 0); seg(x0 + r, y1 - r, Math.PI / 2); seg(x0 + r, y0 + r, Math.PI); return pts; };
/** a cartoon tooth (molar) */
export const fxTooth = (p, k = 1) => {
  const g = p.g; g.save(); g.translate(300, 500); g.scale(k, k); g.translate(-300, -500);
  const pts = [], n = 60;
  for (let i = 0; i <= n; i++) { const t = i / n; let x, y;
    if (t < 0.5) { const a = Math.PI + t * 2 * Math.PI; x = 300 + Math.cos(a) * 150; y = 430 + Math.sin(a) * 120 + (Math.abs(Math.cos(a)) < 0.3 ? 18 : 0); }
    else { const u = (t - 0.5) * 2; x = 450 - u * 300; y = 430 + 170 * Math.sin(Math.PI * u) ** 0.4 - 70 * Math.sin(Math.PI * 2 * u) ** 2 * (u > 0.25 && u < 0.75 ? 1 : 0); }
    pts.push([x, y]); }
  p.poly(pts, "#ffffff", 16); p.ell(240, 380, 30, 50, "#e9f2ff", 0, 0, 360, -20); p.ell(355, 350, 22, 14, "#ffffffcc", 0);
  g.restore();
};
/** bite impact burst: jagged star with a little zigzag mouth (t 0..1) */
export const fxBite = (p, t, col = "#ff4f5a") => {
  const g = p.g, k = M_back(Math.min(1, t * 3)), a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4; if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(300, 500); g.rotate(t * 0.6); g.scale(k, k); g.translate(-300, -500);
  const pts = []; for (let i = 0; i < 24; i++) { const r = i % 2 ? 105 : 190 - (i % 4 === 0 ? 30 : 0), an = (i / 24) * Math.PI * 2; pts.push([300 + Math.cos(an) * r, 500 + Math.sin(an) * r]); }
  p.poly(pts, "#ffd43a", 14);
  const in2 = pts.map(([x, y]) => [300 + (x - 300) * 0.68, 500 + (y - 500) * 0.68]); p.poly(in2, col, 0);
  // teeth zigzag
  const z = []; for (let i = 0; i <= 6; i++) z.push([220 + i * 27, i % 2 ? 530 : 475]);
  g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); z.forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q))); g.strokeStyle = INK; g.lineWidth = 34; g.stroke(); g.strokeStyle = "#ffffff"; g.lineWidth = 18; g.stroke();
  g.restore();
};
const M_back = (t, s = 1.7) => { t = Math.max(0, Math.min(1, t)) - 1; return t * t * ((s + 1) * t + s) + 1; };
/** energy speedometer: v 0..1 (needle), hot 0..1 flashes the red zone */
export const fxGauge = (p, v, hot = 0) => {
  const g = p.g, cx = 300, cy = 560, R = 210;
  p.poly(rrPts(60, 300, 540, 650, 60), "#2b3046", 16);
  const zones = [["#5bd16a", 0, 0.45], ["#ffc93a", 0.45, 0.72], [hot > 0 && Math.floor(hot * 8) % 2 ? "#ffffff" : "#ff4d4d", 0.72, 1]];
  for (const [c, a0, a1] of zones) { g.beginPath(); g.arc(cx, cy, R - 30, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI); g.strokeStyle = c; g.lineWidth = 52; g.stroke(); }
  g.beginPath(); g.arc(cx, cy, R - 30, Math.PI, 2 * Math.PI); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
  for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; g.beginPath(); g.moveTo(cx + Math.cos(a) * (R - 95), cy + Math.sin(a) * (R - 95)); g.lineTo(cx + Math.cos(a) * (R - 70), cy + Math.sin(a) * (R - 70)); g.strokeStyle = "#ffffff"; g.lineWidth = 7; g.lineCap = "round"; g.stroke(); }
  const a = Math.PI + Math.max(0, Math.min(1.02, v)) * Math.PI;
  g.lineCap = "round"; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (R - 40), cy + Math.sin(a) * (R - 40)); g.strokeStyle = INK; g.lineWidth = 30; g.stroke(); g.strokeStyle = "#ff8a3d"; g.lineWidth = 16; g.stroke();
  p.ell(cx, cy, 34, 34, "#f6f3ec", 10);
  // little paw print on the dial
  p.ell(cx, cy + 62, 20, 15, "#ffffff", 0); for (const [dx, dy] of [[-22, -12], [-8, -26], [8, -26], [22, -12]]) p.ell(cx + dx, cy + 62 + dy - 8, 7, 9, "#ffffff", 0);
};
/** warning triangle "!" */
export const fxWarn = (p, k = 1) => {
  const g = p.g; g.save(); g.translate(300, 500); g.scale(k, k); g.translate(-300, -500);
  p.poly([[300, 320], [470, 640], [130, 640]], "#ffd43a", 18);
  g.lineCap = "round"; g.beginPath(); g.moveTo(300, 420); g.lineTo(300, 540); g.strokeStyle = INK; g.lineWidth = 42; g.stroke(); p.ell(300, 595, 22, 22, INK, 0); g.restore();
};
/** clock face; hours in 0..24 (only the 12h face shown); wedge = [h0, h1] highlighted (alpha wa) */
export const fxClock = (p, hours, wedge = null, wa = 0, sunK = 1) => {
  const g = p.g, cx = 300, cy = 500, R = 230;
  p.ell(cx, cy, R + 26, R + 26, "#ff8a3d", 18); p.ell(cx, cy, R, R, "#fff8ee", 10);
  if (wedge && wa > 0) { g.save(); g.globalAlpha = wa; g.beginPath(); g.moveTo(cx, cy); const a0 = (wedge[0] % 12) / 12 * 2 * Math.PI - Math.PI / 2, a1 = (wedge[1] % 12 || 12) / 12 * 2 * Math.PI - Math.PI / 2; g.arc(cx, cy, R - 12, a0, a1); g.closePath(); g.fillStyle = "#ff4d4d"; g.fill(); g.restore(); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI, l = i % 3 ? 22 : 40; g.beginPath(); g.moveTo(cx + Math.sin(a) * (R - 20), cy - Math.cos(a) * (R - 20)); g.lineTo(cx + Math.sin(a) * (R - 20 - l), cy - Math.cos(a) * (R - 20 - l)); g.strokeStyle = INK; g.lineWidth = i % 3 ? 9 : 14; g.lineCap = "round"; g.stroke(); }
  const ha = (hours % 12) / 12 * 2 * Math.PI, ma = (hours % 1) * 2 * Math.PI;
  g.lineCap = "round"; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ma) * (R - 55), cy - Math.cos(ma) * (R - 55)); g.strokeStyle = INK; g.lineWidth = 16; g.stroke();
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ha) * (R - 105), cy - Math.cos(ha) * (R - 105)); g.strokeStyle = INK; g.lineWidth = 26; g.stroke();
  p.ell(cx, cy, 22, 22, "#ff8a3d", 8);
  // a sun sinking behind the top of the dial
  const sy = cy - R - 30 + 70 * (1 - sunK); g.save(); g.beginPath(); g.rect(0, 0, 600, cy - R - 8); g.clip(); p.ell(cx, sy, 64, 64, "#ffb03a", 12); g.restore();
};
/** stopwatch ring filling 0..1 with the minutes in the middle */
export const fxStopwatch = (p, k, done = 0) => {
  const g = p.g, cx = 300, cy = 520, R = 200;
  p.poly(rrPts(268, 250, 332, 300, 12), "#c9cfd6", 10); p.poly(rrPts(285, 285, 315, 320, 6), "#9aa3ad", 8);
  p.ell(cx, cy, R + 24, R + 24, done ? "#ffd43a" : "#f6f3ec", 16); p.ell(cx, cy, R - 34, R - 34, "#2b3046", 10);
  g.beginPath(); g.arc(cx, cy, R - 5, -Math.PI / 2, -Math.PI / 2 + Math.max(0.001, k) * 2 * Math.PI); g.strokeStyle = done ? "#ffb03a" : "#4fc3f7"; g.lineWidth = 46; g.lineCap = "round"; g.stroke();
  const m = Math.round(k * 60); inkText(g, m >= 60 ? "1h" : `${m}m`, cx, cy + 4, m >= 60 ? 150 : 120, "#ffffff", INK, 0.16);
};
/** floating Z z z (t loops 0..1) */
export const fxZzz = (p, t) => {
  const g = p.g;
  for (let i = 0; i < 3; i++) { const u = (t + i / 3) % 1, s = 70 + 60 * u, a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
    g.save(); g.globalAlpha = Math.max(0, a); inkText(g, "Z", 230 + 160 * u + 25 * Math.sin(u * 9), 760 - 520 * u, s, "#bfe3ff", INK, 0.2); g.restore(); }
};
/** crescent moon + twinkles */
export const fxMoon = (p, t = 0) => {
  const g = p.g; p.ell(300, 500, 170, 170, "#ffe58a", 16);
  g.save(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.ellipse(390, 430, 150, 150, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.save(); g.beginPath(); g.ellipse(390, 430, 158, 158, 0, 0, Math.PI * 2); g.restore();
  for (const [x, y, s] of [[470, 320, 1], [520, 560, 0.7], [400, 700, 0.8]]) { const k = s * (0.75 + 0.25 * Math.sin(t * 6 + x)); fxStar4(p, x, y, 46 * k); }
};
const fxStar4 = (p, x, y, r) => p.poly([[x, y - r], [x + r * 0.28, y - r * 0.28], [x + r, y], [x + r * 0.28, y + r * 0.28], [x, y + r], [x - r * 0.28, y + r * 0.28], [x - r, y], [x - r * 0.28, y - r * 0.28]], "#fff6c2", 8);
/** stop sign with a raised palm */
export const fxStop = (p) => {
  const g = p.g, pts = []; for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; pts.push([300 + Math.cos(a) * 200, 500 + Math.sin(a) * 200]); }
  p.poly(pts, "#e2463c", 16); p.poly(pts.map(([x, y]) => [300 + (x - 300) * 0.86, 500 + (y - 500) * 0.86]), null, 8);
  // palm
  p.poly(rrPts(235, 470, 365, 600, 40), "#ffffff", 10);
  for (const [x, h] of [[245, 120], [278, 150], [312, 150], [345, 125]]) p.poly(rrPts(x - 15, 470 - h, x + 15, 500, 15), "#ffffff", 10);
  p.poly(rrPts(355, 500, 395, 590, 18).map(([x, y]) => [300 + (x - 300) * 1, y]), "#ffffff", 10);
};
/** muted speaker (quiet room) */
export const fxQuiet = (p) => {
  p.ell(300, 500, 200, 200, "#7fa7c9", 16);
  p.poly([[190, 450], [240, 450], [310, 390], [310, 610], [240, 550], [190, 550]], "#ffffff", 12);
  const g = p.g; g.lineCap = "round"; for (const [a, b] of [[[350, 450], [430, 550]], [[430, 450], [350, 550]]]) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.strokeStyle = INK; g.lineWidth = 34; g.stroke(); g.strokeStyle = "#ffffff"; g.lineWidth = 18; g.stroke(); }
};
/** light bulb + dimmer slider; k = brightness 0..1 */
export const fxDimmer = (p, k) => {
  const g = p.g;
  g.save(); g.globalAlpha = 0.25 + 0.6 * k; p.ell(240, 430, 150, 150, "#fff3b0", 0); g.restore();
  p.ell(240, 420, 95, 100, k > 0.5 ? "#ffe066" : k > 0.2 ? "#d9c27a" : "#9aa0b4", 14);
  p.poly(rrPts(200, 505, 280, 580, 12), "#c9cfd6", 10); p.poly(rrPts(212, 580, 268, 600, 8), "#9aa3ad", 8);
  // slider
  p.poly(rrPts(420, 260, 470, 740, 25), "#2b3046", 12);
  const y = 300 + (1 - k) * 400; p.poly(rrPts(395, y - 26, 495, y + 26, 18), "#f6f3ec", 12);
  g.save(); g.globalAlpha = 0.9; g.lineCap = "round"; g.beginPath(); g.moveTo(445, y + 40); g.lineTo(445, 715); g.strokeStyle = "#ffb03a"; g.lineWidth = 14; g.stroke(); g.restore();
};
/** soft dust puff (t 0..1) */
export const fxLandDust = (p, t) => {
  const g = p.g; g.save(); g.globalAlpha = Math.max(0, 1 - t) * 0.9;
  for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI, d = 40 + 170 * (1 - (1 - t) ** 2); p.ell(300 + Math.cos(a) * d * 1.3, 820 + Math.sin(a) * d * 0.45, 52 * (1 - t * 0.5), 40 * (1 - t * 0.5), "#e8d6b4", 6); }
  g.restore();
};

/** THE SLEEP CHART: full 9:16 screen, design 600 x 1067. s = { pop, L, Lcap, R, gap, lab, t } */
export const fxSleepChart = (p, s) => {
  const g = p.g, Wd = 600, Hd = 1067;
  const bg = g.createLinearGradient(0, 0, 0, Hd); bg.addColorStop(0, "#151a3f"); bg.addColorStop(1, "#33367e"); g.fillStyle = bg; g.fillRect(0, 0, Wd, Hd);
  // stars
  for (let i = 0; i < 46; i++) { const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * Wd, y = (Math.sin(i * 78.233) * 12543.21 % 1 + 1) % 1 * Hd * 0.95, r = 1.5 + (i % 3);
    g.globalAlpha = 0.35 + 0.35 * Math.sin(s.t * 0.15 + i); g.fillStyle = "#dfe6ff"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  const k = s.pop; g.save(); g.translate(300, 560); g.scale(k, k); g.translate(-300, -560);
  // header: sleeping puppy face + Zz
  { const cx = 300, cy = 175, b = 1 + 0.02 * Math.sin(s.t * 0.12);
    g.save(); g.translate(cx, cy); g.scale(b, b); g.translate(-cx, -cy);
    p.ell(cx - 82, cy + 6, 40, 70, "#8a5a36", 10, 0, 360, 22); p.ell(cx + 82, cy + 6, 40, 70, "#8a5a36", 10, 0, 360, -22);
    p.ell(cx, cy, 96, 86, "#e7b77a", 12); p.ell(cx, cy + 40, 48, 34, "#f7dcb4", 0);
    g.lineCap = "round"; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 36, cy - 8, 17, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = INK; g.lineWidth = 9; g.stroke(); }
    p.ell(cx, cy + 26, 20, 14, INK, 0); g.beginPath(); g.arc(cx - 11, cy + 46, 11, 0.1 * Math.PI, 0.9 * Math.PI); g.arc(cx + 11, cy + 46, 11, 0.1 * Math.PI, 0.9 * Math.PI); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
    g.restore();
    fxZzzSmall(g, cx + 120, cy - 40, s.t);
  }
  // axes: 0..24 h between y0 (base) and y1 (top)
  const x0 = 120, x1 = 540, y0 = 900, y1 = 360, hy = (h) => y0 - (y0 - y1) * h / 24;
  for (const h of [6, 12, 18, 24]) { g.save(); g.setLineDash([10, 12]); g.beginPath(); g.moveTo(x0, hy(h)); g.lineTo(x1, hy(h)); g.strokeStyle = "rgba(220,228,255,.28)"; g.lineWidth = 4; g.stroke(); g.restore();
    g.save(); g.font = `900 28px ${RND}`; g.fillStyle = "rgba(220,228,255,.7)"; g.textAlign = "right"; g.textBaseline = "middle"; g.fillText(`${h}h`, x0 - 14, hy(h)); g.restore(); }
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.strokeStyle = "#dfe6ff"; g.lineWidth = 8; g.lineCap = "round"; g.stroke();
  const bar = (cx, h, col, colD) => { if (h <= 0.05) return; const top = hy(h), w = 64; p.poly(rrPts(cx - w, top, cx + w, y0 + 2, Math.min(30, (y0 - top) / 2)), col, 12);
    g.save(); g.globalAlpha = 0.25; g.fillStyle = colD; g.fillRect(cx + w * 0.35, top + 20, w * 0.45, Math.max(0, y0 - top - 30)); g.restore(); };
  // LEFT: needs 18-20 h (green, with a lighter striped cap for the 18-20 range)
  const LX = 225, RX = 435;
  if (s.Lcap > 0) { const top = hy(18 + 2 * s.Lcap), w = 64; p.poly(rrPts(LX - w, top, LX + w, hy(17), 28), "#b9f5cf", 12);
    g.save(); p.path(rrPts(LX - w, top, LX + w, hy(17), 28), true); g.clip(); g.strokeStyle = "#6fe08a"; g.lineWidth = 10; for (let d = -200; d < 200; d += 26) { g.beginPath(); g.moveTo(LX - 80 + d, top + 120); g.lineTo(LX + 80 + d, top - 40); g.stroke(); } g.restore(); }
  bar(LX, s.L, "#4fd18b", "#1e7a4a");
  // RIGHT: most get ~12 h (orange)
  bar(RX, s.R, "#ff8a3d", "#a3461a");
  // the missing hours: dashed red ghost from 12 up to 18-20
  if (s.gap > 0) { const w = 64, top = hy(12 + 7 * Math.min(1, s.gap * 1.2)), pulse = 0.65 + 0.35 * Math.sin(s.t * 0.5);
    g.save(); g.globalAlpha = Math.min(1, s.gap * 2) * pulse; g.setLineDash([16, 12]); p.path(rrPts(RX - w, top, RX + w, hy(12) - 6, 28), true); g.fillStyle = "rgba(255,77,77,.22)"; g.fill(); g.strokeStyle = "#ff4d4d"; g.lineWidth = 9; g.stroke(); g.restore();
    if (s.gap > 0.5) { g.save(); g.globalAlpha = Math.min(1, (s.gap - 0.5) * 3); const yy = (top + hy(12)) / 2, ks = M_back(Math.min(1, (s.gap - 0.5) * 3)); g.translate(RX, yy); g.scale(ks, ks); inkText(g, "-6h", 0, 0, 62, "#ff6b6b", INK, 0.2); g.restore(); } }
  // value labels
  if (s.L > 0.3) { const v = s.Lcap > 0.02 ? "18-20h" : `${Math.round(s.L)}h`; g.save(); const ks = s.Lcap > 0.02 ? M_back(Math.min(1, s.Lcap * 2), 2.2) : 1; g.translate(LX, hy(Math.max(s.L, 18 + 2 * s.Lcap)) - 48); g.scale(ks, ks); inkText(g, v, 0, 0, s.Lcap > 0.02 ? 58 : 54, "#ffffff"); g.restore(); }
  if (s.R > 0.3) inkText(g, `${Math.round(s.R)}h`, RX, s.gap > 0 ? hy(s.R) + 46 : hy(s.R) - 48, 58, "#ffffff");
  // bar labels
  g.save(); g.globalAlpha = s.lab; inkText(g, "NEEDS", LX, y0 + 58, 44, "#4fd18b", INK, 0.2); g.restore();
  g.save(); g.globalAlpha = Math.min(1, s.R * 2); inkText(g, "GETS", RX, y0 + 58, 44, "#ff8a3d", INK, 0.2); g.restore();
  g.restore();
};
const fxZzzSmall = (g, x, y, t) => { for (let i = 0; i < 3; i++) { const u = (t / 40 + i / 3) % 1; g.save(); g.globalAlpha = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8; inkText(g, "z", x + 40 * u, y - 70 * u, 26 + 22 * u, "#bfe3ff", INK, 0.2); g.restore(); } };

/** sharp sparkle glint (t 0..1): long thin 4-point star + small diagonal one + flare ring */
export const fxGlint = (p, t) => {
  const g = p.g, k = Math.sin(Math.PI * Math.min(1, t * 1.2));
  const star = (r, w, rot, col) => { g.save(); g.translate(300, 500); g.rotate(rot); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? w : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fillStyle = col; g.fill(); g.restore(); };
  g.save(); g.globalAlpha = 0.5 * k; const gr = g.createRadialGradient(300, 500, 0, 300, 500, 170); gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(1, "rgba(255,255,240,0)"); g.fillStyle = gr; g.fillRect(100, 300, 400, 400); g.restore();
  star(280 * k, 22 * k, 0, "#ffffff"); star(140 * k, 14 * k, Math.PI / 4, "#fff7c8");
  g.save(); g.globalAlpha = Math.max(0, 1 - t); g.beginPath(); g.arc(300, 500, 60 + 140 * t, 0, Math.PI * 2); g.strokeStyle = "#ffffff"; g.lineWidth = 10 * (1 - t) + 2; g.stroke(); g.restore();
};

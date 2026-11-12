// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
                                   
const SH_SKIN     = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH     = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT     = [0.62, 0.62, 0.7];

                                              
                      
                                                                                                                             
                                                                                                                                
                
  
                           

const rad = (d        ) => (d * Math.PI) / 180;
const clamp = (x        , a        , b        ) => Math.max(a, Math.min(b, x));
export const mul = (c        , m    ) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v        , k        ) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c        , k        ) => mul(c, [k, k, k]);
export const mix = (a        , b        , t        ) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s        ) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed        , k        ) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts      , a        , cx        , cy        )       =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q    , a        , c    )     => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a    , b    , t        )     => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a    , k    , b    , n = 10)       => {
  const c     = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out       = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN         = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER         = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID         = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT         = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra                  = {})         => {
  const o         = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0)         => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o         = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g                          ;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot                  = null;
  constructor(g                          ) { this.g = g; }
  P(x        , y        )     {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts      , close         ) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts      , fill               , ol         ) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx        , cy        , rx        , ry        , fill               , ol         , a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts      , fill        , w        , ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts      , w        , fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx        , cy        , rx        , ry        , a0        , a1        , w        , fill = INK) {
    const pts       = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx        , cy        , r        , fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts      , fn            ) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts      , base        , shadow        , light        , R        , shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts      , base        , shadow        , light        , flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts      , w0        , thick        , k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out       = [], inn       = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r      ) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts      , fill        , w        , rim        , cap                = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx        , cy        , rx        , ry        , a0 = 0, a1 = 360, rot = 0, n = 48)       => {
  const r = rad(rot), pts       = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0        , y0        , x1        , y1        , r        , n = 8)       => {
  const pts       = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p     , a    , b    , wa        , wb        , col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
                                                                                                                                             

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx        , cy        , B      , n = 72)       => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts       = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed        , a = 118, facing = 0)       => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light        ) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
                                                                                                                                
                                                 
                                                                                                               
                                                                                                                            
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE                                                                             = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
};
const halfLid = (k      )       => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k      , lid        )       =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b                              ) => (b === true ? 1 : Number(b) || 0);

const eye = (p     , kind      , x        , ey        , u        , side        , look        , skin        ) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s       = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p     , mx        , y        , rx        , ry        , u        , tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p     , kind        , mx        , my        , u        , k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s       = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p     , cx        , cy        , W        , expr      , facing        , look        , lid        , brim         ,
  skin        , moustache         , stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p     , hx        , hy        , W        , expr      , lid        , brim         , skin        , moustache         , stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p     , o        , H      , cx        , hc        , light        , thick        , ow        , side         ) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p     , o        , hp      , H      , cx        , hc        , light        , seed        , facing        , side         ) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts      ) => rotPts(pts, a, cx, hc);
  const sag = (yb        , wb        )       => {
    const base       = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x        , y        ) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03]      );
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap  : o.hair ;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
                                
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
                                                                    

const BUILD                                                                        = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

                         
                                                                                                                                            
                                                               
                                                                                      
                                                     
  

const footStroke = (p     , a    , b    , w        , col        ) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p     , o        , opts           ) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h     = [300 + side * 15 * u, hipY], k     = [300 + side * 36 * u, hipY + 0.2 * HH], f     = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs                 = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]]         ) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k     = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T       = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side        )     => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side        , fwd        )               => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0     = [300 + 47 * u, torsoBot + 0.12 * HH], R1     = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
                                                   
  const arms        = [];
  if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  const drawArm = (a     ) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0     = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D       = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress , mul(o.dress , SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw       = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt , 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop)) {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts      ) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

                        
                                                                                                                                    
                                                                                                                         
                                                 
                                                                                                     
                          
  

/** two-bone leg, knee bending forward (+x) */
const ik = (hip    , ank    , l1        , l2        )     => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p     , o        , opts          ) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H       = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
                                                        
  const legs         = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph        ) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]]         )
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]]         ) {
      const knee     = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip     = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u]      ) : ik(hip, L.ank, l1, l2);
    const hp0     = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T       = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S     = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang        )               => {
    const e     = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0     = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1     = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near              , far                     ;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN     = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg     = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt , 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p     , o        , kick        , expr      , light = DEF_LIGHT, blink         = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p     , kind        , col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p     , t        , col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p     , t        ) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts       = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p     , t        ) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p     , t        ) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts       = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p     , t        ) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p     , t        ) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p     ) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]]                                          ) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p     , seed        ) => {
  const blobs                             = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p     , col        ) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p     , col        ) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]]         ) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p     ) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p     ) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p     , col        ) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]]         ) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
FACE.snore = { eye: ["dash", "dash"], brow: [0, -1], mouth: "o" };
FACE.stubborn = { eye: ["lid", "lid"], brow: [4, -3], mouth: "frown" };
FACE.squint = { eye: ["slit", "slit"], brow: [3, -2], mouth: "dash" };

// ---------------- Roman-era cast (our own designs), built on the Pen / blob / face helpers above ----------------
const STEEL = "#aeb6bf", BRASS = "#d9a845", LEATHER = "#7a4a2a";
export const OUTFITS = {
  legion: { tunic: "#b8322f", cape: "#8f2228", skin: SKIN, helmet: true, armor: true, spear: true, shield: true },
  old: { tunic: "#9c4a3c", cape: "#6e3330", skin: "#f3d6bb", helmet: "old", armor: true, spear: true, shield: false, beard: "#f4f1ea", brows: "#f4f1ea" },
  toga: { tunic: "#f1ead8", skin: "#f5c9a0", toga: "#6b3c8f", hair: "#3b2a20", stout: true },
  civA: { tunic: "#4f7fb8", skin: "#f5c9a0", hair: "#5a3b2a" },
  civB: { tunic: "#d9a441", skin: SKIN, hair: "#2b211c", dress: "#c25a7a" },
  civC: { tunic: "#5d8a3a", skin: "#c99067", hair: "#1e1714", stout: true },
  workA: { tunic: "#8a5d3b", skin: "#f5c9a0", cap: "#c2733a", apron: "#d8c9a6" },
  workB: { tunic: "#3f6a6f", skin: "#ecd0b6", cap: "#5b4a8a", moustache: "#4a3020" },
};

/** galea: iron bowl, brass brow band, cheek guards, transverse red crest */
const galea = (p, H, cx, hc, light, thick, ow, old, u) => {
  const crest = old ? "#8d4b3f" : "#d2372f", bowl = old ? "#8f8a7e" : STEEL;
  // crest (behind the bowl top)
  const cy0 = hc - H.b * 0.98;
  const cr = ellPts(cx, cy0, 0.66 * 2 * H.a, 0.42 * 2 * H.b, 180, 360, 0, 40);
  cr.push([cx + 0.66 * 2 * H.a * 0.98, cy0 + 4 * u], [cx - 0.66 * 2 * H.a * 0.98, cy0 + 4 * u]);
  const crP = [...ellPts(cx, cy0 + 2 * u, 0.62 * 2 * H.a, 0.36 * 2 * H.b, 180, 360, 0, 40)];
  p.shadedFill(crP, crest, mul(crest, [0.7, 0.62, 0.7]), light, 0.62 * 2 * H.a, 0.3);
  p.clip(crP, () => { for (let i = -9; i <= 9; i++) p.stroke([[cx + i * 7.4 * u, cy0], [cx + i * 9.4 * u, cy0 - 0.62 * H.b * Math.cos(i / 11)]], 1.4 * u, mul(crest, [0.62, 0.55, 0.62])); });
  if (old) p.clip(crP, () => { for (let i = 0; i < 6; i++) p.ell(cx + (i - 3) * 22 * u, cy0 - 18 * u - (i % 2) * 10 * u, 9 * u, 5 * u, "#6f6a5e", 0); });
  p.inkRing(crP, ow * 0.85, thick);
  p.poly(rrect(cx - 10 * u, cy0 - 6 * u, cx + 10 * u, cy0 + 6 * u, 3 * u), BRASS, 2 * u);
  // bowl: upper head cap
  const bandY = hc - H.b * 0.42;
  const bp = ellPts(cx, bandY, H.a * 1.05, H.b * 0.66, 180, 360, 0, 48);
  p.shadedFill(bp, bowl, mul(bowl, [0.62, 0.64, 0.72]), light, H.a, 0.4);
  p.clip(bp, () => {
    p.stroke(ellPts(cx - 20 * u, bandY - 0.3 * H.b, 0.25 * H.a, 0.18 * H.b, 200, 300, 0, 16), 4 * u, "#ffffff55");
    if (old) for (let i = 0; i < 9; i++) p.ell(cx + Math.sin(i * 2.3) * 0.8 * H.a, bandY - (0.08 + 0.5 * ((i * 0.37) % 1)) * H.b, (3 + (i % 3) * 2) * u, (2 + (i % 2)) * u, "#8a4b22", 0);
  });
  p.inkRing(bp, ow * 0.9, thick);
  p.band([[cx - H.a * 1.04, bandY], [cx + H.a * 1.04, bandY]], old ? "#a88a4a" : BRASS, 7 * u, 1.8 * u, "round");
  for (const s of [-1, 1]) p.dot(cx + s * 0.55 * H.a, bandY, 2.2 * u, "#fff3c4");
};
const cheeks = (p, H, cx, hc, light, ow, old, u) => {
  const bowl = old ? "#8f8a7e" : STEEL;
  for (const s of [-1, 1]) {
    const x0 = cx + s * 0.78 * H.a, x1 = cx + s * 1.07 * H.a, y0 = hc - H.b * 0.42, y1 = hc + H.b * 0.48;
    const pts = [[x0, y0], [x1, y0], [x1 - s * 0.04 * H.a, y1 - 0.1 * H.b], [x0 + s * 0.06 * H.a, y1], [x0 - s * 0.05 * H.a, (y0 + y1) / 2]];
    p.shadedFill(pts, bowl, mul(bowl, [0.62, 0.64, 0.72]), light, 0.2 * H.a, 0.3);
    p.poly(pts, null, ow * 0.8);
    p.dot((x0 + x1) / 2, (y0 + y1) / 2 - 0.05 * H.b, 2.2 * u, BRASS);
  }
};
const cobweb = (p, cx, cy, r, u) => {
  const g = p.g; g.save(); g.globalAlpha = 0.8;
  for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.05 + 0.9 * i / 6); p.stroke([[cx, cy], [cx + Math.cos(a) * r, cy + Math.sin(a) * r]], 1.1 * u, "#f2f2f2"); }
  for (let k = 1; k <= 4; k++) { const rr = r * k / 4.3, pts = []; for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.05 + 0.9 * i / 6); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } p.stroke(pts, 1 * u, "#f2f2f2"); }
  g.restore();
};

/** front-facing Roman-era character. opts: expr, blink, look, facing, seed, L/R arm poses, tilt, headTilt, bob, nohelmet, light */
export const romanFront = (p, key, opts = {}) => {
  const O = typeof key === "string" ? OUTFITS[key] : key;
  const { expr = "neutral", blink = 0, look = 0, facing = 0, seed = 3, L = "hang", R = O.spear ? "spear" : "hang", tilt = 0, headTilt = 0,
    bob = 0, nohelmet = false, light = rad(-120), web = false, step = 0 } = opts;
  const lid = lidOf(blink), skin = O.skin ?? SKIN;
  const H = headBlob(seed, 118, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoL = O.stout ? 1.12 : 1.08, legsL = 1.38, sole = 975;
  const torsoBot = sole - legsL * HH - bob * HH, chin = torsoBot - torsoL * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u, cx = 300;
  const legCol = O.pants || mix(O.tunic, INK, 0.62), armCol = O.sleeve || mix(O.tunic, INK, 0.5);
  const helmet = !!O.helmet && !nohelmet, old = O.helmet === "old";
  p.rot = null;
  // ---- cape behind everything ----
  if (O.cape) {
    const cp = [[cx - 0.48 * W, chin + 0.08 * HH], [cx + 0.48 * W, chin + 0.08 * HH], [cx + 0.62 * W, sole - 0.55 * HH], [cx + 0.2 * W, sole - 0.45 * HH], [cx - 0.2 * W, sole - 0.5 * HH], [cx - 0.62 * W, sole - 0.55 * HH]];
    p.gradFill(cp, O.cape, mul(O.cape, [0.6, 0.6, 0.7]), light); p.inkRing(cp, ow * 0.8, thick);
  }
  // ---- legs ----
  const dress = !!O.dress;
  for (const side of [-1, 1]) {
    const up = Math.max(0, Math.sin(Math.PI * 2 * (step + (side > 0 ? 0.5 : 0)))) * 30 * (step ? 1 : 0);
    const hx = cx + side * 16 * u, fx = cx + side * 22 * u, fy = sole - 4 * u - up;
    p.stroke(curve([hx, hipY], [(hx + fx) / 2 + side * (2 + Math.max(0, -bob) * 90) * u, (hipY + fy) / 2], [fx, fy]), 5.8 * u, legCol);
    const sandal = O.shoes || (O.helmet ? LEATHER : "#5a3b2a");
    p.stroke([[fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u]], 7.5 * u + 3, INK);
    p.stroke([[fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u]], 7.5 * u, sandal);
    if (O.helmet) for (let k = 1; k <= 3; k++) p.stroke([[fx - 4 * u, fy - k * 0.07 * HH], [fx + 4 * u, fy - k * 0.07 * HH - 2 * u]], 2 * u, LEATHER);
  }
  // ---- upper body ----
  p.rot = tilt ? [rad(tilt), cx, hipY] : null;
  const T = { a: (0.4 * W) / 1.06 * (O.stout ? 1.12 : 1), b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: O.stout ? 0.17 : 0.12, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = cx + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const S = (side) => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const arm = (side, pose) => {
    const s = S(side), X = (k) => tcx + side * (T.a * 1.1 + k * u);
    switch (pose) {
      case "spear": return { pts: [s, [X(6), s[1] + 0.42 * HH], [X(10), s[1] + 0.2 * HH]], front: false };
      case "point": return { pts: [s, [X(28), s[1] - 0.02 * HH], [X(62), s[1] - 0.1 * HH]], front: false, finger: true };
      case "up": return { pts: [s, [X(14), s[1] - 0.3 * HH], [X(22), s[1] - 0.75 * HH]], front: false };
      case "wave": return { pts: [s, [X(16), s[1] - 0.2 * HH], [X(30 + 10 * Math.sin(opts.wv || 0)), s[1] - 0.62 * HH]], front: false };
      case "hip": return { pts: [s, [X(22), s[1] + 0.3 * HH], [tcx + side * T.a * 0.95, torsoBot - 0.3 * HH]], front: false };
      case "belly": return { pts: [s, [X(8), s[1] + 0.45 * HH], [tcx + side * 0.25 * T.a, torsoBot - 0.35 * HH]], front: true };
      case "temple": return { pts: [s, [X(26), s[1] + 0.05 * HH], [cx + side * (H.a + 16 * u), hc - 0.1 * HH]], front: false, swirl: true };
      case "lift": return { pts: [s, [X(20), s[1] - 0.25 * HH], [X(4), s[1] - 0.82 * HH]], front: false };
      case "shield": return { pts: [s, [X(4), s[1] + 0.4 * HH], [tcx + side * 0.6 * T.a, torsoBot - 0.1 * HH]], front: true };
      case "cross": return { pts: [s, [X(2), s[1] + 0.38 * HH], [tcx - side * 0.45 * T.a, s[1] + 0.32 * HH]], front: true };
      case "reach": { const lf = (opts.lift || 0) * 0.62 * HH; return { pts: [s, [X(42), s[1] - 0.12 * HH - lf * 0.6], [X(82), s[1] - 0.5 * HH - lf]], front: false }; }
      case "cheek": return { pts: [s, [X(16), s[1] + 0.05 * HH], [cx + side * (H.a + 2 * u), hc + 0.25 * H.b]], front: false };
      case "thumb": return { pts: [s, [X(20), s[1] + 0.12 * HH], [X(44), s[1] - 0.12 * HH]], front: false, thumb: true };
      case "to": { const t = opts.sign ? [tcx + side * 66 * u, chin + 0.62 * HH + (opts.signDy || 0) + 6 * u] : side < 0 ? opts.toL : opts.toR, bd = (side < 0 ? opts.bendL : opts.bendR) ?? 1;
        const mx = (s[0] + t[0]) / 2, my = (s[1] + t[1]) / 2, dx = t[0] - s[0], dy = t[1] - s[1], l = Math.hypot(dx, dy) || 1;
        return { pts: [s, [mx - dy / l * 22 * u * bd * side, my + Math.abs(dx) / l * 14 * u * bd], t], front: true, mitt: true }; }
      default: return { pts: [s, [X(4), s[1] + 0.48 * HH], [X(3), chin + 1.04 * HH]], front: false };
    }
  };
  const arms = [arm(-1, L), arm(1, R)];
  const drawArm = (a) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol);
    const [hx, hy] = a.pts[2];
    if (a.mitt || opts.mitts) {
      const dx = a.pts[2][0] - a.pts[1][0], dy = a.pts[2][1] - a.pts[1][1], l = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx) * 180 / Math.PI;
      p.ell(hx + dx / l * 5 * u, hy + dy / l * 5 * u, 10 * u, 7.5 * u, skin, 2.6 * u, 0, 360, ang);
      const ox = -dy / l, oy = dx / l;
      p.ell(hx + ox * 7 * u, hy + oy * 7 * u, 4 * u, 3 * u, skin, 2.2 * u, 0, 360, ang - 40);
      for (const k of [-3, 0, 3]) p.stroke([[hx + dx / l * 9 * u + ox * k * u, hy + dy / l * 9 * u + oy * k * u], [hx + dx / l * 14 * u + ox * k * 1.2 * u, hy + dy / l * 14 * u + oy * k * 1.2 * u]], 1.2 * u);
    } else p.dot(hx, hy, 5.5 * u);
    if (a.finger) { const dx = a.pts[2][0] - a.pts[1][0], dy = a.pts[2][1] - a.pts[1][1], l = Math.hypot(dx, dy); p.stroke([[hx, hy], [hx + dx / l * 14 * u, hy + dy / l * 14 * u]], 2.6 * u); }
    if (a.thumb) p.stroke([[hx, hy], [hx + Math.sign(hx - cx) * 6 * u, hy - 12 * u]], 2.6 * u);
  };
  // spear behind
  if (O.spear && R === "spear") {
    const [hx, hy] = arms[1].pts[2], s0 = [hx + 2 * u, sole - 2 * u], s1 = [hx - 3 * u, 70];
    p.band([s0, s1], old ? "#6d5236" : "#8a5a34", 4.2 * u, 1.4 * u, "round");
    const tip = [[s1[0] - 7 * u, s1[1] + 6 * u], [s1[0], s1[1] - 34 * u], [s1[0] + 7 * u, s1[1] + 6 * u], [s1[0], s1[1] + 14 * u]];
    p.poly(tip, old ? "#8b7c6a" : "#c9cfd6", 2 * u);
    if (web) cobweb(p, s1[0] - 2 * u, s1[1] + 60 * u, 70 * u, u);
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso
  if (dress) {
    const D = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(cx, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, O.dress, mul(O.dress, SH_CLOTH), light); p.inkRing(dp, ow, thick);
  }
  // skirt / pteruges below the torso
  if (!dress) {
    const sk = [[tcx - 0.92 * T.a, torsoBot - 0.2 * HH], [tcx + 0.92 * T.a, torsoBot - 0.2 * HH], [tcx + 1.0 * T.a, torsoBot + 0.3 * HH], [tcx - 1.0 * T.a, torsoBot + 0.3 * HH]];
    p.gradFill(sk, O.tunic, mul(O.tunic, SH_CLOTH), light); p.poly(sk, null, ow * 0.8);
    if (O.armor) for (let i = -3; i <= 3; i++) { const x = tcx + i * 0.27 * T.a, st = [[x - 9 * u, torsoBot - 0.05 * HH], [x + 9 * u, torsoBot - 0.05 * HH], [x + 9 * u, torsoBot + 0.22 * HH], [x - 9 * u, torsoBot + 0.22 * HH]]; p.poly(st, old ? "#5e4632" : LEATHER, 1.6 * u); }
  }
  p.gradFill(tp, O.tunic, mul(O.tunic, SH_CLOTH), light);
  p.clip(tp, () => {
    if (O.armor) {
      const top = chin - 0.1 * HH, bot = torsoBot - 0.25 * HH, n = 5;
      for (let i = 0; i < n; i++) {
        const y0 = top + (bot - top) * i / n, y1 = top + (bot - top) * (i + 1) / n;
        const c = old ? (i % 2 ? "#8d8679" : "#9a9384") : (i % 2 ? "#a7b0ba" : "#bcc4cc");
        p.poly([[tcx - 1.5 * T.a, y0], [tcx + 1.5 * T.a, y0 + 3 * u], [tcx + 1.5 * T.a, y1 + 3 * u], [tcx - 1.5 * T.a, y1]], c, 1.8 * u);
      }
      p.band([[tcx - 1.4 * T.a, torsoBot - 0.2 * HH], [tcx + 1.4 * T.a, torsoBot - 0.2 * HH]], LEATHER, 0.08 * HH, 1.5 * u);
      for (let i = -2; i <= 2; i++) p.dot(tcx + i * 0.3 * T.a, torsoBot - 0.2 * HH, 2.4 * u, BRASS);
      if (old) for (let i = 0; i < 5; i++) p.ell(tcx + Math.sin(i * 1.7) * 0.7 * T.a, top + (bot - top) * ((i * 0.31) % 1), 6 * u, 3 * u, "#8a4b22", 0);
    } else {
      p.band([[tcx - 1.4 * T.a, torsoBot - 0.24 * HH], [tcx + 1.4 * T.a, torsoBot - 0.24 * HH]], O.apron ? "#5a3b2a" : "#e2c27a", 0.05 * HH, 1.2 * u);
      if (O.toga) p.band([[tcx - 1.0 * T.a, chin - 0.1 * HH], [tcx + 1.1 * T.a, torsoBot - 0.1 * HH]], O.toga, 0.16 * HH, 1.6 * u);
      if (O.apron) p.poly([[tcx - 0.55 * T.a, torsoBot - 0.2 * HH], [tcx + 0.55 * T.a, torsoBot - 0.2 * HH], [tcx + 0.6 * T.a, torsoBot + 0.2 * HH], [tcx - 0.6 * T.a, torsoBot + 0.2 * HH]], O.apron, 1.6 * u);
      p.stroke([[tcx - 0.2 * T.a, chin + 0.02 * HH], [tcx, chin + 0.16 * HH], [tcx + 0.2 * T.a, chin + 0.02 * HH]], 2 * u);
    }
  });
  p.inkRing(tp, ow, thick);
  if (O.armor) for (const s of [-1, 1]) { // shoulder plates
    const sp = ellPts(tcx + s * 0.72 * T.a, chin + 0.1 * HH, 0.42 * T.a, 0.13 * HH, 180, 360, s * 8, 20);
    p.poly(sp, old ? "#9a9384" : "#c5ccd3", 1.8 * u);
  }
  if (O.moss) {/* reserved */}
  if (opts.sign) signBoard(p, opts.sign, tcx, chin + 0.62 * HH + (opts.signDy || 0), u, opts.signGlow || 0);
  for (const a of arms) if (a.front) drawArm(a);
  // shield in front, held by the left hand
  if (O.shield && L === "shield") {
    const sx = tcx - 0.55 * T.a, sy = torsoBot + 0.05 * HH, sw = 0.36 * W, sh = 0.78 * HH;
    const sp = rrect(sx - sw, sy - sh, sx + sw, sy + sh, 8 * u);
    p.gradFill(sp, "#c0302c", "#7d1d22", light);
    p.clip(sp, () => {
      p.band([[sx - sw, sy], [sx + sw, sy]], BRASS, 6 * u, 1.2 * u);
      p.band([[sx, sy - sh], [sx, sy + sh]], BRASS, 6 * u, 1.2 * u);
      for (const s of [-1, 1]) { p.stroke([[sx + s * 12 * u, sy - 14 * u], [sx + s * 34 * u, sy - 46 * u], [sx + s * 22 * u, sy - 44 * u], [sx + s * 46 * u, sy - 74 * u]], 3.5 * u, BRASS); p.stroke([[sx + s * 12 * u, sy + 14 * u], [sx + s * 34 * u, sy + 46 * u], [sx + s * 22 * u, sy + 44 * u], [sx + s * 46 * u, sy + 74 * u]], 3.5 * u, BRASS); }
      p.stroke(ellPts(sx - sw * 0.5, sy - sh * 0.7, sw * 0.3, sh * 0.1, 200, 320, 0, 10), 3 * u, "#ffffff44");
    });
    p.ell(sx, sy, 13 * u, 13 * u, "#e6c068", 2.2 * u);
    p.inkRing(sp, ow, thick);
  }
  // ---- head ----
  const [cpx, cpy] = rotAbout([cx, chin], rad(tilt), [cx, hipY]);
  const Ah = tilt + headTilt;
  p.rot = Ah ? [rad(Ah), cx, chin, cpx - cx, cpy - chin] : null;
  if (helmet) galea(p, H, cx, hc, light, thick, ow, old, u);
  const hp = blobPts(cx, hc, H);
  if (O.hair && !helmet) { const hb = blobPts(cx, hc - 0.03 * HH, { ...H, a: H.a * 1.04, b: H.b * 1.05 }); p.poly(hb, O.hair, 0); }
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (helmet) {
    const bandY = hc - H.b * 0.42, bp = ellPts(cx, bandY, H.a * 1.05, H.b * 0.66, 180, 360, 0, 48);
    p.shadedFill(bp, old ? "#8f8a7e" : STEEL, mul(old ? "#8f8a7e" : STEEL, [0.62, 0.64, 0.72]), light, H.a, 0.4);
    p.clip(bp, () => { p.stroke(ellPts(cx - 20 * u, bandY - 0.3 * H.b, 0.25 * H.a, 0.18 * H.b, 200, 300, 0, 16), 5 * u, "#ffffff66");
      if (old) for (let i = 0; i < 9; i++) p.ell(cx + Math.sin(i * 2.3) * 0.8 * H.a, bandY - (0.08 + 0.5 * ((i * 0.37) % 1)) * H.b, (4 + (i % 3) * 2) * u, (2.5 + (i % 2)) * u, "#8a4b22", 0); });
    p.poly(bp, null, ow * 0.9);
    p.band([[cx - H.a * 1.05, bandY], [cx + H.a * 1.05, bandY]], old ? "#a88a4a" : BRASS, 7 * u, 1.8 * u, "round");
    p.poly(rrect(cx - 4 * u, bandY - 0.55 * H.b, cx + 4 * u, bandY - 3 * u, 2 * u), old ? "#a88a4a" : BRASS, 1.5 * u);
    cheeks(p, H, cx, hc, light, ow, old, u);
  } else if (O.cap) hatOn(p, { hat: "cap", cap: O.cap, jacket: O.tunic }, hp, H, cx, hc, light, seed, facing, false);
  else if (O.hair) hatOn(p, { hat: "hair", hair: O.hair, jacket: O.tunic }, hp, H, cx, hc, light, seed, facing, false);
  else if (O.helmet && nohelmet) { // bald old head with white side tufts
    for (const s of [-1, 1]) p.ell(cx + s * 0.9 * H.a, hc - 0.1 * H.b, 0.22 * H.a, 0.3 * H.b, "#f4f1ea", 3 * u);
  }
  if (O.beard) {
    const bd = blobPts(cx + 6 * u * facing, hc + 0.85 * H.b, { a: 0.62 * H.a, b: 0.75 * H.b, nTop: 2.4, nBot: 1.6, egg: -0.35, asym: 0, rot: 0, noise: 0.02, seed: seed + 4 });
    p.shadedFill(bd, O.beard, mul(O.beard, [0.86, 0.86, 0.92]), light, 0.6 * H.a, 0.3);
    p.clip(bd, () => { for (let i = -3; i <= 3; i++) p.stroke([[cx + i * 9 * u, hc + 0.45 * H.b], [cx + i * 7 * u, hc + 1.35 * H.b]], 1.2 * u, "#c9c4bb"); });
    p.inkRing(bd, ow * 0.8, thick);
  }
  faceFront(p, cx, hc, W, expr, facing, look, lid, helmet, skin, O.beard ? O.beard : O.moustache, !!O.stout);
  if (O.brows) for (const s of [-1, 1]) p.ell(cx + 7 * u * facing + s * 14 * u, hc - 20 * u, 11 * u, 5 * u, O.brows, 2 * u);
  if (O.beard) { // re-draw the mouth over the beard for open mouths
    if (expr === "shock" || expr === "snore") p.ell(cx + 8 * u * facing, hc + 22 * u, 6 * u, 7 * u, "#5a1e28", 2 * u);
  }
  p.rot = null;
  if (arms.some((a) => a.swirl) && !opts.noswirl) { // cuckoo swirl next to the temple
    const a = arms.find((x) => x.swirl), [hx, hy] = a.pts[2], ph = opts.swirl || 0, pts = [];
    for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 4 + ph, r = (4 + i * 0.7) * u; pts.push([hx + Math.cos(t) * r, hy - 40 * u + Math.sin(t) * r]); }
    p.stroke(pts, 3 * u, "#ffffff"); p.stroke(pts, 1.4 * u, INK);
  }
};

/** loose helmet prop card (lifted off the old soldier) */
export const helmetCard = (p) => {
  const H = headBlob(3, 118, 0), u = 2 * H.a / 100, hc = 560, light = rad(-120), thick = thickAngle(light), ow = 5 * u;
  galea(p, H, 300, hc, light, thick, ow, true, u);
  const bandY = hc - H.b * 0.42, bp = ellPts(300, bandY, H.a * 1.05, H.b * 0.66, 180, 360, 0, 48);
  // dark inside visible from below
  p.ell(300, bandY, H.a * 1.05, 0.12 * H.b, "#2a221e", 0);
  p.shadedFill(bp, "#8f8a7e", mul("#8f8a7e", [0.62, 0.64, 0.72]), light, H.a, 0.4);
  p.clip(bp, () => { for (let i = 0; i < 9; i++) p.ell(300 + Math.sin(i * 2.3) * 0.8 * H.a, bandY - (0.08 + 0.5 * ((i * 0.37) % 1)) * H.b, (4 + (i % 3) * 2) * u, (2.5 + (i % 2)) * u, "#8a4b22", 0); });
  p.poly(bp, null, ow * 0.9);
  p.band([[300 - H.a * 1.05, bandY], [300 + H.a * 1.05, bandY]], "#a88a4a", 7 * u, 1.8 * u, "round");
  cheeks(p, H, 300, hc, light, ow, true, u);
};

/** ZZZ for the sleeping guard */
export const fxZ = (p, t) => {
  const g = p.g; g.save(); g.font = "900 120px Arial Black, Arial"; g.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    const k = (t + i / 3) % 1, x = 220 + i * 70 + Math.sin(k * 6) * 20, y = 700 - k * 500, s = 0.5 + k * 0.7;
    g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = Math.min(1, (1 - k) * 2.5);
    g.lineWidth = 16; g.strokeStyle = INK; g.strokeText("Z", 0, 0); g.fillStyle = "#ffffff"; g.fillText("Z", 0, 0); g.restore();
  }
  g.restore();
};
/** falling leaf */
export const fxLeaf = (p, col) => { p.poly([[300, 380], [420, 470], [300, 620], [180, 470]], col, 14); p.stroke([[300, 400], [300, 600]], 8); };
/** dust cloud puff (k 0..1 growth) */
export const fxDust = (p, k, col = "#e8dcc4") => {
  const g = p.g; g.save(); g.globalAlpha = Math.max(0, 1 - k * k);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = 90 + 150 * k; p.ell(300 + Math.cos(a) * r, 520 + Math.sin(a) * r * 0.6, 120 + 60 * k, 100 + 50 * k, col, 12); }
  p.ell(300, 520, 170 + 110 * k, 140 + 80 * k, col, 0);
  g.restore();
};
export const fxDrip = (p) => p.ell(300, 500, 40, 64, "#9fd4ff", 10);
export const fxWood = (p, seed) => { p.poly([[200, 420], [400, 400], [420, 560], [230, 600]], "#5b3d22", 14); p.stroke([[240, 450], [380, 440]], 6, "#3a2614"); p.ell(330, 520, 26, 18, "#4d7a32", 0); };

export const headCenter = (seed = 3) => { const H = headBlob(seed, 118, 0), HH = 2 * H.b; return 975 - 1.38 * HH - 1.08 * HH - H.b; };

/** chalkboard sign held in front of the torso (diegetic text, drawn un-mirrored) */
const signBoard = (p, text, x, y, u, glow) => {
  const w = 74 * u, h = 44 * u;
  p.poly(rrect(x - w, y - h, x + w, y + h, 6 * u), "#a8743f", 3 * u);
  p.poly(rrect(x - w + 8 * u, y - h + 8 * u, x + w - 8 * u, y + h - 8 * u, 3 * u), "#2f4a3c", 2 * u);
  const g = p.g; g.save(); g.font = `900 ${Math.round(46 * u)}px "Arial Rounded MT Bold", "Arial Black", Arial`; g.textAlign = "center"; g.textBaseline = "middle";
  if (glow > 0) { g.shadowColor = `rgba(255,240,170,${glow})`; g.shadowBlur = 30 * u * glow; }
  g.fillStyle = "#fbf7ea"; g.fillText(text, x, y + 3 * u); g.restore();
  p.stroke([[x - 40 * u, y + 26 * u], [x + 40 * u, y + 25 * u]], 2.2 * u, "#e8e2cf");
};

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
  g.save(); g.globalAlpha = 0.35; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = glow; g.lineWidth = 30;
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

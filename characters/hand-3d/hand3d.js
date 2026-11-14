// ================= POLISHED 3D CARTOON HAND (reusable, three.js r160) =================
// A posable right (or mirrored left) hand for POV dog-training shots. Every finger and the thumb is ONE smooth swept tube
// along its jointed bone chain (no sausage seams): elliptical cross-section, knuckle bulges, a rounded tip and a nail.
// The palm is a squared-off, slightly tapered superellipsoid that cups as the hand closes. A short wrist ends in a cuff
// that a stick arm can plug into. Poses are tables of joint angles that blend; geometry is rebuilt only when the pose changes.
//
// Hand space (metres, scale 1 = real adult size): wrist centre at the origin, fingers along +y, BACK of the hand = +z,
// palm faces -z, thumb on -x (right hand). mirror: true makes a left hand (thumb on +x).
//
//   import { makeHand, HAND_POSES } from './hand3d.js';
//   const h = makeHand(THREE, { toon: (o) => new THREE.MeshToonMaterial({ gradientMap, ...o }) });
//   scene.add(h.group);
//   h.setPose('fist');                    // or a blend: h.setPose({ a: 'pinch', b: 'fist', k: 0.4 }), or a raw pose table
//   h.grip('pinch')                      // -> THREE.Vector3 in hand space: where the biscuit sits for that pose
//   h.group.position / quaternion ...    // place it yourself, or use orientHand() below
//
//   orientHand(THREE, h, { at, palm, fingers, grip, scale })  // world placement: palm faces `palm`, fingers along `fingers`,
//                                                             // the grip point lands on `at`. Returns { wrist, back } (world).
// Presets: open, five (high-five, spread), relax, cup (palm up, holding a treat), fist, pinch, point, thumb (thumbs-up).
// Each finger: [splay, mcp, pip, dip] degrees (+splay leans toward the thumb side, + curls toward the palm).
// Thumb th: [[yaw, pitch] for its 3 segments, nailRoll]: yaw = lean from +y toward the thumb side (-x; negative = across
// the palm), pitch = tilt toward the palm side (-z); nailRoll = where its nail faces (0 = back of hand, 90 = out to the side).
// thumbTo: 'index' bends the last two thumb segments (2-bone IK) so the tip meets the index tip (a real pinch).
export const HAND_POSES = {
  open:  { f: [[8, 6, 8, 4], [2, 5, 7, 4], [-4, 7, 9, 5], [-10, 9, 10, 6]], th: [[36, 34], [44, 20], [50, 8], 62], cup: 0.05 },
  five:  { f: [[14, 3, 5, 3], [4, 2, 4, 2], [-6, 3, 5, 3], [-16, 5, 6, 3]], th: [[46, 24], [54, 12], [58, 4], 58], cup: 0 },
  relax: { f: [[6, 16, 20, 10], [1, 19, 24, 12], [-4, 23, 28, 14], [-9, 27, 32, 16]], th: [[30, 36], [30, 36], [24, 32], 75], cup: 0.25 },
  cup:   { f: [[5, 14, 18, 8], [1, 15, 20, 10], [-4, 18, 22, 12], [-9, 22, 26, 14]], th: [[32, 36], [34, 28], [30, 20], 70], cup: 0.45 },
  fist:  { f: [[1, 86, 98, 48], [0, 88, 100, 50], [-1, 90, 100, 50], [-3, 92, 100, 50]], th: [[16, 56], [-38, 62], [-78, 30], 115], cup: 0.85 },
  pinch: { f: [[0, 40, 44, 20], [0, 66, 78, 40], [-2, 78, 88, 44], [-4, 86, 92, 46]], th: [[24, 52], [10, 50], [0, 40], 95], thumbTo: 'index', cup: 0.55 },
  point: { f: [[4, 4, 4, 2], [0, 88, 100, 50], [-1, 90, 100, 50], [-3, 92, 100, 50]], th: [[16, 56], [-30, 62], [-70, 30], 115], cup: 0.6 },
  thumb: { f: [[1, 86, 98, 48], [0, 88, 100, 50], [-1, 90, 100, 50], [-3, 92, 100, 50]], th: [[16, 30], [8, 8], [4, -6], 85], cup: 0.8 },
};
// finger layout (hand space): knuckle x, knuckle y, radius (half-width), segment lengths [proximal, middle, distal]
const FINGERS = [
  { x: -0.0292, y: 0.0905, r: 0.0114, L: [0.035, 0.021, 0.019] },  // index
  { x: -0.0096, y: 0.0945, r: 0.0118, L: [0.038, 0.024, 0.020] },  // middle
  { x: 0.0102, y: 0.0915, r: 0.0112, L: [0.035, 0.022, 0.019] },   // ring
  { x: 0.0286, y: 0.0840, r: 0.0100, L: [0.027, 0.018, 0.016] },   // pinky
];
const THUMB = { base: [-0.028, 0.026, -0.008], r: [0.019, 0.0142, 0.0125], L: [0.033, 0.025, 0.022] };
const PALM = { c: [0, 0.052, 0], hx: 0.043, hy: 0.046, hz: 0.017 };
const D2R = Math.PI / 180;

// a pose spec: preset name | raw table | { a, b, k } blend (blends happen on joint POSITIONS, so IK'd thumbs blend cleanly)
export const resolvePose = (p) => (!p ? HAND_POSES.relax : typeof p === 'string' ? HAND_POSES[p] || HAND_POSES.relax : p);

export const makeHand = (THREE, { toon, skin = '#f2c4a0', nail = '#fbe3d6', cuff = '#17171c', mirror = false, cuffOn = true, soft = true } = {}) => {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const group = new THREE.Group();            // placed in the world by the caller
  const inner = new THREE.Group(); group.add(inner); if (mirror) inner.scale.x = -1;
  const mSkin = toon({ color: skin }), mNail = toon({ color: nail }), mCuff = toon({ color: cuff });
  if (soft) { // softer 3-tone ramp on skin: shadow / mid / light (reads rounder than the world's 2-tone ramp)
    const g = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 212, 212, 212, 255, 255, 255, 255, 255]), 3, 1); g.minFilter = g.magFilter = THREE.NearestFilter; g.needsUpdate = true;
    mSkin.gradientMap = g; mNail.gradientMap = g;
  }
  const mk = (geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; inner.add(o); return o; };

  // ---------- swept tube with an elliptical, per-sample radius profile and a hemispherical tip ----------
  const SEG_AROUND = 18;
  const sweep = (geo, pts, axis, prof, capLen) => {
    // pts: joint chain (Vector3[]), axis: lateral (bending) axis, prof(t) -> [halfWidth, halfThickness], capLen: tip radius (m)
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const nSeg = pts.length - 1, lastLen = pts[nSeg].distanceTo(pts[nSeg - 1]);
    const tc = 1 - (1 / nSeg) * Math.min(0.95, capLen / lastLen);
    const ts = []; const N1 = 34; for (let i = 0; i <= N1; i++) ts.push({ t: (tc * i) / N1, c: 1 });
    const N2 = 9; for (let i = 1; i <= N2; i++) { const ph = (i / N2) * Math.PI / 2; ts.push({ t: tc + (1 - tc) * Math.sin(ph), c: Math.cos(ph) }); }
    const pos = [], nor = [], idx = [];
    const p = V(), tg = V(), a = V(), h = V();
    for (const { t, c } of ts) {
      curve.getPoint(Math.min(t, 1), p); curve.getTangent(Math.min(Math.max(t, 1e-4), 0.9999), tg).normalize();
      a.copy(axis).addScaledVector(tg, -axis.dot(tg)).normalize(); h.crossVectors(a, tg).normalize(); // h = back (dorsal) side
      const [rw, rh] = prof(t), cc = Math.max(c, 0);
      for (let j = 0; j <= SEG_AROUND; j++) {
        const th = (j / SEG_AROUND) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
        pos.push(p.x + (a.x * cs * rw + h.x * sn * rh) * cc, p.y + (a.y * cs * rw + h.y * sn * rh) * cc, p.z + (a.z * cs * rw + h.z * sn * rh) * cc);
        // ellipse normal, tipped forward on the cap so the tip shades round
        const nx = a.x * cs / rw + h.x * sn / rh, ny = a.y * cs / rw + h.y * sn / rh, nz = a.z * cs / rw + h.z * sn / rh;
        const nl = Math.hypot(nx, ny, nz) || 1, s = Math.sqrt(Math.max(0, 1 - (1 - cc * cc)));
        const fw = c < 1 ? Math.sqrt(1 - cc * cc) : 0;
        const n = V(nx / nl * s + tg.x * fw, ny / nl * s + tg.y * fw, nz / nl * s + tg.z * fw).normalize();
        nor.push(n.x, n.y, n.z);
      }
    }
    const R = SEG_AROUND + 1;
    for (let i = 0; i < ts.length - 1; i++) for (let j = 0; j < SEG_AROUND; j++) { const A = i * R + j, B = A + R; idx.push(A, B, A + 1, B, B + 1, A + 1); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx); geo.computeBoundingSphere();
    return curve;
  };

  // ---------- palm: squared superellipsoid, wider at the knuckles, cups toward -z with `cup` ----------
  const palmGeo = new THREE.SphereGeometry(1, 40, 28);
  const palmBase = palmGeo.attributes.position.array.slice();
  const palm = mk(palmGeo, mSkin);
  const shapePalm = (cup) => {
    const P = palmGeo.attributes.position, e = 0.62;
    for (let i = 0; i < P.count; i++) {
      const ux = palmBase[i * 3], uy = palmBase[i * 3 + 1], uz = palmBase[i * 3 + 2];
      const sp = (v) => Math.sign(v) * Math.abs(v) ** e;
      let x = sp(ux) * PALM.hx, y = sp(uy) * PALM.hy, z = (Math.sign(uz) * Math.abs(uz) ** 0.8) * PALM.hz;
      const yn = (y / PALM.hy + 1) / 2;                    // 0 at the wrist edge, 1 at the knuckles
      x *= 0.8 + 0.2 * yn; z *= 1.08 - 0.16 * yn;          // narrower + thicker at the heel, flatter at the knuckles
      if (x < 0) { z += -0.004 * (1 - yn) * (-x / PALM.hx); } // thenar fullness on the thumb side (palm side)
      z -= cup * 0.012 * (x / PALM.hx) ** 2;               // palm cups: edges fold toward the palm side
      z += cup * 0.004 * (1 - (x / PALM.hx) ** 2) * (z < 0 ? 1 : 0); // and the hollow deepens
      P.setXYZ(i, x + PALM.c[0], y + PALM.c[1], z + PALM.c[2]);
    }
    P.needsUpdate = true; palmGeo.computeVertexNormals(); palmGeo.computeBoundingSphere();
  };

  // ---------- wrist + cuff ----------
  const wristGeo = new THREE.CylinderGeometry(1, 1, 1, 28, 6, true);
  { const P = wristGeo.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i) + 0.5; const k = 1 + 0.12 * y * y; P.setXYZ(i, P.getX(i) * 0.0235 * k, -0.026 + y * 0.05, P.getZ(i) * 0.0175 * k); } wristGeo.computeVertexNormals(); }
  mk(wristGeo, mSkin);
  // slim cuff band where the stick arm plugs in (elliptical like the wrist)
  const cuffM = cuffOn ? mk(new THREE.CylinderGeometry(0.0255, 0.0235, 0.016, 28), mCuff) : null;
  if (cuffM) { cuffM.position.set(0, -0.026, 0); cuffM.scale.z = 0.82; }

  // ---------- digits ----------
  const digits = [...FINGERS.map(() => ({})), {}];
  for (const d of digits) { d.geo = new THREE.BufferGeometry(); d.mesh = mk(d.geo, mSkin); d.nail = mk(new THREE.SphereGeometry(1, 18, 12), mNail); }

  const rot = (v, ax, deg) => v.clone().applyAxisAngle(ax, deg * D2R);
  const dirYP = (yaw, pit) => V(-Math.sin(yaw * D2R) * Math.cos(pit * D2R), Math.cos(yaw * D2R) * Math.cos(pit * D2R), -Math.sin(pit * D2R));
  /** joint chains (hand space) for one pose table: fingers [p0..p4] + lateral axis; thumb [p0..p4] + nail direction */
  const chainsFor = (P) => {
    const out = { cup: P.cup || 0, f: [], th: null };
    FINGERS.forEach((F, i) => {
      const [spl, a1, a2, a3] = P.f[i];
      const z0 = -out.cup * 0.006 * (Math.abs(F.x) / PALM.hx) ** 2;
      const k1 = V(F.x, F.y, z0 + 0.001);
      const d0 = rot(V(0, 1, 0), V(0, 0, 1), spl), ax = rot(V(1, 0, 0), V(0, 0, 1), spl);
      const d1 = rot(d0, ax, -a1), d2 = rot(d0, ax, -(a1 + a2)), d3 = rot(d0, ax, -(a1 + a2 + a3));
      const p0 = k1.clone().add(V(0, -0.03, 0.002)), p1 = k1.clone(), p2 = p1.clone().addScaledVector(d1, F.L[0]), p3 = p2.clone().addScaledVector(d2, F.L[1]), p4 = p3.clone().addScaledVector(d3, F.L[2]);
      out.f.push({ pts: [p0, p1, p2, p3, p4], ax });
    });
    const [s1, s2, s3, nr] = P.th, b = V(...THUMB.base);
    const d1 = dirYP(...s1), p1 = b.clone(), p0 = b.clone().addScaledVector(d1, -0.014), p2 = p1.clone().addScaledVector(d1, THUMB.L[0]);
    let p3 = p2.clone().addScaledVector(dirYP(...s2), THUMB.L[1]), p4 = p3.clone().addScaledVector(dirYP(...s3), THUMB.L[2]);
    if (P.thumbTo === 'index') {                       // 2-bone IK: tip meets the index fingertip pad
      const it = out.f[0].pts[4], ip = out.f[0].pts[3], pad = it.clone().addScaledVector(it.clone().sub(ip).normalize(), -0.006).add(V(-0.009, 0, -0.008));
      const T = pad, L1 = THUMB.L[1], L2 = THUMB.L[2], dv = T.clone().sub(p2), dl = Math.min(dv.length(), L1 + L2 - 1e-4); dv.normalize();
      const pole = V(-0.6, 0, -1).normalize(); const pn = pole.clone().addScaledVector(dv, -pole.dot(dv)).normalize();
      const ca = (L1 * L1 + dl * dl - L2 * L2) / (2 * L1 * dl), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
      p3 = p2.clone().addScaledVector(dv, L1 * ca).addScaledVector(pn, L1 * sa); p4 = p2.clone().addScaledVector(dv, dl);
    }
    const nd = rot(V(0, 0, 1), V(0, 1, 0), -nr);      // nail direction: back of hand rolled out toward -x
    out.th = { pts: [p0, p1, p2, p3, p4], nd };
    return out;
  };
  const lerpChains = (A, B, k) => ({
    cup: A.cup + (B.cup - A.cup) * k,
    f: A.f.map((c, i) => ({ pts: c.pts.map((p, j) => p.clone().lerp(B.f[i].pts[j], k)), ax: c.ax.clone().lerp(B.f[i].ax, k).normalize() })),
    th: { pts: A.th.pts.map((p, j) => p.clone().lerp(B.th.pts[j], k)), nd: A.th.nd.clone().lerp(B.th.nd, k).normalize() },
  });
  const placeNail = (nm, curve, ax, r, len, tn) => {
    const pn = curve.getPoint(tn), tg = curve.getTangent(tn).normalize();
    const a = ax.clone().addScaledVector(tg, -ax.dot(tg)).normalize(), hb = V().crossVectors(a, tg).normalize();
    nm.position.copy(pn).addScaledVector(hb, r * 0.8); nm.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, tg, hb)); nm.scale.set(r * 0.64, len, 0.0024);
  };
  let lastKey = '', cur = null, tips = [], pinchPt = V();
  const setPose = (pp) => {
    const key = JSON.stringify(pp);
    if (key === lastKey) return; lastKey = key; cur = pp;
    const C = pp && pp.a !== undefined ? lerpChains(chainsFor(resolvePose(pp.a)), chainsFor(resolvePose(pp.b ?? pp.a)), Math.max(0, Math.min(1, pp.k ?? 0))) : chainsFor(resolvePose(pp));
    shapePalm(C.cup);
    tips = [];
    FINGERS.forEach((F, i) => {
      const { pts, ax } = C.f[i], r = F.r;
      const prof = (t) => {                                         // knuckle bulges at the joints, slimmer between, taper to the tip
        const u = t * 4, bump = (c, w) => Math.exp(-(((u - c) / w) ** 2));
        const base = u < 1 ? 1.1 : 1.0 - 0.08 * Math.max(0, (u - 1) / 3);
        const k = base + 0.06 * bump(1, 0.25) + 0.05 * bump(2, 0.22) + 0.035 * bump(3, 0.2) - 0.025 * bump(1.55, 0.3) - 0.025 * bump(2.55, 0.25);
        return [r * k, r * 0.86 * k];
      };
      const curve = sweep(digits[i].geo, pts, ax, prof, r * 0.92);
      placeNail(digits[i].nail, curve, ax, r * 0.86 * 0.92, F.L[2] * 0.36, 0.9);
      tips.push(pts[4]);
    });
    { // thumb: lateral axis from the nail direction (back side = nail)
      const { pts, nd } = C.th, tg = pts[4].clone().sub(pts[2]).normalize(), ax = V().crossVectors(tg, nd).normalize();
      const prof = (t) => { const u = t * 4; const r = u < 1.5 ? THUMB.r[0] - (THUMB.r[0] - THUMB.r[1]) * Math.max(0, Math.min(1, (u - 0.7) / 0.8)) : u < 3 ? THUMB.r[1] + 0.0009 * Math.exp(-(((u - 2) / 0.25) ** 2)) : THUMB.r[2] + (THUMB.r[1] - THUMB.r[2]) * (1 - Math.min(1, u - 3)) * 0.5; return [r * 1.05, r * 0.86]; };
      const curve = sweep(digits[4].geo, pts, ax, prof, THUMB.r[2] * 0.95);
      placeNail(digits[4].nail, curve, ax, THUMB.r[2] * 0.86 * 0.95, THUMB.L[2] * 0.32, 0.88);
      tips.push(pts[4]);
    }
    pinchPt = tips[0].clone().lerp(tips[4], 0.5);
  };
  setPose('relax');
  /** hand-space grip point: 'pinch' (between thumb + index tips), 'palm' (palm centre), 'cup' (on the cupped palm), 'fist' (inside the curl),
   *  'back' (top of the back of the hand near the knuckles: where a dog's paw lands on a fist), 'knuckles' */
  const grip = (kind = 'pinch') => {
    const g = kind === 'pinch' ? pinchPt.clone() : kind === 'fist' ? V(-0.004, 0.085, -0.03) : kind === 'cup' ? V(0, 0.058, -0.027) : kind === 'knuckles' ? V(-0.002, 0.1, 0.005) : kind === 'back' ? V(0, 0.075, 0.022) : V(0, 0.055, -0.02);
    if (mirror) g.x = -g.x; return g;
  };
  const tip = (i) => { const t = tips[i].clone(); if (mirror) t.x = -t.x; return t; };
  return { group, inner, setPose, grip, tip, mirror, pose: () => cur, materials: { skin: mSkin, nail: mNail, cuff: mCuff } };
};

/** Place a hand in the world. palm: world direction the palm faces; fingers: world direction the fingers point (made
 * orthogonal to palm); grip: hand-space point (Vector3) that lands on `at`; scale: hand size. Returns world wrist + forearm direction. */
export const orientHand = (THREE, h, { at, palm, fingers, grip, scale = 1.25, roll = 0 }) => {
  const Z = new THREE.Vector3(...palm).normalize().negate();                 // back of the hand = -palm
  const Y = new THREE.Vector3(...fingers).addScaledVector(Z, -new THREE.Vector3(...fingers).dot(Z)).normalize();
  if (roll) { Y.applyAxisAngle(Z, roll); }
  const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
  const g = h.group; g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); g.scale.setScalar(scale);
  const off = (grip || new THREE.Vector3()).clone().multiplyScalar(scale).applyQuaternion(g.quaternion);
  g.position.set(...at).sub(off); g.updateMatrixWorld(true);
  const wrist = new THREE.Vector3(0, -0.04, 0).applyMatrix4(g.matrixWorld);
  return { wrist, fore: Y.clone().negate(), X, Y, Z };
};

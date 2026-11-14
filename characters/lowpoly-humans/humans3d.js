// Low-poly faceted 3D humans for the "funny dog reel" format (SKILL-FUNNY): big heads, chunky bodies, mitten hands,
// dot eyes, straight-line brows, single-line mouth. Flat colours, flat-shaded facets, no textures.
//
//   import { makeHuman, HUMANS, PELVIS_H } from './humans3d.js';
//   const owner = makeHuman(THREE, HUMANS.owner);        // or HUMANS.friend, or your own { skin, shirt, pants, shoes, hair }
//   scene.add(owner.root);
//   owner.pose({ pos, yaw, pitch, brow, mouth, ... });  // pure function of the params (reset every call)
//
// Local space: faces +z, its LEFT is +x, origin = pelvis centre. Standing: pelvis at y = PELVIS_H (soles on y = 0).
// root.rotation order is 'YXZ': yaw turns it, pitch -90 lays it on its back (face up), +90 face down.
// All angles are degrees. Everything is rebuilt from rest every call, so any frame renders on its own.
//
// pose params (all optional):
//   pos [x,y,z] (pelvis, world), yaw (rad), pitch, roll           root placement
//   lean, twist                                                    waist: + lean forward, + twist toward its left
//   head: [yaw, pitch, tilt]                                       + yaw = turn to its left, + pitch = look down
//   armL / armR: { fwd, out, elbow, twist }                       shoulder raise forward, raise sideways, elbow bend
//   legL / legR: { fwd, out, knee }                                hip swing forward, sideways, knee bend (backward)
//   brow: -1..1  (+ = angry, inner ends down; - = worried, inner ends up), browUp: 0..1 (raised = surprised)
//   mouth: { curve: -1..1 (+ smile), open: 0..1, wide: 0.6..1.4 }  single line; opens into a dark oval when talking
//   blink: 0..1, eyes: [x, y] (-1..1, gaze shift), squash: 0..1 (whole-body breath)
export const PELVIS_H = 0.83;

export const HUMANS = {
  // the owner / narrator ("you"): bald, light skin, orange t-shirt, dark pants
  owner: { skin: '#f2c9a5', shirt: '#f08a24', pants: '#2f3442', shoes: '#22252c', hair: null, ears: true },
  // the friend: short brown hair, green t-shirt
  friend: { skin: '#e9b993', shirt: '#4fa85a', pants: '#3b4a68', shoes: '#4a3427', hair: '#6b4428', ears: true },
};

export const makeHuman = (THREE, look = HUMANS.owner, { lambert = true } = {}) => {
  const D2R = Math.PI / 180;
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const M = { skin: mat(look.skin), shirt: mat(look.shirt), pants: mat(look.pants), shoes: mat(look.shoes), ink: new THREE.MeshBasicMaterial({ color: '#15121a' }),
    mouthIn: new THREE.MeshBasicMaterial({ color: '#4a1e22' }), hair: look.hair ? mat(look.hair) : null };
  const meshes = [];
  const mk = (geo, m, parent, x = 0, y = 0, z = 0, face = false) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !face; o.receiveShadow = !face; parent.add(o);
    o.userData.human = true; if (face) o.userData.face = true; meshes.push(o); return o;
  };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  // a low-poly limb segment hanging down from its joint (length L, radii r0 at the joint, r1 at the end)
  const seg = (parent, L, r0, r1, m, sides = 6) => { const g = new THREE.CylinderGeometry(r1, r0, L, sides, 1); g.translate(0, -L / 2, 0); return mk(g, m, parent); };
  const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);

  const root = new THREE.Group(); root.rotation.order = 'YXZ'; root.name = 'human';
  const body = grp(root);                                 // squash/breath scale
  // hips (pants)
  { const g = new THREE.CylinderGeometry(0.2, 0.18, 0.2, 7, 1); const m = mk(g, M.pants, body, 0, 0.0, 0); m.scale.z = 0.7; }
  // waist joint -> torso
  const waist = grp(body, 0, 0.08, 0);
  { const g = new THREE.CylinderGeometry(0.215, 0.2, 0.5, 7, 1); g.translate(0, 0.25, 0); const m = mk(g, M.shirt, waist); m.scale.z = 0.72; }
  { const g = new THREE.CylinderGeometry(0.13, 0.215, 0.07, 7, 1); g.translate(0, 0.535, 0); const m = mk(g, M.shirt, waist); m.scale.z = 0.72; } // shoulders slope
  mk(new THREE.CylinderGeometry(0.06, 0.065, 0.1, 6, 1), M.skin, waist, 0, 0.6, 0);  // neck
  // head
  const neck = grp(waist, 0, 0.6, 0);
  const head = grp(neck, 0, 0.215, 0.01);
  const HR = 0.215;
  { const m = mk(ball(HR, 1), M.skin, head); m.scale.set(1.0, 1.06, 0.98); }
  if (look.ears) for (const s of [-1, 1]) { const e = mk(ball(0.045, 0), M.skin, head, s * HR * 0.98, -0.01, -0.01); e.scale.set(0.55, 1, 0.8); }
  if (M.hair) {
    // low-poly cap: upper part of a coarse sphere, slightly bigger than the head, plus a fringe wedge
    const cap = new THREE.SphereGeometry(HR * 1.07, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const c = mk(cap, M.hair, head, 0, 0.015, -0.012); c.scale.set(1.0, 0.95, 1.0); c.rotation.x = -0.32;
    const back = new THREE.SphereGeometry(HR * 1.06, 9, 4, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.3, Math.PI * 0.24);
    mk(back, M.hair, head, 0, 0.0, -0.01);
    const fr = mk(new THREE.BoxGeometry(0.17, 0.04, 0.05), M.hair, head, 0.04, 0.175, 0.15); fr.rotation.set(0.75, 0.0, -0.22);
  }
  // face features sit on the head surface; place by spherical angles (yaw, pitch) in radians
  const onHead = (o, yaw, pit, r = HR * 1.0) => {
    o.position.set(Math.sin(yaw) * Math.cos(pit) * r, Math.sin(pit) * r * 1.06, Math.cos(yaw) * Math.cos(pit) * r * 0.98);
    o.lookAt(o.position.clone().multiplyScalar(2)); return o;
  };
  const face = grp(head);
  const eyes = [-1, 1].map((s) => { const g = new THREE.Group(); face.add(g); onHead(g, s * 0.36, 0.06, HR * 0.985); const e = mk(new THREE.SphereGeometry(0.021, 8, 6), M.ink, g, 0, 0, 0, true); e.scale.z = 0.55; return { g, e, s }; });
  const brows = [-1, 1].map((s) => { const g = new THREE.Group(); face.add(g); onHead(g, s * 0.37, 0.3, HR * 0.99); const b = mk(new THREE.BoxGeometry(0.078, 0.015, 0.016), M.ink, g, 0, 0, 0, true); return { g, b, s }; });
  const mouthG = new THREE.Group(); face.add(mouthG); onHead(mouthG, 0, -0.36, HR * 0.97);
  const mid = mk(new THREE.BoxGeometry(0.05, 0.012, 0.014), M.ink, mouthG, 0, 0, 0, true);
  const ends = [-1, 1].map((s) => { const g = new THREE.Group(); mouthG.add(g); g.position.x = s * 0.025; const m = mk(new THREE.BoxGeometry(0.036, 0.012, 0.014), M.ink, g, s * 0.017, 0, 0, true); return { g, m, s }; });
  const oval = mk(new THREE.CircleGeometry(0.03, 10), M.mouthIn, mouthG, 0, 0, 0.004, true);
  const ovalRim = mk(new THREE.RingGeometry(0.03, 0.037, 10), M.ink, mouthG, 0, 0, 0.005, true);

  // arms: shoulder -> upper arm (sleeve + skin) -> elbow -> forearm -> mitten
  const arm = (s) => {
    const sh = grp(waist, s * 0.245, 0.5, 0);
    seg(sh, 0.15, 0.085, 0.078, M.shirt, 7);
    seg(sh, 0.28, 0.062, 0.056, M.skin);
    const el = grp(sh, 0, -0.28, 0);
    seg(el, 0.24, 0.056, 0.05, M.skin);
    const hand = grp(el, 0, -0.27, 0);
    const mit = mk(ball(0.068, 1), M.skin, hand); mit.scale.set(0.78, 1.0, 0.9);
    const th = mk(ball(0.03, 0), M.skin, hand, -s * 0.0, 0.02, 0.05); th.scale.set(0.8, 1.2, 0.8);
    return { sh, el, hand, s };
  };
  const arms = { L: arm(1), R: arm(-1) };
  // legs: hip -> thigh -> knee -> shin -> shoe
  const leg = (s) => {
    const hp = grp(body, s * 0.1, -0.04, 0);
    seg(hp, 0.4, 0.092, 0.08, M.pants, 7);
    const kn = grp(hp, 0, -0.4, 0);
    seg(kn, 0.33, 0.08, 0.072, M.pants, 7);
    const ft = grp(kn, 0, -0.33, 0);
    const shoe = mk(new THREE.BoxGeometry(0.13, 0.08, 0.25, 1, 1, 1), M.shoes, ft, 0, -0.03, 0.05);
    { const p = shoe.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0 && p.getY(i) > 0) p.setY(i, p.getY(i) - 0.03); p.needsUpdate = true; shoe.geometry.computeVertexNormals(); }
    return { hp, kn, ft, s };
  };
  const legs = { L: leg(1), R: leg(-1) };

  // a prop held in the right mitten (e.g. a mug): parent anything to hold
  const holdR = grp(arms.R.hand, 0, -0.02, 0.05);

  const setArm = (A, o = {}) => {
    const out = (o.out ?? 7) * A.s, fwd = o.fwd ?? 0;
    A.sh.rotation.order = 'XYZ'; A.sh.rotation.set(-fwd * D2R, (o.twist || 0) * D2R * A.s, out * D2R);
    A.el.rotation.set(-(o.elbow ?? 8) * D2R, 0, 0);
    A.hand.rotation.set(0, (o.wrist || 0) * D2R, 0);
  };
  const setLeg = (Lg, o = {}) => {
    Lg.hp.rotation.order = 'XYZ'; Lg.hp.rotation.set(-(o.fwd || 0) * D2R, 0, (o.out ?? 2) * D2R * Lg.s);
    Lg.kn.rotation.set((o.knee || 0) * D2R, 0, 0);
    Lg.ft.rotation.set((o.ankle || 0) * D2R, 0, 0);
  };

  const pose = (o = {}) => {
    const p = o.pos || [0, PELVIS_H, 0];
    root.position.set(p[0], p[1], p[2]); root.rotation.set((o.pitch || 0) * D2R, o.yaw || 0, (o.roll || 0) * D2R);
    const sq = o.squash || 0; body.scale.set(1 + sq * 0.02, 1 - sq * 0.02, 1 + sq * 0.02);
    waist.rotation.set((o.lean || 0) * D2R, (o.twist || 0) * D2R, (o.side || 0) * D2R);
    const h = o.head || [0, 0, 0];
    neck.rotation.order = 'YXZ'; neck.rotation.set(h[1] * D2R * 0.4, h[0] * D2R * 0.4, h[2] * D2R * 0.4);
    head.rotation.order = 'YXZ'; head.rotation.set(h[1] * D2R * 0.6, h[0] * D2R * 0.6, h[2] * D2R * 0.6);
    setArm(arms.L, o.armL); setArm(arms.R, o.armR); setLeg(legs.L, o.legL); setLeg(legs.R, o.legR);
    // face
    const blink = o.blink || 0, gz = o.eyes || [0, 0];
    for (const E of eyes) { E.e.scale.set(1, Math.max(0.12, 1 - blink), 0.55); E.e.position.set(gz[0] * 0.008, gz[1] * 0.006, 0); }
    const brow = o.brow || 0, up = o.browUp || 0;
    for (const B of brows) { B.b.rotation.z = -brow * 0.32 * B.s; B.b.position.set(0, up * 0.022 - Math.abs(brow) * 0.004, 0); }
    const m = o.mouth || {}, curve = m.curve || 0, open = m.open || 0, wide = m.wide ?? 1;
    mouthG.scale.set(wide, 1, 1);
    for (const E of ends) E.g.rotation.z = curve * 0.7 * E.s;
    const showLine = open < 0.08;
    mid.visible = showLine; for (const E of ends) E.m.visible = showLine;
    oval.visible = ovalRim.visible = !showLine; const oy = 0.25 + open * 0.95;
    oval.scale.set(0.8 + open * 0.2, oy, 1); ovalRim.scale.set(0.8 + open * 0.2, oy, 1);
    root.updateMatrixWorld(true);
  };
  const W = (o) => o.getWorldPosition(new THREE.Vector3());
  return { root, pose, head, neck, waist, arms, legs, holdR, meshes, M,
    headWorld: () => W(head), handWorld: (s = 'R') => W(arms[s].hand), footWorld: (s = 'R') => W(legs[s].ft), chestWorld: () => waist.localToWorld(new THREE.Vector3(0, 0.38, 0.1)) };
};

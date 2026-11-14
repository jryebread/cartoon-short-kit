// ================= 3D TUTORIAL POINTERS (reusable) =================
// Two ways to show "where the treat goes" in a 3D dog-training scene:
//   * PAW CURSOR  - a puffy, glossy white paw with pink beans, a spinning gold halo and a soft glow. It floats just above
//                   a world point (camera-up offset), faces the camera, bobs and pulses. Use it in floating / overhead shots.
//   * POV HAND    - the trainer's hand pinching a biscuit at a world point, on a stretchy black stick-figure arm that
//                   reaches in from below the bottom of the frame (rebuilt every frame). Use it when the camera is the trainer's eyes.
// Usage (three.js r160):
//   import { makePointers } from './pointers3d.js';
//   const ptr = makePointers(THREE, scene, { toon: (o) => new THREE.MeshToonMaterial({ gradientMap, ...o }), glowTex });
//   // every frame, after the camera is placed:
//   ptr.update(camera, f, { paw: { pos: [x, y, z], s, lift, tilt, press } | null, hand: HAND | null, hand2: HAND (left hand) });
//   HAND = { at (or treat): [x,y,z] the grip point (biscuit between the fingers, inside the fist, or the palm centre),
//            pose: 'pinch' | 'fist' | 'five' | 'open' | 'cup' | 'point' | 'thumb' | 'relax' | { a, b, k } (blend, e.g. pinch -> fist),
//            face: [x,y,z] what it reaches toward / the palm faces (e.g. the dog's paw), tilt, roll (rad), side (arm base offset),
//            sag, palm / fingers: explicit world directions, grip: which hand point lands on `at` ('back' = top of a fist, see hand3d grip()). Legacy: { treat, open: true } = palm-up tray, { treat } = pinch. }
// The hand is characters/hand-3d/hand3d.js; copy it next to this file.
// glowTex: any soft radial-gradient texture (white centre -> transparent). Meshes flagged userData.ndSkip are left out of the ink pass.
import { makeHand, orientHand } from './hand3d.js';
export const makePointers = (THREE, scene, { toon, glowTex, skin = '#f2c4a0', arm = '#17171c', handScale = 1.25, armRadius = 0.02 } = {}) => {
  const M = {};
// paw cursor: a puffy, glossy white paw with pink beans, a spinning gold halo and a soft glow
M.pawW = new THREE.MeshPhongMaterial({ color: '#fbfaf7', specular: '#ffffff', shininess: 90 });
M.pawP = new THREE.MeshPhongMaterial({ color: '#ff6f94', specular: '#ffffff', shininess: 120 });
const paw = new THREE.Group(); scene.add(paw);
const pawBody = new THREE.Group(); paw.add(pawBody);
{
  const sph = (r, sx, sy, sz, m, x, y, z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; pawBody.add(o); return o; };
  sph(0.05, 1.05, 0.9, 0.62, M.pawW, 0, -0.008, 0);                                       // palm
  for (const [x, y] of [[-0.047, 0.035], [-0.017, 0.058], [0.017, 0.058], [0.047, 0.035]]) sph(0.024, 1, 1.12, 0.8, M.pawW, x, y, 0.004); // toes
  sph(0.026, 1.25, 0.95, 0.4, M.pawP, 0, -0.012, 0.027);                                  // main pad
  for (const [x, y] of [[-0.047, 0.037], [-0.017, 0.061], [0.017, 0.061], [0.047, 0.037]]) sph(0.011, 1, 1.15, 0.5, M.pawP, x, y, 0.02);  // beans
}
const halo = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 8, 64), new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: 0.9, fog: false }));
halo.userData.ndSkip = true; paw.add(halo);
const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.55 }));
glow.userData.ndSkip = true; glow.position.z = -0.03; paw.add(glow);
// POV hands: the polished posable hand from characters/hand-3d/hand3d.js (one smooth tube per finger, nails, cupping palm)
// on a stretchy black stick arm that reaches in from below the frame. Two rigs: W.hand = right hand, W.hand2 = left hand.
M.hose = toon({ color: arm });
const FAMILY = { pinch: 'reach', fist: 'reach', point: 'reach', relax: 'reach', thumb: 'reach', five: 'up', open: 'up', cup: 'tray' };
const GRIP = { pinch: 'pinch', fist: 'fist', point: 'fist', relax: 'pinch', thumb: 'fist', five: 'palm', open: 'palm', cup: 'cup' };
const rigs = [false, true].map((mirror) => { const h = makeHand(THREE, { toon, skin, mirror }); scene.add(h.group); return { h, arm: null }; });
const hand = rigs[0].h.group;
const V3 = (a) => new THREE.Vector3(...a);
const drawHand = (R, hd, camera, f) => {
  R.h.group.visible = !!hd; if (R.arm) R.arm.visible = !!hd;
  if (!hd) return;
  const fw = new THREE.Vector3(), up = new THREE.Vector3(), rt = new THREE.Vector3();
  camera.getWorldDirection(fw); up.copy(camera.up).applyQuaternion(camera.quaternion); rt.crossVectors(fw, up).normalize(); up.crossVectors(rt, fw).normalize();
  const base = camera.position.clone().addScaledVector(fw, 0.3).addScaledVector(up, -0.42).addScaledVector(rt, hd.side ?? 0.16);
  // pose: hd.pose (preset name or { a, b, k } blend); legacy: hd.open -> palm-up tray, else a pinch
  const spec = hd.pose ?? (hd.open ? 'cup' : 'pinch');
  const nm = typeof spec === 'string' ? spec : (spec.k ?? 0) < 0.5 ? spec.a : spec.b;
  R.h.setPose(spec);
  const gk = (n) => R.h.grip(GRIP[n] || 'pinch');
  const grip = hd.grip ? R.h.grip(hd.grip) : typeof spec === 'string' ? gk(spec) : gk(spec.a).lerp(gk(spec.b ?? spec.a), spec.k ?? 0);
  const at = V3(hd.at ?? hd.treat), fam = hd.mode ?? FAMILY[nm] ?? 'reach';
  let palm, fingers;
  if (fam === 'up') {          // high-five: palm faces hd.face (default: straight ahead), fingers up, tipped by hd.tilt toward it
    const tw = hd.face ? V3(hd.face).sub(at) : fw.clone(); tw.y *= 0.25; tw.normalize();
    palm = tw.clone(); fingers = new THREE.Vector3(0, 1, 0).addScaledVector(tw, hd.tilt ?? 0.15);
  } else if (fam === 'tray') { // palm up, fingers toward hd.face / away from the arm
    const tw = hd.face ? V3(hd.face).sub(at) : at.clone().sub(base); tw.y = 0; tw.normalize();
    palm = new THREE.Vector3(0, 1, 0).addScaledVector(tw, -(hd.tilt ?? 0.15)); fingers = tw;
  } else {                     // reach: fingers continue the arm toward the target, back of the hand up
    fingers = at.clone().sub(base).normalize(); fingers.y *= 0.4; if (hd.face) { const fd = V3(hd.face).sub(at); fd.y *= 0.25; fingers.lerp(fd.normalize(), 0.6); } fingers.y -= 0.12; fingers.normalize();
    palm = up.clone().negate().addScaledVector(fingers, -up.clone().negate().dot(fingers)).normalize();
  }
  if (hd.palm) palm = V3(hd.palm); if (hd.fingers) fingers = V3(hd.fingers);
  if (hd.roll) palm.applyAxisAngle(fingers.clone().normalize(), hd.roll);   // + rolls the thumb side up (right hand)
  const o = orientHand(THREE, R.h, { at: at.toArray(), palm: palm.toArray(), fingers: fingers.toArray(), grip, scale: handScale });
  // stick arm: leaves the wrist along the forearm, bows a little, ends below the frame
  const L = o.wrist.distanceTo(base);
  const c1 = o.wrist.clone().addScaledVector(o.fore, L * 0.42).addScaledVector(up, hd.sag || 0);
  const curve = new THREE.QuadraticBezierCurve3(base, c1, o.wrist.clone().addScaledVector(o.fore, -0.004));
  if (R.arm) { R.arm.geometry.dispose(); R.arm.geometry = new THREE.TubeGeometry(curve, 48, armRadius, 16, false); }
  else { R.arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, armRadius, 16, false), M.hose); R.arm.castShadow = true; scene.add(R.arm); }
};
  const update = (camera, f, W) => {
  // paw cursor (floating shots)
  const pw = W.paw; paw.visible = !!pw;
  if (pw) {
    const cu = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    paw.position.set(...pw.pos).addScaledVector(cu, pw.lift ?? 0.075 + 0.008 * Math.sin(f * 0.2)); paw.quaternion.copy(camera.quaternion);
    paw.rotateZ(pw.tilt ?? 0.18 * Math.sin(f * 0.09)); paw.rotateX(-0.35 + 0.12 * Math.sin(f * 0.13)); paw.rotateY(0.25 * Math.sin(f * 0.07));
    const pulse = 1 + 0.06 * Math.sin(f * 0.35) + (pw.press || 0) * -0.15;
    paw.scale.setScalar((pw.s || 1) * pulse);
    halo.rotation.set(1.15, 0, f * 0.12); halo.material.opacity = 0.75 + 0.2 * Math.sin(f * 0.3);
    glow.material.opacity = 0.45 + 0.15 * Math.sin(f * 0.3);
  }
  // POV hands + stretchy black arms from below the frame
  drawHand(rigs[0], W.hand, camera, f);
  drawHand(rigs[1], W.hand2 && { side: -0.16, ...W.hand2 }, camera, f);
  };
  return { paw, hand, update, rigs };
};

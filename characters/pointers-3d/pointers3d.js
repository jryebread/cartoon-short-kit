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
//   ptr.update(camera, f, { paw: { pos: [x, y, z], s, lift, tilt, press } | null, hand: { treat: [x, y, z], open, side, roll, sag, tilt } | null, hand2: same (left hand) });
// glowTex: any soft radial-gradient texture (white centre -> transparent). Meshes flagged userData.ndSkip are left out of the ink pass.
export const makePointers = (THREE, scene, { toon, glowTex, skin = '#f2c4a0', arm = '#17171c', handScale = 1.2, armRadius = 0.021 } = {}) => {
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
// POV hands: a pinch hand (biscuit pinched at the group origin, arm leaves along +z) and an open palm (palm up, biscuit
// resting on it, fingers toward the dog). Two rigs, so W.hand (right, side +0.16) and W.hand2 (left, side -0.16) can both show.
M.skin = toon({ color: skin }); M.hose = toon({ color: arm });
const part = (grp, g, m, pos, rot, sc) => { const o = new THREE.Mesh(g, m); o.position.set(...pos); if (rot) o.rotation.set(...rot); if (sc) o.scale.set(...sc); o.castShadow = true; grp.add(o); return o; };
const makePinch = () => {
  const hand = new THREE.Group(); scene.add(hand); const g = new THREE.Group(); hand.add(g); g.scale.setScalar(handScale);
  part(g, new THREE.SphereGeometry(0.05, 24, 16), M.skin, [0, 0.03, 0.075], [0.25, 0, 0], [0.95, 0.5, 1.05]);           // back of the hand
  for (const [i, x] of [-0.03, -0.01, 0.01, 0.03].entries()) {                                                         // curled fingers
    const L = i === 3 ? 0.03 : 0.042;
    part(g, new THREE.CapsuleGeometry(0.0115, L, 6, 12), M.skin, [x, 0.03, 0.03 - (i === 0 ? 0 : 0.004 * i)], [Math.PI / 2 - 0.15, 0, 0]);
    part(g, new THREE.CapsuleGeometry(0.0105, 0.02, 6, 12), M.skin, [x * 0.92, 0.013, 0.007 + 0.003 * i], [0.5, 0, 0]);
  }
  part(g, new THREE.CapsuleGeometry(0.013, 0.04, 6, 12), M.skin, [-0.046, -0.002, 0.04], [Math.PI / 2 - 0.5, -0.6, 0.2]); // thumb under
  part(g, new THREE.CylinderGeometry(0.03, 0.028, 0.03, 20), M.hose, [0, 0.035, 0.125], [Math.PI / 2 - 0.25, 0, 0]);      // black cuff
  return hand;
};
const makeOpen = (mirror) => {
  const hand = new THREE.Group(); scene.add(hand); const g = new THREE.Group(); hand.add(g); g.scale.set(mirror ? -handScale : handScale, handScale, handScale);
  part(g, new THREE.SphereGeometry(0.05, 24, 16), M.skin, [0, -0.034, 0.03], null, [1.0, 0.32, 1.15]);                    // flat palm, facing up
  for (const [i, x] of [-0.03, -0.01, 0.01, 0.03].entries())                                                            // straight fingers toward the dog
    part(g, new THREE.CapsuleGeometry(0.0105, i === 3 ? 0.03 : 0.042, 6, 12), M.skin, [x * 1.05, -0.03, -0.04 + (i === 3 ? 0.008 : 0) + (i === 0 ? 0.004 : 0)], [Math.PI / 2 + 0.12, 0, 0]);
  part(g, new THREE.CapsuleGeometry(0.012, 0.035, 6, 12), M.skin, [-0.058, -0.03, 0.01], [Math.PI / 2, 0, -0.9]);        // thumb out to the side
  part(g, new THREE.CylinderGeometry(0.03, 0.028, 0.03, 20), M.hose, [0, -0.034, 0.09], [Math.PI / 2, 0, 0]);             // black cuff
  return hand;
};
const rigs = [{ pinch: makePinch(), open: makeOpen(false), arm: null }, { pinch: makePinch(), open: makeOpen(true), arm: null }];
const hand = rigs[0].pinch;
const drawHand = (R, hd, camera, f) => {
  R.pinch.visible = !!hd && !hd.open; R.open.visible = !!hd && !!hd.open; if (R.arm) R.arm.visible = !!hd;
  if (!hd) return;
  const fw = new THREE.Vector3(), up = new THREE.Vector3(), rt = new THREE.Vector3();
  camera.getWorldDirection(fw); up.copy(camera.up).applyQuaternion(camera.quaternion); rt.crossVectors(fw, up).normalize(); up.crossVectors(rt, fw).normalize();
  const base = camera.position.clone().addScaledVector(fw, 0.3).addScaledVector(up, -0.42).addScaledVector(rt, hd.side ?? 0.16);
  const tp = new THREE.Vector3(...hd.treat), H = hd.open ? R.open : R.pinch;
  H.position.copy(tp);
  if (hd.open) { H.up.set(0, 1, 0); H.lookAt(base.x, tp.y, base.z); H.rotateX(hd.tilt ?? 0.15); }   // palm up, arm side toward the base
  else { H.up.copy(up); H.lookAt(tp.clone().lerp(base, 0.6).addScaledVector(up, 0.12)); }
  H.rotateZ(hd.roll || 0);
  H.updateMatrixWorld(true);
  const wrist = (hd.open ? new THREE.Vector3(0, -0.034, 0.1) : new THREE.Vector3(0, 0.035, 0.13)).multiplyScalar(handScale).applyMatrix4(H.matrixWorld);
  const mid = wrist.clone().lerp(base, 0.5).addScaledVector(up, 0.07 + (hd.sag || 0));
  const curve = new THREE.QuadraticBezierCurve3(base, mid, wrist);
  if (R.arm) { R.arm.geometry.dispose(); R.arm.geometry = new THREE.TubeGeometry(curve, 40, armRadius, 14, false); }
  else { R.arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, armRadius, 14, false), M.hose); R.arm.castShadow = true; scene.add(R.arm); }
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
  return { paw, hand, update };
};

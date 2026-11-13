// ================= 3D puppy rig controller (dog-puppy.glb, 45-joint skinned quadruped) =================
// Poses the GLB's skeleton procedurally every frame: blended leg/body poses, a full-body roll about the spine,
// head look-at, tail wag, ears, blink/breath morphs. Everything is a pure function of the params (no state between frames).
//
// Dog space: x = dog's LEFT, y = up, z = forward (nose). 1 unit = 1 m at scale 1 (puppy is 0.31 m tall, 0.47 m long).
//   const dog = makeDog(gltf, { scale })   -> { root (Object3D to place in the world), mesh, pose(params), headWorld(), noseWorld() }
//   dog.pose({ w: { stand, sit, down, hip, tuck, flop, nest, ... }, roll, look: Vector3|null (world), neck, tail, wag, ears, blink, breath, jaw, pedal,
//              curl (spine bend, + = toward its left), gait: { phase, amp, lift, k } (optional walk cycle) })
import * as THREE from './lib/three.module.js';

const B = {
  root: 'DogROOTSHJnt', sp1: 'Dog_Spine_01SHJnt', sp2: 'Dog_Spine_02SHJnt', sp3: 'Dog_Spine_03SHJnt', sp4: 'Dog_Spine_04SHJnt', top: 'Dog_Spine_TopSHJnt',
  n1: 'Dog_Neck_01SHJnt', n2: 'Dog_Neck_02SHJnt', head: 'Dog_Neck_TopSHJnt', jaw: 'Dog_Head_JawSHJnt',
  flC: 'Dog_l_Clavicle_01_01SHJnt', flS: 'Dog_l_FrontLeg_HipSHJnt', flE: 'Dog_l_FrontLeg_KneeSHJnt', flW: 'Dog_l_FrontLeg_AnkleSHJnt', flB: 'Dog_l_FrontLeg_BallSHJnt',
  frC: 'Dog_r_Clavicle_01_01SHJnt', frS: 'Dog_r_FrontLeg_HipSHJnt', frE: 'Dog_r_FrontLeg_KneeSHJnt', frW: 'Dog_r_FrontLeg_AnkleSHJnt', frB: 'Wolf_r_FrontLeg_BallSHJnt',
  hlH: 'Dog_l_HindLeg_HipSHJnt', hlK: 'Dog_l_HindLeg_Knee1SHJnt', hlJ: 'Wolf_l_HindLeg_Knee2SHJnt', hlA: 'Wolf_l_HindLeg_AnkleSHJnt', hlB: 'Wolf_l_HindLeg_BallSHJnt',
  hrH: 'Dog_r_HindLeg_HipSHJnt', hrK: 'Dog_r_HindLeg_Knee1SHJnt', hrJ: 'Dog_r_HindLeg_Knee2SHJnt', hrA: 'Dog_r_HindLeg_AnkleSHJnt', hrB: 'Dog_r_HindLeg_BallSHJnt',
  t1: 'Dog_Tail_01_02SHJnt', t2: 'Dog_Tail_01_03SHJnt', t3: 'Dog_Tail_01_04SHJnt', t4: 'Dog_Tail_01_05SHJnt',
  elA: 'Dog_l_Ear_01_01SHJnt', elB: 'Wolf_l_Ear_01_02SHJnt', erA: 'Dog_r_Ear_01_01SHJnt', erB: 'Dog_r_Ear_01_02SHJnt',
};
// Pose tables: per bone, rotations about dog-space axes in degrees: [ax, ay, az] applied as X then Y then Z (about the joint).
// Signs: +ax swings a downward-hanging leg BACKWARD (toward -z); +az swings it toward the dog's RIGHT (-x).
// drop = how far the hips/chest come down (m), pitch = body nose-up (deg). Mirror: right-side bones get ay, az negated.
export const POSES = {
  stand: { drop: 0, dropF: 0, pitch: 0, L: {} },
  sit: { drop: 0.105, dropF: 0.0, pitch: 34, L: {
    hlH: [-58, 0, -6], hlK: [80, 0, 0], hlJ: [-70, 0, 0], hlA: [46, 0, 0],
    flS: [30, 0, 0], flE: [0, 0, 0], flW: [-6, 0, 0], t1: [-40, 0, 0] } },
  down: { drop: 0.088, dropF: 0.088, pitch: 0, L: {
    flS: [52, 0, -4], flE: [-118, 0, 0], flW: [18, 0, 0], flB: [10, 0, 0],
    hlH: [-62, 0, -10], hlK: [96, 0, 0], hlJ: [-82, 0, 0], hlA: [50, 0, 0], t1: [-28, 0, 0], t2: [10, 0, 0] } },
  // settled on the RIGHT hip: hind legs swing out to the dog's left (+x), pelvis tilts
  hip: { drop: 0.115, dropF: 0.105, pitch: 0, rollR: -70, asym: {}, L: {
    flS: [52, 0, -4], flE: [-118, 0, 0], flW: [18, 0, 0], flB: [10, 0, 0],
    hlH: [-62, 0, 0], hlK: [96, 0, 0], hlJ: [-82, 0, 0], hlA: [50, 0, 0], t1: [-20, 0, 25] } },
  // legs tucked in for the roll itself (paws curled to the chest, hind legs folded to the belly)
  tuck: { drop: 0.1, dropF: 0.1, pitch: 0, L: {
    flS: [-5, 0, 0], flE: [-125, 0, 0], flW: [110, 0, 0], flB: [30, 0, 0],
    hlH: [-70, 0, -15], hlK: [120, 0, 0], hlJ: [-70, 0, 0], hlA: [50, 0, 0], t1: [-10, 0, 0] } },
  // relaxed legs for lying on the side / back
  flop: { drop: 0.1, dropF: 0.1, pitch: 0, L: {
    flS: [-24, 0, 0], flE: [-40, 0, 0], flW: [40, 0, 0], flB: [10, 0, 0],
    hlH: [-20, 0, 0], hlK: [40, 0, 0], hlJ: [-30, 0, 0], hlA: [30, 0, 0], t1: [-10, 0, 0] } },
  // play bow: elbows on the ground, rump up (also reads as a tug-of-war stance)
  bow: { drop: 0.0, pitch: -26, L: {
    flS: [48, 0, -4], flE: [-118, 0, 0], flW: [24, 0, 0], flB: [10, 0, 0],
    hlH: [-22, 0, 0], hlK: [10, 0, 0], hlJ: [-10, 0, 0], t1: [-35, 0, 0] } },
  // gallop cycle: blend reach (extended, flying) <-> gather (legs collected under the body) by stride phase
  reach: { drop: 0.0, pitch: 0, L: {
    flS: [-60, 0, 0], flE: [-10, 0, 0], flW: [-20, 0, 0],
    hlH: [50, 0, 0], hlK: [-10, 0, 0], hlJ: [10, 0, 0], hlA: [20, 0, 0], t1: [-10, 0, 0] } },
  gather: { drop: 0.02, pitch: 0, L: {
    flS: [45, 0, 0], flE: [-70, 0, 0], flW: [50, 0, 0],
    hlH: [-55, 0, 0], hlK: [50, 0, 0], hlJ: [-40, 0, 0], hlA: [30, 0, 0], t1: [-10, 0, 0] } },
  // curled up to sleep ("nose under the tail"): legs tucked, slight hip tilt. Use with curl ~135, wag ~-3.5 (tail wraps
  // to the left), and look at a point beside the left hip (dog space ~[0.28, 0, -0.28]) so the head turns back to the tail.
  nest: { drop: 0.115, dropF: 0.12, pitch: 0, rollR: -30, L: {
    flS: [75, 0, -10], flE: [-140, 0, 0], flW: [120, 0, 0], flB: [20, 0, 0],
    hlH: [-75, 0, -25], hlK: [125, 0, 0], hlJ: [-85, 0, 0], hlA: [50, 0, 0], t1: [-15, 0, 25] } },
};
const MIRROR = { flC: 'frC', flS: 'frS', flE: 'frE', flW: 'frW', flB: 'frB', hlH: 'hrH', hlK: 'hrK', hlJ: 'hrJ', hlA: 'hrA', hlB: 'hrB', elA: 'erA', elB: 'erB' };
// Walk cycle (optional): pose({ gait: { phase, amp, lift, k } }) adds a 4-beat walk on top of the blended legs.
// phase = step-cycle position (1.0 = one full stride; advance it with the distance walked), amp = hip swing (deg),
// lift = how high the swinging paw folds up (0..1.5), k = 0..1 blend in/out. Footfall order: LH, LF, RH, RF.
const GAIT = { flS: ['F', 0.25, 0], flE: ['F', 0.25, 1], flW: ['F', 0.25, 2], hlH: ['H', 0, 0], hlK: ['H', 0, 1], hlJ: ['H', 0, 2], hlA: ['H', 0, 3],
  frS: ['F', 0.75, 0], frE: ['F', 0.75, 1], frW: ['F', 0.75, 2], hrH: ['H', 0.5, 0], hrK: ['H', 0.5, 1], hrJ: ['H', 0.5, 2], hrA: ['H', 0.5, 3] };
const gaitAngles = (g, key) => {
  const [end, off, j] = GAIT[key], k = g.k ?? 1, A = (g.amp ?? 24) * k, L = (g.lift ?? 1) * k;
  const ph = 2 * Math.PI * (g.phase + off), swing = A * Math.sin(ph), up = Math.max(0, -Math.cos(ph)) ** 1.4 * L; // up while the leg swings forward
  if (end === 'F') return [[swing, 0, 0], [-58 * up, 0, 0], [62 * up, 0, 0]][j];
  return [[swing - 4 * up, 0, 0], [46 * up, 0, 0], [-34 * up, 0, 0], [20 * up, 0, 0]][j];
};
const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const D2R = Math.PI / 180;

export const makeDog = (gltf, { scale = 1.6 } = {}) => {
  const scene = gltf.scene;
  const root = new THREE.Group(); root.name = 'dogRoot';           // world placement (position + heading)
  const rollPivot = new THREE.Group(); root.add(rollPivot);        // roll about the spine
  const body = new THREE.Group(); rollPivot.add(body);             // offset so the pivot sits on the spine
  body.add(scene); scene.scale.multiplyScalar(scale);
  const mesh = scene.getObjectByProperty('type', 'SkinnedMesh');
  const bones = {}; for (const k in B) { bones[k] = scene.getObjectByName(B[k]); if (!bones[k]) console.log('missing bone', B[k]); }
  const rest = new Map(); scene.traverse((o) => { if (o.isBone) rest.set(o, { q: o.quaternion.clone(), p: o.position.clone() }); });
  const morph = mesh.morphTargetDictionary || {};
  const rootQ = new THREE.Quaternion(), pq = new THREE.Quaternion(), rq = new THREE.Quaternion(), axW = new THREE.Vector3(), tmp = new THREE.Vector3();
  const spineH = 0.187 * scale; // spine height when standing (m)
  scene.updateMatrixWorld(true);
  const hq0 = bones.head.getWorldQuaternion(new THREE.Quaternion());
  const snoutLocal = bones.jaw.getWorldPosition(new THREE.Vector3()).sub(bones.head.getWorldPosition(new THREE.Vector3())).normalize().applyQuaternion(hq0.clone().invert());
  const snoutLen = 0.115; // head pivot -> nose tip at scale 1 (m)
  /** rotate a bone by deg about a dog-space axis, around its own pivot */
  const rotDog = (bone, axis, deg) => {
    if (!deg) return;
    body.getWorldQuaternion(rootQ);
    axW.copy(axis).applyQuaternion(rootQ).normalize();
    bone.parent.getWorldQuaternion(pq);
    rq.setFromAxisAngle(axW, deg * D2R);
    // local' = inv(P) * R * P * local
    const l = pq.clone().invert().multiply(rq).multiply(pq).multiply(bone.quaternion);
    bone.quaternion.copy(l); bone.updateMatrixWorld(true);
  };
  const applyTriple = (key, v, mirror) => { const b = bones[key]; if (!b || !v) return; const s = mirror ? -1 : 1; rotDog(b, AX[0], v[0]); rotDog(b, AX[1], v[1] * s); rotDog(b, AX[2], v[2] * s); };
  const ORDER = ['root', 'sp1', 'sp2', 'sp3', 'sp4', 'top', 'flC', 'flS', 'flE', 'flW', 'flB', 'frC', 'frS', 'frE', 'frW', 'frB', 'n1', 'n2', 'head', 'jaw', 'elA', 'elB', 'erA', 'erB', 'hlH', 'hlK', 'hlJ', 'hlA', 'hlB', 'hrH', 'hrK', 'hrJ', 'hrA', 'hrB', 't1', 't2', 't3', 't4'];

  const pose = (o = {}) => {
    if (o.P) for (const k in o.P) POSES[k] = o.P[k];   // test hook: override pose tables
    const w = { stand: 0, sit: 0, down: 0, hip: 0, flop: 0, ...(o.w || { stand: 1 }) };
    const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1; for (const k in w) w[k] /= sum;
    // reset
    for (const [b, r] of rest) { b.quaternion.copy(r.q); b.position.copy(r.p); }
    // body height / pitch / hip roll from the blend
    let drop = 0, dropF = 0, pitch = 0, rollR = 0;
    for (const k in w) if (w[k]) { const P = POSES[k]; drop += P.drop * w[k]; dropF += (P.dropF ?? P.drop) * w[k]; pitch += P.pitch * w[k]; rollR += (P.rollR || 0) * w[k]; }
    // roll: whole body about the spine axis (z), pivot on the spine; lying = rest on the flank
    const roll = (o.roll || 0) * D2R;
    const lying = Math.min(1, Math.abs(Math.sin(roll)) * 1.4);
    const pivotH = (spineH - drop * scale) * (1 - lying) + (o.restH ?? 0.072) * scale * lying;
    rollPivot.position.set(0, pivotH, 0); rollPivot.rotation.set(0, 0, -roll);
    body.position.set(0, -spineH, 0);   // unrolled: ground ends up at -drop (the folded legs reach it)
    scene.updateMatrixWorld(true);
    // lower the body: hips via root translation, chest follows via a spine pitch so the front can stay up when sitting
    const rb = bones.root; rb.position.y = rest.get(rb).p.y; rb.updateMatrixWorld(true);
    rotDog(rb, AX[0], -pitch);
    // spine curl toward the head turn (makes the body follow the lure)
    const curl = o.curl || 0; for (const k of ['sp2', 'sp3', 'sp4']) rotDog(bones[k], AX[1], curl / 3);
    // legs (blend each bone's triple)
    const blend = (key) => { const v = [0, 0, 0]; let any = false; for (const k in w) if (w[k]) { const t = POSES[k].L[key]; if (t) { any = true; for (let i = 0; i < 3; i++) v[i] += t[i] * w[k]; } } return any ? v : null; };
    const pedal = o.pedal || 0;
    for (const key of ORDER) {
      if (key === 'root') continue;
      const isRight = Object.values(MIRROR).includes(key), src = isRight ? Object.keys(MIRROR).find((k) => MIRROR[k] === key) : key;
      let v = blend(src);
      if (pedal && /^(fl|fr|hl|hr)[SEHK]$/.test(key)) { const ph = pedal + (key[0] === 'h' ? 1.7 : 0) + (isRight ? 2.6 : 0); v = (v || [0, 0, 0]).map((x, i) => (i === 0 ? x + 16 * Math.sin(ph) : x)); }
      if (v) applyTriple(key, v, isRight);
      if (!isRight && w.hip && POSES.hip.asym) { const a = POSES.hip.asym[key]; if (a) applyTriple(key, a.map((x) => x * w.hip), false); } // one-sided: upper hind leg folds down
      if (o.gait && GAIT[key]) applyTriple(key, gaitAngles(o.gait, key), isRight);
    }
    // pelvis tips onto one hip AFTER the legs are folded (so the folded legs tip with it); the chest stays up
    if (rollR) { rotDog(rb, AX[2], -rollR); rotDog(bones.sp1, AX[2], rollR * 0.85); }
    // tail
    const wag = o.wag || 0, tailUp = o.tail ?? 0;
    for (const [i, k] of ['t1', 't2', 't3', 't4'].entries()) { rotDog(bones[k], AX[1], wag * (8 + i * 6)); if (i === 0) rotDog(bones[k], AX[0], -tailUp * 40); }
    // ears: + = flop back, - = perk
    const ears = o.ears || 0; rotDog(bones.elA, AX[0], ears * 30); rotDog(bones.erA, AX[0], ears * 30);
    // keep the head upright-ish while the body rolls (puppies lead with the head), and level when the body pitches
    const rw = roll - 2 * Math.PI * Math.round(roll / (2 * Math.PI)), cr = (o.twist ?? (o.counter ?? 70) * Math.sin(rw)) + (o.counterR ?? 0) * -rollR * w.hip;
    if (cr) { rotDog(bones.n1, AX[2], cr * 0.5); rotDog(bones.n2, AX[2], cr * 0.3); rotDog(bones.head, AX[2], cr * 0.2); }
    if (pitch) rotDog(bones.n1, AX[0], pitch * 0.7);
    const lift = (o.lift ?? -25) * Math.sin(rw); if (lift) { rotDog(bones.n1, AX[1], lift * 0.6); rotDog(bones.n2, AX[1], lift * 0.4); }
    // head look-at: split yaw / pitch across neck 1, neck 2, head (in dog space)
    if (o.look) {
      const neck = o.neck ?? 0.8;
      for (const [k, share] of [['n1', 0.3], ['n2', 0.3], ['head', 0.4]]) {
        const hb = bones.head; hb.getWorldPosition(tmp);
        const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
        const t = o.look.clone().applyMatrix4(inv), h = tmp.clone().applyMatrix4(inv), d = t.sub(h);
        // current head forward in dog space ~ +z rotated by the head bone; approximate with the neck chain's direction
        const hf = snoutLocal.clone().applyQuaternion(hb.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()).invert());
        const yawT = Math.atan2(d.x, d.z), yawC = Math.atan2(hf.x, hf.z);
        const pitT = Math.atan2(d.y, Math.hypot(d.x, d.z)), pitC = Math.atan2(hf.y, Math.hypot(hf.x, hf.z));
        let dy = yawT - yawC; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
        rotDog(bones[k], AX[1], (dy / D2R) * share * neck / (1 - (k === 'n1' ? 0 : k === 'n2' ? 0.3 : 0.6)));
        rotDog(bones[k], new THREE.Vector3(Math.cos(yawT), 0, -Math.sin(yawT)), -((pitT - pitC) / D2R) * share * neck / (1 - (k === 'n1' ? 0 : k === 'n2' ? 0.3 : 0.6)));
      }
    }
    // belly-up: tuck the chin toward the chest so the head lifts off the floor instead of hanging back
    const chin = (o.chin ?? 55) * Math.max(0, -Math.cos(rw)) ** 1.5;
    if (chin) { rotDog(bones.n1, AX[0], chin * 0.5); rotDog(bones.n2, AX[0], chin * 0.3); rotDog(bones.head, AX[0], chin * 0.2); }
    if (o.headTilt) rotDog(bones.head, AX[2], o.headTilt);
    rotDog(bones.jaw, AX[0], -(o.jaw || 0) * 22);
    // morphs
    if (mesh.morphTargetInfluences) {
      if (morph.blink !== undefined) mesh.morphTargetInfluences[morph.blink] = o.blink || 0;
      if (morph.breath !== undefined) mesh.morphTargetInfluences[morph.breath] = o.breath || 0;
    }
    scene.updateMatrixWorld(true);
  };
  const headWorld = () => bones.head.getWorldPosition(new THREE.Vector3());
  const noseWorld = () => { const h = bones.head, q = h.getWorldQuaternion(new THREE.Quaternion()); return h.getWorldPosition(new THREE.Vector3()).add(snoutLocal.clone().multiplyScalar(snoutLen * scale).applyQuaternion(q)); };
  const boneWorld = (k) => bones[k].getWorldPosition(new THREE.Vector3());
  return { root, rollPivot, body, mesh, bones, pose, headWorld, noseWorld, boneWorld, scale };
};

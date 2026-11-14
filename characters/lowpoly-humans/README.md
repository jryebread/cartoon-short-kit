# Low-poly humans (`humans3d.js`)

Faceted, flat-coloured 3D people for the funny-reel format (SKILL-FUNNY): big heads, chunky bodies, mitten hands,
dot eyes, straight-line brows, a single-line mouth. No textures. Built procedurally from three.js primitives (no GLB).

```js
import { makeHuman, HUMANS, PELVIS_H } from './humans3d.js';
const owner = makeHuman(THREE, HUMANS.owner);    // bald, orange tee, dark pants  ("you", the narrator)
const friend = makeHuman(THREE, HUMANS.friend);  // short brown hair, green tee
scene.add(owner.root);
owner.pose({ pos: [x, PELVIS_H, z], yaw, pitch: 0,       // pitch -90 = on his back, face up
  head: [yaw, pitch, tilt], lean, armL: { fwd, out, elbow }, legR: { fwd, out, knee },
  brow: 0, browUp: 0, mouth: { curve: 0, open: 0 }, blink: 0 });
friend.holdR.add(mug);   // props go in the right mitten
```

- Faces +z, its left is +x, origin = pelvis. Standing pelvis height `PELVIS_H` = 0.83 (eyes at about 1.74 m).
- Sitting on the floor: legs stay horizontal when `legs.fwd = 90 + pitch`.
- Expressions: `brow` + = angry, − = worried; `mouth.curve` + = smile; `mouth.open` turns the line into a talking oval (drive it from `VENV`).
- Ink: give every mesh in `h.meshes` a constant-normal normal/depth material (`ndFlat` in `example/dog-funny-friend/web/main.js`) so
  silhouettes get outlined but the low-poly facets don't get crease lines.
- Keep them near-still. In the funny reels the comedy is the contrast with the 3D puppy, which never stops moving.
- Worked example: `example/dog-funny-friend/`.

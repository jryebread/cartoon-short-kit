# 3D tutorial pointers (`pointers3d.js`)

How to show "where the treat goes" in a 3D dog-training scene:

- **Paw cursor**, for floating / overhead shots: a puffy, glossy white paw with pink beans, a spinning gold halo and a soft glow.
  It floats just above a world point, faces the camera, bobs and pulses.
- **POV hands**, for the trainer's-eyes shots: the polished posable hand from `../hand-3d/hand3d.js` (copy it next to this file),
  on a black stick-figure arm that stretches in from below the frame. `W.hand` = right hand, `W.hand2` = left hand.
  Poses: `pinch fist five open cup point thumb relax` or a blend `{ a, b, k }`. See `../hand-3d/README.md` for `mode`, `grip`, `face`.

```js
import { makePointers } from './pointers3d.js';
const ptr = makePointers(THREE, scene, { toon: (o) => new THREE.MeshToonMaterial({ gradientMap, ...o }), glowTex });
// each frame, after placing the camera:
ptr.update(camera, f, { paw: { pos: [x, y, z], s: 1 } /* or null */, hand: { treat: [x, y, z] } /* or null */ });
```

Draw the biscuit and the dotted trail yourself at the same world point. In the example, `worldAt(f)` returns `treat`, `trail`, `paw`
and `hand` together. Options: `skin`, `arm` (colour), `handScale` (1.25), `armRadius`; per frame: `paw.lift/tilt/press`,
`hand.at/pose/mode/grip/face/palm/fingers/side/roll/tilt/sag`. Legacy `{ treat }` = pinch and `{ treat, open: true }` = palm-up tray still work.

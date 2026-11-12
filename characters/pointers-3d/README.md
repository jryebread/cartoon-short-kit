# 3D tutorial pointers (`pointers3d.js`)

How to show "where the treat goes" in a 3D dog-training scene:

- **Paw cursor**, for floating / overhead shots: a puffy, glossy white paw with pink beans, a spinning gold halo and a soft glow.
  It floats just above a world point, faces the camera, bobs and pulses.
- **POV hand**, for the trainer's-eyes shots: his hand pinches the biscuit at a world point, on a black stick-figure arm that
  stretches in from below the frame.

```js
import { makePointers } from './pointers3d.js';
const ptr = makePointers(THREE, scene, { toon: (o) => new THREE.MeshToonMaterial({ gradientMap, ...o }), glowTex });
// each frame, after placing the camera:
ptr.update(camera, f, { paw: { pos: [x, y, z], s: 1 } /* or null */, hand: { treat: [x, y, z] } /* or null */ });
```

Draw the biscuit and the dotted trail yourself at the same world point. In the example, `worldAt(f)` returns `treat`, `trail`, `paw`
and `hand` together. Options: `skin`, `arm` (colour), `handScale`, `armRadius`; per frame: `paw.lift/tilt/press`, `hand.side/roll/sag`.

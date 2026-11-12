# The 3D puppy (`dogrig.js` + `models/dog-puppy.glb`)

A rigged golden puppy GLB: a skinned mesh with 45 joints (Maya "SHJnt" names), morph targets `breath` and `blink`, and one
idle clip (unused). It faces +z, its left side is +x, and it's 0.31 m tall. `dogrig.js` poses the skeleton procedurally
every frame. Each frame is a pure function of the params, so any frame can render on its own.

```js
import { GLTFLoader } from './lib/jsm/GLTFLoader.js';   // lib/ here: put both files in web/lib/jsm/ next to web/lib/three.module.js
import { makeDog } from './dogrig.js';
const dog = makeDog(await new GLTFLoader().loadAsync('models/dog-puppy.glb'), { scale: 1.6 });
scene.add(dog.root);
dog.root.position.set(x, y, z); dog.root.rotation.y = yaw;
dog.pose({
  w: { stand, sit, down, hip, tuck, flop },   // blended leg/body poses (weights are normalised)
  roll: -90,          // full-body roll in deg (0 upright, -90 on its right side, -180 belly-up, -360 rolled over)
  twist,              // optional head-vs-body roll (default keeps the head upright; see twistFor() in the example story)
  look: new THREE.Vector3(...),   // head follows a world point (e.g. the treat)
  neck: 0.9, headTilt: 10, jaw: 0..1, ears: -1..1, wag: -1..1, tail: 0..1, pedal, blink: 0..1, breath: 0..1,
});
dog.noseWorld(); dog.headWorld(); dog.boneWorld('root');
```

- **Poses** live in the `POSES` table (degrees about dog-space axes per bone). `hip` tips the pelvis *after* the legs fold, so
  the folded hind legs lie to one side. `tuck` curls the paws for the roll itself.
- **Ink outlines** need a skinning-aware normal/depth material. Copy `ndSkin` from `example/dog-roll-over-3d/web/main.js`.
- **Pose sheet**: `./posetest.sh out.png '[{"w":{"hip":1}}]' 6 1.5` in the example project renders poses on the GPU.
- `bash tools/add-puppy3d.sh <project>` copies this folder (and `pointers-3d/`) into a project.

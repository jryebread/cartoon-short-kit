# characters/

Reusable cast for the dog-training shorts. **These are the canonical copies.** Projects copy them into their own `web/`
folder (a project stays self-contained), so edit a character here, then refresh the project:
`./build.sh` in a 3D-dog project, or re-copy the file in a 2D project. Each folder can be copied into another repo as-is.

| Folder | What it is | Main call |
|---|---|---|
| `trainer/` | **The trainer**, the recurring host: a young, bald guy with no nose, a brown/white paw-badge cap, brown vest + white collar with a "Pawko" chest patch, black tee, jeans, brown sneakers, and black stick-figure arms that stretch | `trainerDraw(p, opts)` |
| `puppy-3d/` | **The 3D puppy**: rigged GLB (45 joints) plus `dogrig.js`, which poses it procedurally (sit, down, hip, side, full roll, look-at, wag) | `makeDog(gltf).pose(params)` |
| `pointers-3d/` | **3D tutorial pointers**: a floating glossy paw cursor, and the trainer's POV hands (from `hand-3d/`) on black stick arms | `makePointers(THREE, scene, …).update(camera, f, W)` |
| `hand-3d/` | **The polished POV hand**: smooth posable cartoon hand (pinch, fist, five, cup, point, thumb, relax, open; blendable), plus GLB exports of every pose | `makeHand(THREE, opts).setPose('fist')` |
| `lowpoly-humans/` | **Low-poly funny-reel people** (SKILL-FUNNY): the bald owner in the orange tee and the friend in the green tee; dot eyes, line brows, line mouth, mitten hands | `makeHuman(THREE, HUMANS.owner).pose({...})` |
| `collie-2d/` | The 2D collie from the first roll-over video (canvas-drawn, pseudo-3D rig) | `dogRoll(p, opts)` |

New project: `bash tools/setup.sh example/<slug>` copies the trainer and the collie. Add `bash tools/add-puppy3d.sh example/<slug>`
for the 3D puppy, pointers and hand. `example/dog-roll-over-3d/` is the full worked example that uses all of them.

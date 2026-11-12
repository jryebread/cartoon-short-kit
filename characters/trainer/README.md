# The trainer (`trainer.js`)

The host of every dog video. He's an original character: young and bald, with **no nose** (on purpose), a brown-and-white cap
with a paw badge, a brown vest with a white collar and a **"Pawko" patch on his left chest** over a black tee, blue jeans, brown sneakers, a treat pouch, a whistle and a
clicker. His arms are **black stick-figure arms** that stretch to any point (the default; `hose: false` brings back skin arms with sleeves).

He's drawn on a 2D canvas (600x1000 design units, soles at y = 975, facing screen-right; flip the card to face left) with
the Pen library in `toonbase.js` (from `vendor/toon.ts`). The file is concatenated after `toonbase.js` into a project's
`web/toon.js` and has no imports of its own.

```js
T.trainerDraw(p, {
  expr: 'grin',            // smile grin yes laugh talk oops focus patient proud
  talk: 0.6,               // lip sync 0..1      blink 0..1, look -1..1, headTilt deg, lean deg
  kneel: 1,                // 0 standing .. 1 on one knee
  far:  { to: [520, 760], hand: 'treat', rot: 20 },   // treat hand (hands: treat give palm clicker thumb point open fist wave)
  near: 'thumb',           // or a preset: hang hip wave thumb signal present
  click: 1,                // clicker button pressed
  mirror: true,            // set whenever the card is flipped (flip: true), so the patch text reads correctly and stays on his left
});
trainerShoulder(opts, 'far')   // design-space shoulder point (for aiming a hand at a world point)
```

Test sheet: in a project, `node shot.mjs cast.html#trainer stills/cast_trainer.png`. To place him in a 3D scene, see `trainerAt`,
`trainerYes` and `tD()` in `example/dog-roll-over-3d/web/story.js`. `tD()` turns a world point into a design point on his card,
so his hand lands exactly on a 3D treat.

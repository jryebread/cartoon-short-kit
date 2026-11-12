#!/usr/bin/env bash
# Refresh the reusable characters from ../../characters, then rebuild web/toon.js.
# Run after editing the trainer (characters/trainer/trainer.js), the 3D rig (characters/puppy-3d/dogrig.js)
# or the pointers (characters/pointers-3d/pointers3d.js). tutorfx.js / rolldog.js stay project-local.
cd "$(dirname "$0")"; C=../../characters
cp $C/trainer/trainer.js $C/puppy-3d/dogrig.js $C/pointers-3d/pointers3d.js web/
cat web/toonbase.js web/roman.js web/trainer.js web/rolldog.js web/tutorfx.js > web/toon.js && echo "characters synced, web/toon.js rebuilt"

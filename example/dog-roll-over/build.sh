#!/usr/bin/env bash
# rebuild web/toon.js from the cast sources (run after editing trainer.js / rolldog.js / tutorfx.js)
cd "$(dirname "$0")" && cat web/toonbase.js web/roman.js web/trainer.js web/rolldog.js web/tutorfx.js > web/toon.js && echo "web/toon.js rebuilt"

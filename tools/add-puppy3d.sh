#!/usr/bin/env bash
# Adds the rigged 3D puppy (characters/puppy-3d) and the 3D pointers (characters/pointers-3d) to a project:
#   bash tools/add-puppy3d.sh <project_dir>
# Puts dogrig.js + pointers3d.js in web/, the GLB in web/models/, and three's GLTFLoader in web/lib/jsm/.
set -e
KIT="$(cd "$(dirname "$0")/.." && pwd)"; P="${1:?project dir}"
mkdir -p "$P/web/models" "$P/web/lib/jsm"
cp "$KIT"/characters/puppy-3d/dogrig.js "$KIT"/characters/pointers-3d/pointers3d.js "$P/web/"
cp -R "$KIT"/characters/puppy-3d/models/. "$P/web/models/"
cp "$KIT"/characters/puppy-3d/lib/*.js "$P/web/lib/jsm/"
echo "added puppy-3d + pointers-3d to $P/web (see characters/puppy-3d/README.md for the main.js wiring)"

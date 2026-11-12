#!/usr/bin/env bash
# render a pose sheet: ./posetest.sh out.png '<json array of pose params>'
cd "$(dirname "$0")" && node snap.mjs "posetest.html?cols=${3:-6}&dist=${4:-2.1}#$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$2")" "$1" 1800 1000

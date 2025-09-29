#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

npm run build

# copy contents of dist/ to root of publish branch
ghp-import -f -p -b publish dist/
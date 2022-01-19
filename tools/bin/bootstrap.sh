#!/bin/bash

set -e

node --version | grep 16 || { echo "Please use node 16"; false; }

lerna bootstrap --no-ci --no-private --concurrency ${CONCURRENCY:-2} --include-dependencies "$@"

# Need to restore symlinks with `file:`` specifier
# Refer to https://github.com/lerna/lerna/issues/1679
lerna exec npm install --stream

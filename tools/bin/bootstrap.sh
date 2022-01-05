#!/bin/bash

set -e

node --version | grep 16 || { echo "Please use node 16"; false; }

lerna bootstrap --no-private --concurrency ${CONCURRENCY:-2} --include-dependencies "$@"

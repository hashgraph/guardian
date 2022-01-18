#!/bin/bash

set -ex

node --version | grep 16 || { echo "Please use node 16"; false; }

if [ "$CLEAN" = "true" ]; then
  echo "Cleaning up..."
  docker-compose down
fi

docker-compose up -d mongo

lerna run watch --parallel "$@"

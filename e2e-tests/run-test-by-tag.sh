#!/usr/bin/env bash
unset ELECTRON_RUN_AS_NODE
echo $TAG
npx cypress run --env "grepTags=$TAG,grepFilterSpecs=true"

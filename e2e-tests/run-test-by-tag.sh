#!/usr/bin/env bash
echo $TAG
npx cypress run --env grepTags=@$TAG,grepFilterSpecs=true

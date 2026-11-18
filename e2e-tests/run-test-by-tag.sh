#!/usr/bin/env bash
echo $TAG
npx cypress run --expose "grepTags=$TAG,grepFilterSpecs=true" --browser chromium

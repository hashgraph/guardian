#!/bin/bash
set -e
cd "$(dirname "$0")/.." || exit 1
export NODE_OPTIONS="--openssl-legacy-provider"

pushd interfaces || exit 1
npm run lint
popd || exit 1

pushd common || exit 1
npm run lint
popd || exit 1

pushd hedera || exit 1
npm run lint
popd || exit 1

pushd ai-service || exit 1
npm run lint
popd || exit 1

pushd logger-service || exit 1
npm run lint
popd || exit 1

pushd notification-service || exit 1
npm run lint
popd || exit 1

pushd auth-service || exit 1
npm run lint
popd || exit 1

pushd policy-service || exit 1
npm run lint
popd || exit 1

pushd guardian-service || exit 1
npm run lint
popd || exit 1

pushd worker-service || exit 1
npm run lint
popd || exit 1

pushd queue-service || exit 1
npm run lint
popd || exit 1

pushd topic-listener-service || exit 1
npm run lint
popd || exit 1

pushd api-gateway || exit 1
npm run lint
popd || exit 1
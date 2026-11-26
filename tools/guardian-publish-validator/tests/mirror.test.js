/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */
//
// Tests for mirror-node message decoding. We can't unit-test the actual HTTP
// fetch without a stub server, but extractCidFromMessage() is pure and worth
// testing in isolation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractCidFromMessage } from '../src/mirror.js';

function encodeMsg(payload) {
  return {
    message: Buffer.from(JSON.stringify(payload)).toString('base64'),
    chunk_info: { number: 1, total: 1 },
  };
}

test('extractCidFromMessage reads cid from a standard Guardian publish payload', () => {
  const msg = encodeMsg({
    id: 'abc',
    status: 'ISSUE',
    type: 'Instance-Policy',
    action: 'publish-policy',
    cid: 'bafkreib5xcmwauc2vrkcpgxvfsd6y2hfpgrd4zm6me4e5wdc6kcxwxwwoy',
    uri: 'ipfs://bafkreib5xcmwauc2vrkcpgxvfsd6y2hfpgrd4zm6me4e5wdc6kcxwxwwoy',
  });
  const { cid } = extractCidFromMessage(msg);
  assert.equal(cid, 'bafkreib5xcmwauc2vrkcpgxvfsd6y2hfpgrd4zm6me4e5wdc6kcxwxwwoy');
});

test('extractCidFromMessage falls back to parsing the uri when cid is missing', () => {
  const msg = encodeMsg({
    uri: 'ipfs://QmRCsLFpxLsiuNfs42QGn5oV41wqEjMKbV3RhGxK3Mo6vc',
  });
  const { cid } = extractCidFromMessage(msg);
  assert.equal(cid, 'QmRCsLFpxLsiuNfs42QGn5oV41wqEjMKbV3RhGxK3Mo6vc');
});

test('extractCidFromMessage handles multi-chunk messages by reporting them rather than parsing partial JSON', () => {
  const msg = {
    message: Buffer.from('{"id":').toString('base64'), // partial JSON
    chunk_info: { number: 1, total: 3 },
  };
  const result = extractCidFromMessage(msg);
  assert.equal(result.cid, null);
  assert.equal(result.reason, 'multi-chunk-message');
});

test('extractCidFromMessage returns null on a malformed payload without throwing', () => {
  const msg = {
    message: Buffer.from('not json').toString('base64'),
    chunk_info: { number: 1, total: 1 },
  };
  const result = extractCidFromMessage(msg);
  assert.equal(result.cid, null);
  assert.match(result.reason, /payload-parse-error/);
});

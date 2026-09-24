/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */
//
// Unit tests for the README markdown-table parser. The parser is one of the
// trickier pieces of the validator because real Guardian framework READMEs
// have inconsistent column orderings and ambiguous header names. These tests
// cover the column-classification heuristics and the markdown-link cleanup.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { scanManifests } from '../src/manifests.js';

function mkTempLibrary(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpv-test-'));
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
  return root;
}

test('parses a basic policy timestamp table', () => {
  const root = mkTempLibrary({
    'CDM/readme.md': `
# CDM

| Policy | Testnet Timestamp | Mainnet Timestamp | Schema/Policy File Link |
|---|---|---|---:|
| AMS-II.G | 1726671907.504639000 | 1713216985.019528003 | [Link](https://example.com/AMS-II.G.policy) |
| AMS-II.J | 1712067497.011072374 | 1713216612.286089221 | [Link](https://example.com/AMS-II.J.policy) |
`,
  });
  const entries = scanManifests(root);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, 'AMS-II.G');
  assert.equal(entries[0].testnetTs, '1726671907.504639000');
  assert.equal(entries[0].mainnetTs, '1713216985.019528003');
  assert.equal(entries[0].type, 'policy');
  assert.equal(entries[0].framework, 'CDM');
  assert.equal(entries[0].link, 'https://example.com/AMS-II.G.policy');
});

test('parses a tool timestamp table (different column layout)', () => {
  const root = mkTempLibrary({
    'CDM/Tools/readme.md': `
| Tool Number | Description | IPFS Timestamp |
|---|---|---:|
| Tool 9 | Tool for energy systems | 1713221704.169952003 |
| Tool 33 | Tool for default values | 1726593517.484578000 |
`,
  });
  const entries = scanManifests(root);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, 'Tool 9');
  assert.equal(entries[0].type, 'tool');
  assert.equal(entries[0].testnetTs, '1713221704.169952003');
});

test('column-name heuristic does not pick "Schema/Policy File Link" as the name column', () => {
  // Bug from prior version: "Schema/Policy File Link" matched isLikelyName
  // because it contains "policy", causing names to be derived from the URL.
  const root = mkTempLibrary({
    'iREC/readme.md': `
| Version | IPFS Timestamp | Differences | Schema/Policy File Link |
|---|---|---|---:|
| MRV Schema | 1674826707.124031003 | - | [Link](https://example.com/MRV.schema) |
`,
  });
  const entries = scanManifests(root);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'MRV Schema'); // not "MRV.schema" from the URL
});

test('drops truncated timestamps (< 6 nanos digits) to avoid false hedera-missing results', () => {
  const root = mkTempLibrary({
    'Verra/readme.md': `
| Tool | Timestamp |
|---|---|
| Tool 3 | 1706867833.67638 |
| Tool 5 | 1706867833.676380123 |
`,
  });
  const entries = scanManifests(root);
  // The truncated 5-nanos entry is dropped; the proper 9-nanos one is kept.
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'Tool 5');
});

test('handles markdown link as the name cell with non-trivial link text', () => {
  const root = mkTempLibrary({
    'Verra/VM0003/README.md': `
| Schema | Testnet Timestamp |
|---|---|
| [Verra VM0003 Policy](https://example.com/VM0003.policy) | 1728491334.273105000 |
`,
  });
  const entries = scanManifests(root);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'Verra VM0003 Policy');
  assert.equal(entries[0].link, 'https://example.com/VM0003.policy');
});

test('handles markdown link as the name cell with "Link" placeholder text', () => {
  const root = mkTempLibrary({
    'GS/readme.md': `
| Schema | Testnet Timestamp | Link |
|---|---|---|
| Gold Standard AR | 1707206651.379730003 | [Link](https://example.com/path/Gold%20Standard%20AR.policy) |
`,
  });
  const entries = scanManifests(root);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'Gold Standard AR');
});

test('ignores rows with no timestamp at all', () => {
  const root = mkTempLibrary({
    'X/readme.md': `
| Policy | Testnet Timestamp |
|---|---|
| Real Entry | 1707206651.379730003 |
| Placeholder | TBD |
| Empty |  |
`,
  });
  const entries = scanManifests(root);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'Real Entry');
});

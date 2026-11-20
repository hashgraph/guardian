/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */
//
// Tests for the library walker — finding archives, reading their manifest,
// extracting tool references from the policy.json tools array AND from any
// embedded tools/*.json files.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import AdmZip from 'adm-zip';

import { findArchives, readArchive, extractToolRefs } from '../src/library.js';

// Build a minimal .policy archive in a temp dir for testing.
function makePolicyArchive(dir, name, manifest, embedded = {}) {
  const zip = new AdmZip();
  zip.addFile('policy.json', Buffer.from(JSON.stringify(manifest)));
  for (const [filename, contents] of Object.entries(embedded)) {
    zip.addFile(`tools/${filename}`, Buffer.from(JSON.stringify(contents)));
  }
  const full = path.join(dir, name);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  zip.writeZip(full);
  return full;
}

test('findArchives discovers .policy and .tool files recursively', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpv-test-'));
  makePolicyArchive(root, 'CDM/AMS-II.G/policy.policy', { tools: [] });
  makePolicyArchive(root, 'Verra/VM0003/policy.policy', { tools: [] });
  makePolicyArchive(root, 'Tools/Tool07/tool.tool', { tools: [] });

  const archives = findArchives(root);
  assert.equal(archives.length, 3);
  assert.ok(archives[0].endsWith('.policy') || archives[0].endsWith('.tool'));
});

test('extractToolRefs reads the manifest.tools array', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpv-test-'));
  const archive = makePolicyArchive(root, 'CDM/AMS-II.G/policy.policy', {
    tools: [
      { name: 'Tool 33', topicId: '0.0.4865949', messageId: '1726593517.484578000' },
      { name: 'Tool 19', topicId: '0.0.2196124', messageId: '1706869798.177938003' },
    ],
  });
  const refs = extractToolRefs(readArchive(archive));
  assert.equal(refs.length, 2);
  assert.equal(refs[0].name, 'Tool 33');
  assert.equal(refs[0].topicId, '0.0.4865949');
  assert.equal(refs[0].messageId, '1726593517.484578000');
});

test('extractToolRefs dedupes references that appear both in manifest.tools and embedded tool files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpv-test-'));
  const archive = makePolicyArchive(
    root,
    'CDM/AMS-II.G/policy.policy',
    {
      tools: [
        { name: 'Tool 30', topicId: '0.0.3039186', messageId: '1707417996.173398196' },
      ],
    },
    {
      // Embedded tool JSON with the same messageId — should be merged into
      // a single entry with multiple occurrences, not counted twice.
      'abc123.json': {
        name: 'Tool 30',
        messageId: '1707417996.173398196',
        hash: 'abc123',
      },
    }
  );
  const refs = extractToolRefs(readArchive(archive));
  assert.equal(refs.length, 1);
  assert.equal(refs[0].messageId, '1707417996.173398196');
  // Both occurrences are recorded.
  assert.ok(refs[0].locations.length >= 2);
});

test('readArchive returns null manifest gracefully on a non-Guardian zip', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpv-test-'));
  // Zip with a random file — no policy.json / tool.json.
  const zip = new AdmZip();
  zip.addFile('random.txt', Buffer.from('hello'));
  const archive = path.join(root, 'random.policy');
  zip.writeZip(archive);

  const info = readArchive(archive);
  assert.equal(info.manifest, null);
  assert.equal(extractToolRefs(info).length, 0);
});

/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Auto-fetch and cache an upstream Guardian methodology library clone.
//
// First run for a given repo+branch does a shallow clone into
//   ~/.cache/guardian-tool-validator/<owner-repo>/<branch>
// Subsequent runs `git fetch` + `git reset --hard origin/<branch>` to refresh.
//
// The validator and the UI server both call ensureUpstreamCheckout() so end
// users don't have to manage a local clone manually. Power users can still
// override with --path to point at a custom directory (their own fork,
// in-development work, etc.).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const DEFAULT_CACHE_ROOT = path.join(os.homedir(), '.cache', 'guardian-tool-validator');

function slugify(repo) {
  return repo.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function exec(cmd, args, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const onData = (buf) => onProgress?.(buf.toString('utf8'));
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
    child.on('error', reject);
  });
}

// Ensure the upstream repo is cloned and up to date. Returns the path to the
// "Methodology Library" directory inside the clone.
export async function ensureUpstreamCheckout({
  repo = 'hashgraph/guardian',
  branch = 'main',
  cacheRoot = DEFAULT_CACHE_ROOT,
  onProgress = null,
  subpath = 'Methodology Library',
} = {}) {
  const slug = slugify(repo);
  const dir = path.join(cacheRoot, slug, branch);
  fs.mkdirSync(path.dirname(dir), { recursive: true });

  if (!fs.existsSync(path.join(dir, '.git'))) {
    onProgress?.(`Cloning ${repo}@${branch} → ${dir}\n`);
    await exec(
      'git',
      ['clone', '--depth', '1', '--branch', branch, `https://github.com/${repo}.git`, dir],
      onProgress
    );
  } else {
    onProgress?.(`Updating ${repo}@${branch} in ${dir}\n`);
    try {
      await exec('git', ['-C', dir, 'fetch', '--depth', '1', 'origin', branch], onProgress);
      await exec('git', ['-C', dir, 'reset', '--hard', `origin/${branch}`], onProgress);
    } catch (err) {
      // If fetch/reset fails (e.g., shallow-clone corruption), wipe and re-clone.
      onProgress?.(`Update failed (${err.message}). Re-cloning...\n`);
      fs.rmSync(dir, { recursive: true, force: true });
      await exec(
        'git',
        ['clone', '--depth', '1', '--branch', branch, `https://github.com/${repo}.git`, dir],
        onProgress
      );
    }
  }

  const libraryPath = path.join(dir, subpath);
  if (!fs.existsSync(libraryPath)) {
    throw new Error(`"${subpath}" not found in ${repo}@${branch} (looked in ${libraryPath})`);
  }
  return libraryPath;
}

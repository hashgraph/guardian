#!/usr/bin/env node
import { rmSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const COV_DIR_V8 = './coverage-raw';
const COV_DIR_C8 = './coverage';
const ROOT = './dist';
const TESTS_GLOB = process.argv[2] || process.env.TESTS_GLOB || 'tests/**/*.test.mjs';
const COVERAGE_MODE = (process.env.COVERAGE_MODE || 'v8').toLowerCase();

// ── bin resolution (walks up like the existing mocha lookup) ──────────────
function resolveBin(name) {
    const ext = process.platform === 'win32' ? '.cmd' : '';
    const probe = (p) => existsSync(path.join(p, 'node_modules', '.bin', `${name}${ext}`))
        ? path.join(p, 'node_modules', '.bin', `${name}${ext}`)
        : null;
    let dir = process.cwd();
    for (let i = 0; i < 6; i++) {
        const hit = probe(dir);
        if (hit) return hit;
        dir = path.dirname(dir);
    }
    const sibling = path.resolve(process.cwd(), '..', '..', 'guardian');
    return probe(sibling);
}

const mocha = resolveBin('mocha') || (process.platform === 'win32' ? 'mocha.cmd' : 'mocha');
const c8Bin = resolveBin('c8'); // null if not installed

if (COVERAGE_MODE === 'c8' && !c8Bin) {
    console.error('[run-coverage] COVERAGE_MODE=c8 but c8 is not installed at the workspace root.');
    process.exit(2);
}
const c8 = (COVERAGE_MODE === 'c8' || (COVERAGE_MODE === 'auto' && c8Bin)) ? c8Bin : null;

function resolveC8Config() {
    if (!c8) return null;
    const workspaceRoot = path.resolve(path.dirname(c8), '..', '..');
    const cfg = path.join(workspaceRoot, '.c8rc.json');
    return existsSync(cfg) ? cfg : null;
}
const c8Config = resolveC8Config();

// ── clean previous output ─────────────────────────────────────────────────
for (const dir of [COV_DIR_V8, COV_DIR_C8, '.c8']) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

let mochaResult;

if (c8) {
    // ── c8 mode ───────────────────────────────────────────────────────────
    // Reporters:
    //   text          → console
    //   json-summary  → coverage/coverage-summary.json (consumed by reporter wrapper)
    //   cobertura     → coverage/cobertura-coverage.xml (Codecov)
    //   lcov          → coverage/lcov.info (alt Codecov / Coveralls)
    mkdirSync(COV_DIR_C8, { recursive: true });
    const c8Args = [
        '--reporter=text-summary',
        '--reporter=json-summary',
        '--reporter=cobertura',
        '--reporter=lcov',
        `--report-dir=${COV_DIR_C8}`,
        '--temp-directory=.c8',
        '--all',          // include un-touched files (true coverage, not just exercised)
    ];
    if (c8Config) c8Args.push(`--config=${c8Config}`);
    c8Args.push(mocha, TESTS_GLOB, '--exit');
    mochaResult = spawnSync(c8, c8Args, { stdio: 'inherit', shell: process.platform === 'win32' });
} else {
    // ── V8 path (current default) ────────────────────────────────────────
    if (!c8Bin) {
        console.warn(
            '[run-coverage] c8 not found in workspace node_modules; using V8 fallback. ' +
            'Run `yarn install` at the workspace root to make c8 opt-in available.'
        );
    }
    const env = { ...process.env, NODE_V8_COVERAGE: COV_DIR_V8 };
    mochaResult = spawnSync(
        mocha,
        [TESTS_GLOB, '--exit'],
        { stdio: 'inherit', env, shell: process.platform === 'win32' }
    );
}

// ── reporter wrapper (parses c8 JSON when present, falls back to V8 ranges) ──
const reporter = path.join('tests', 'coverage-report.mjs');
const reportResult = spawnSync(
    process.execPath,
    [reporter, c8 ? COV_DIR_C8 : COV_DIR_V8, ROOT],
    { stdio: 'inherit', env: { ...process.env, COVERAGE_MODE: c8 ? 'c8' : 'v8' } }
);

process.exit(mochaResult.status || reportResult.status || 0);

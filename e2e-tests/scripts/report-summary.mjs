#!/usr/bin/env node
/**
 * Renders the Cypress results as a per-spec markdown table into the GitHub job
 * summary, so the Actions page shows the same breakdown the CLI prints instead of
 * bare totals.
 *
 * Reads the per-spec mochawesome JSONs that cypress-mochawesome-reporter writes to
 * cypress/reports/html/.jsons. That directory only survives because reporter-config.js
 * sets `removeJsonsFolderAfterMerge: false` (the option defaults to true, see
 * node_modules/cypress-mochawesome-reporter/lib/config.js).
 *
 * Run it *after* .github/scripts/redact.mjs: failure messages are echoed into the
 * summary and would otherwise carry the bearer tokens of failed cy.request calls.
 *
 * Usage:
 *   node scripts/report-summary.mjs [jsonsDir]
 *   GITHUB_STEP_SUMMARY=/tmp/s.md node scripts/report-summary.mjs   # local preview
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const e2eRoot = path.resolve(here, '..');
const jsonsDir = process.argv[2] || path.join(e2eRoot, 'cypress', 'reports', 'html', '.jsons');

let redact = (text) => text;
try {
    ({ redact } = await import(path.resolve(e2eRoot, '..', '.github', 'scripts', 'redact.mjs')));
} catch {
    // Standalone checkout of e2e-tests: fall through with a no-op and rely on the
    // workflow's own redaction step having already cleaned these files.
}

/** Depth-first walk of the mochawesome suite tree. */
function collectTests(node, out = []) {
    for (const test of node.tests || []) {
        out.push(test);
    }
    for (const suite of node.suites || []) {
        collectTests(suite, out);
    }
    return out;
}

function stateOf(test) {
    if (test.state) {
        return test.state;
    }
    if (test.fail) {
        return 'failed';
    }
    if (test.pending) {
        return 'pending';
    }
    if (test.pass) {
        return 'passed';
    }
    return 'skipped';
}

function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
        return '-';
    }
    if (ms < 1000) {
        return `${ms}ms`;
    }
    if (ms < 60_000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.round((ms % 60_000) / 1000);
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function firstErrorLine(test) {
    const raw = test.err?.message || test.err?.estack || '';
    const line = String(raw).split('\n').map((l) => l.trim()).find(Boolean) || 'no error message';
    return redact(line).replace(/\|/g, '\\|').slice(0, 220);
}

function shortSpec(file) {
    return String(file || 'unknown spec').replace(/^cypress\/e2e\//, '');
}

/* --------------------------------------------------------------------- gather */

if (!fs.existsSync(jsonsDir)) {
    emit([`::warning::No mochawesome JSONs at ${jsonsDir}; skipping the E2E summary table.`]);
    process.exit(0);
}

const files = fs.readdirSync(jsonsDir).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
    emit([`::warning::${jsonsDir} is empty; Cypress may have crashed before writing any results.`]);
    process.exit(0);
}

const specs = [];
for (const file of files) {
    let report;
    try {
        report = JSON.parse(fs.readFileSync(path.join(jsonsDir, file), 'utf8'));
    } catch (error) {
        console.log(`::warning::could not parse ${file}: ${error.message}`);
        continue;
    }
    for (const result of report.results || []) {
        const tests = collectTests(result);
        if (tests.length === 0) {
            continue;
        }
        const counts = { passed: 0, failed: 0, pending: 0, skipped: 0 };
        for (const test of tests) {
            const state = stateOf(test);
            counts[state] = (counts[state] || 0) + 1;
        }
        specs.push({
            spec: shortSpec(result.fullFile || result.file),
            tests: tests.length,
            ...counts,
            duration: tests.reduce((sum, t) => sum + (t.duration || 0), 0),
            failures: tests.filter((t) => stateOf(t) === 'failed'),
        });
    }
}

if (specs.length === 0) {
    emit(['::warning::No test results were found in the mochawesome JSONs.']);
    process.exit(0);
}

/* ---------------------------------------------------------------------- render */

const total = specs.reduce((acc, s) => ({
    tests: acc.tests + s.tests,
    passed: acc.passed + s.passed,
    failed: acc.failed + s.failed,
    pending: acc.pending + s.pending,
    skipped: acc.skipped + s.skipped,
    duration: acc.duration + s.duration,
}), { tests: 0, passed: 0, failed: 0, pending: 0, skipped: 0, duration: 0 });

// Failing specs first, then slowest, so the interesting rows are at the top.
specs.sort((a, b) => (b.failed - a.failed) || (b.duration - a.duration));

const lines = [];
lines.push(`## Cypress results${process.env.CYPRESS_grepTags ? ` — \`${process.env.CYPRESS_grepTags}\`` : ''}`);
lines.push('');
lines.push(
    `**${specs.length} spec${specs.length === 1 ? '' : 's'} · ${total.tests} tests · ` +
    `✅ ${total.passed} passed · ${total.failed > 0 ? '❌' : '·'} ${total.failed} failed · ` +
    `⚠️ ${total.pending} pending · ⏭️ ${total.skipped} skipped · ${formatDuration(total.duration)}**`,
);
lines.push('');
lines.push('| | Spec | Tests | ✅ | ❌ | ⚠️ | Duration |');
lines.push('|---|---|---:|---:|---:|---:|---:|');
for (const s of specs) {
    lines.push(
        `| ${s.failed > 0 ? '❌' : '✅'} | \`${s.spec}\` | ${s.tests} | ${s.passed} | ` +
        `${s.failed} | ${s.pending} | ${formatDuration(s.duration)} |`,
    );
}

const failing = specs.filter((s) => s.failed > 0);
if (failing.length > 0) {
    lines.push('');
    lines.push(`<details><summary>❌ ${total.failed} failing test${total.failed === 1 ? '' : 's'}</summary>`);
    lines.push('');
    for (const s of failing) {
        lines.push(`**\`${s.spec}\`**`);
        lines.push('');
        for (const test of s.failures) {
            lines.push(`- \`${redact(test.fullTitle || test.title || 'untitled')}\``);
            lines.push(`  - ${firstErrorLine(test)}`);
        }
        lines.push('');
    }
    lines.push('</details>');
}

emit(lines);

function emit(content) {
    const text = `${content.join('\n')}\n`;
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
    }
}

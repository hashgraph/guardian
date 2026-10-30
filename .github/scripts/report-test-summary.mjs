#!/usr/bin/env node
/**
 * Renders the unit-test results as a per-workspace markdown table in the GitHub
 * job summary -- a local replacement for the step-security/publish-unit-test-result-action
 * check run.
 *
 * Every workspace's mocha run already writes JUnit XML to test_results/<workspace>.xml
 * at the repo root (see the `test` scripts in the package.json files). This
 * aggregates those files and appends the table to $GITHUB_STEP_SUMMARY in CI.
 *
 * The shape mocha-junit-reporter emits is flat enough to parse without an XML
 * dependency: passed cases are empty <testcase> elements, failed ones carry a
 * <failure>/<error> child, and pending cases are absent from the file unless
 * includePending was set -- but the <testsuites> `tests` attribute counts them
 * either way, so the pending count is derived as the difference.
 *
 * Usage:
 *   node .github/scripts/report-test-summary.mjs [resultsDir]
 *   GITHUB_STEP_SUMMARY=/tmp/s.md node .github/scripts/report-test-summary.mjs   # local preview
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact } from './redact.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '..', '..');

function attr(tag, key) {
    const match = tag.match(new RegExp(`\\b${key}="([^"]*)"`));
    return match ? match[1] : '';
}

function unescapeXml(text) {
    return String(text)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

/** First non-empty line, secrets scrubbed, table-safe, length-capped. */
function firstErrorLine(raw) {
    const line = unescapeXml(raw || '').split('\n').map((l) => l.trim()).find(Boolean) || 'no error message';
    return redact(line).replace(/\|/g, '\\|').slice(0, 220);
}

function escapeCell(text) {
    return unescapeXml(text).replace(/\|/g, '\\|').slice(0, 160);
}

/**
 * Walks every <testcase> in a JUnit document. Passed cases are empty or
 * self-closing, failed ones carry <failure>/<error>, skipped ones <skipped/>.
 */
export function parseJUnit(xmlText) {
    const cases = [];
    const re = /<testcase\b([^>]*?)\/>|<testcase\b([^>]*?)>([\s\S]*?)<\/testcase>/g;
    for (const m of xmlText.matchAll(re)) {
        const tagAttrs = m[1] ?? m[2];
        const body = m[3] ?? '';
        let state = 'passed';
        if (/<(?:failure|error)\b/.test(body)) {
            state = 'failed';
        } else if (/<skipped\b/.test(body)) {
            state = 'skipped';
        }

        const entry = {
            name: unescapeXml(attr(tagAttrs, 'name')),
            timeMs: (parseFloat(attr(tagAttrs, 'time')) || 0) * 1000,
            state,
        };
        if (state === 'failed') {
            const messageAttr = body.match(/<(?:failure|error)\b[^>]*?\bmessage="([^"]*)"/);
            const element = body.match(/<(?:failure|error)\b[^>]*?>([\s\S]*?)<\/(?:failure|error)>/);
            entry.message = firstErrorLine(messageAttr ? messageAttr[1] : element ? element[1] : '');
        }
        cases.push(entry);
    }
    return cases;
}

/**
 * Aggregates one mocha report file into the row for the summary table.
 */
export function summarizeReport(file, xmlText) {
    const cases = parseJUnit(xmlText);
    const root = xmlText.match(/<testsuites\b[^>]*>/);
    const declared = root ? parseFloat(attr(root[0], 'tests')) || 0 : 0;

    const skipped = cases.filter((c) => c.state === 'skipped').length;
    // Pending cases are not written to the file unless includePending was set,
    // but mocha counts them in the `tests` attribute, so the difference is them.
    const pending = Math.max(0, declared - cases.length);
    const failures = cases.filter((c) => c.state === 'failed');

    return {
        workspace: path.basename(file).replace(/\.xml$/i, ''),
        tests: Math.max(declared, cases.length),
        passed: cases.filter((c) => c.state === 'passed').length,
        failed: failures.length,
        skipped: skipped + pending,
        durationMs: cases.reduce((sum, c) => sum + c.timeMs, 0),
        failures: failures.map((c) => ({ name: c.name, message: c.message })),
    };
}

export function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
        return '-';
    }
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    if (ms < 60_000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.round((ms % 60_000) / 1000);
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Renders the per-workspace table plus a details block for failing tests.
 * Failing workspaces first, then slowest, so the interesting rows are on top.
 */
export function renderSummary(reports) {
    const total = reports.reduce((acc, r) => ({
        workspaces: acc.workspaces + 1,
        tests: acc.tests + r.tests,
        passed: acc.passed + r.passed,
        failed: acc.failed + r.failed,
        skipped: acc.skipped + r.skipped,
        durationMs: acc.durationMs + r.durationMs,
    }), { workspaces: 0, tests: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 });

    const sorted = [...reports].sort((a, b) => (b.failed - a.failed) || (b.durationMs - a.durationMs));

    const lines = [];
    lines.push('## Unit test results');
    lines.push('');
    lines.push(
        `**${total.workspaces} workspaces · ${total.tests} tests · ` +
        `✅ ${total.passed} passed · ${total.failed > 0 ? '❌' : '·'} ${total.failed} failed · ` +
        `⏭️ ${total.skipped} skipped · ${formatDuration(total.durationMs)}**`,
    );
    lines.push('');
    lines.push('| | Workspace | Tests | ✅ | ❌ | ⏭️ | Duration |');
    lines.push('|---|---|---:|---:|---:|---:|---:|');
    for (const r of sorted) {
        lines.push(
            `| ${r.failed > 0 ? '❌' : '✅'} | \`${escapeCell(r.workspace)}\` | ${r.tests} | ${r.passed} | ` +
            `${r.failed} | ${r.skipped} | ${formatDuration(r.durationMs)} |`,
        );
    }

    const failing = sorted.filter((r) => r.failed > 0);
    if (failing.length > 0) {
        lines.push('');
        lines.push(`<details><summary>❌ ${total.failed} failing test${total.failed === 1 ? '' : 's'}</summary>`);
        lines.push('');
        for (const r of failing) {
            lines.push(`**\`${escapeCell(r.workspace)}\`**`);
            lines.push('');
            for (const f of r.failures) {
                lines.push(`- \`${escapeCell(f.name)}\``);
                lines.push(`  - ${f.message}`);
            }
            lines.push('');
        }
        lines.push('</details>');
    }

    return lines;
}

function emit(lines) {
    const text = `${lines.join('\n')}\n`;
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
    }
}

function* walk(target) {
    let stat;
    try {
        stat = fs.statSync(target);
    } catch {
        return;
    }
    if (stat.isFile()) {
        yield target;
        return;
    }
    if (!stat.isDirectory()) {
        return;
    }
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules') {
                yield* walk(path.join(target, entry.name));
            }
        } else if (entry.isFile()) {
            yield path.join(target, entry.name);
        }
    }
}

function main(argv) {
    const resultsDir = argv[0] ? path.resolve(argv[0]) : path.join(REPO_ROOT, 'test_results');

    if (!fs.existsSync(resultsDir)) {
        console.log(`::warning::No test results at ${resultsDir}; skipping the summary table.`);
        return 0;
    }

    const files = [...walk(resultsDir)].filter((f) => f.toLowerCase().endsWith('.xml'));
    if (files.length === 0) {
        console.log(`::warning::${resultsDir} contains no JUnit XML files; the tests may have failed before mocha ran.`);
        return 0;
    }

    const reports = [];
    for (const file of files) {
        let text;
        try {
            text = fs.readFileSync(file, 'utf8');
        } catch (error) {
            console.log(`::warning::could not read ${path.relative(REPO_ROOT, file)}: ${error.message}`);
            continue;
        }
        reports.push(summarizeReport(file, text));
    }

    if (reports.length === 0) {
        console.log(`::warning::No JUnit XML files could be read from ${resultsDir}; skipping the summary table.`);
        return 0;
    }

    emit(renderSummary(reports));
    return 0;
}

// Run as a CLI only when invoked directly; the functions above stay importable
// from report-test-summary.test.mjs (same pattern as redact.mjs).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    process.exit(main(process.argv.slice(2)));
}

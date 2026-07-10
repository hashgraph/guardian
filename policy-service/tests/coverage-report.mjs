#!/usr/bin/env node
// Coverage reporter. Auto-detects c8 mode (reads coverage-summary.json) or
// V8 mode (legacy NODE_V8_COVERAGE dump). Env-var thresholds:
//   COVERAGE_MIN, COVERAGE_BRANCH_MIN, COVERAGE_FUNC_MIN.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const COV_DIR = process.argv[2] || './coverage';
const ROOT = path.resolve(process.argv[3] || './dist');
const LINE_MIN = parseFloat(process.env.COVERAGE_MIN || '0');
const BRANCH_MIN = parseFloat(process.env.COVERAGE_BRANCH_MIN || '0');
const FUNC_MIN = parseFloat(process.env.COVERAGE_FUNC_MIN || '0');

function pctColor(pct) {
    const n = typeof pct === 'number' ? pct : 0;
    if (n >= 80) return `\x1b[32m${n.toFixed(1)}%\x1b[0m`;
    if (n >= 60) return `\x1b[33m${n.toFixed(1)}%\x1b[0m`;
    return `\x1b[31m${n.toFixed(1)}%\x1b[0m`;
}

// ── c8 mode ───────────────────────────────────────────────────────────────
async function reportFromC8(summaryPath) {
    const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
    const total = summary.total || {};
    const files = Object.entries(summary).filter(([k]) => k !== 'total');
    const rows = files.map(([file, m]) => ({
        file: path.relative(process.cwd(), file),
        linePct: m.lines?.pct ?? 0,
        branchPct: m.branches?.pct ?? 0,
        funcPct: m.functions?.pct ?? 0,
        coveredLines: m.lines?.covered ?? 0,
        totalLines: m.lines?.total ?? 0,
    }));
    rows.sort((a, b) => a.linePct - b.linePct);

    console.log(`\nCoverage report (c8) — root: ${path.relative(process.cwd(), ROOT)}`);
    console.log('-'.repeat(110));
    console.log('  Lines        Branch       Func          Lines (covered/total)  File');
    console.log('-'.repeat(110));
    for (const r of rows.slice(0, 50)) {
        console.log(
            `  ${pctColor(r.linePct).padEnd(20)}` +
            `${pctColor(r.branchPct).padEnd(20)}` +
            `${pctColor(r.funcPct).padEnd(20)}` +
            `${String(r.coveredLines).padStart(5)}/${String(r.totalLines).padEnd(5)}  ` +
            r.file
        );
    }
    if (rows.length > 50) {
        console.log(`  ... ${rows.length - 50} more files (sorted by lowest line %)`);
    }

    const numOr0 = (v) => (typeof v === 'number' ? v : 0);
    const overallLine = numOr0(total.lines?.pct);
    const overallBranch = numOr0(total.branches?.pct);
    const overallFunc = numOr0(total.functions?.pct);
    console.log('-'.repeat(110));
    console.log(`  Files measured: ${rows.length}`);
    console.log(`  Lines:          ${total.lines?.covered ?? 0} / ${total.lines?.total ?? 0}`);
    console.log(`  Branches:       ${total.branches?.covered ?? 0} / ${total.branches?.total ?? 0}`);
    console.log(`  Functions:      ${total.functions?.covered ?? 0} / ${total.functions?.total ?? 0}`);
    console.log(`  Overall:        ${pctColor(overallLine)}  (line)  ` +
        `${pctColor(overallBranch)}  (branch)  ${pctColor(overallFunc)}  (func)`);

    let failed = false;
    if (LINE_MIN > 0 && overallLine < LINE_MIN) {
        console.error(`\nFAIL: line coverage ${overallLine.toFixed(1)}% < floor ${LINE_MIN}%`);
        failed = true;
    }
    if (BRANCH_MIN > 0 && overallBranch < BRANCH_MIN) {
        console.error(`FAIL: branch coverage ${overallBranch.toFixed(1)}% < floor ${BRANCH_MIN}%`);
        failed = true;
    }
    if (FUNC_MIN > 0 && overallFunc < FUNC_MIN) {
        console.error(`FAIL: function coverage ${overallFunc.toFixed(1)}% < floor ${FUNC_MIN}%`);
        failed = true;
    }
    if (failed) process.exit(1);
}

// ── v8 mode (legacy, unchanged behavior) ──────────────────────────────────
function rangesToCoveredLineSet(ranges, source) {
    const lineStarts = [0];
    for (let i = 0; i < source.length; i++) {
        if (source.charCodeAt(i) === 10) lineStarts.push(i + 1);
    }
    const totalLines = lineStarts.length;
    const offsetToLine = (off) => {
        let lo = 0, hi = lineStarts.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >>> 1;
            if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1;
        }
        return lo + 1;
    };
    const sorted = [...ranges].sort(
        (a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset)
    );
    const lineCounts = new Int32Array(totalLines + 1).fill(-1);
    for (const r of sorted) {
        const start = offsetToLine(r.startOffset);
        const end = offsetToLine(Math.max(r.startOffset, r.endOffset - 1));
        for (let l = start; l <= end; l++) lineCounts[l] = r.count;
    }
    const lineIsExecutable = new Array(totalLines + 1).fill(false);
    for (let l = 1; l <= totalLines; l++) {
        const lineStart = lineStarts[l - 1];
        const lineEnd = l < totalLines ? lineStarts[l] : source.length;
        const text = source.slice(lineStart, lineEnd).trim();
        if (!text) continue;
        if (text.startsWith('//') || text.startsWith('/*') || text.startsWith('*')) continue;
        if (text === '{' || text === '}' || text === '};' || text === ');') continue;
        lineIsExecutable[l] = true;
    }
    let executableLines = 0, coveredLines = 0;
    for (let l = 1; l <= totalLines; l++) {
        if (!lineIsExecutable[l]) continue;
        if (lineCounts[l] === -1) continue;
        executableLines++;
        if (lineCounts[l] > 0) coveredLines++;
    }
    return { totalLines: executableLines, coveredLines };
}

async function reportFromV8() {
    let entries;
    try {
        entries = await readdir(COV_DIR);
    } catch (e) {
        if (e.code === 'ENOENT') entries = [];
        else throw e;
    }
    const files = entries
        .filter((e) => e.startsWith('coverage-') && e.endsWith('.json'))
        .map((e) => path.join(COV_DIR, e));
    if (files.length === 0) {
        console.error(`No coverage files in ${COV_DIR}. Did you set NODE_V8_COVERAGE?`);
        process.exit(2);
    }
    const byFile = new Map();
    for (const f of files) {
        let data;
        try { data = JSON.parse(await readFile(f, 'utf8')); } catch { continue; }
        for (const result of data.result || []) {
            if (!result.url || !result.url.startsWith('file://')) continue;
            const filePath = fileURLToPath(result.url);
            if (!filePath.startsWith(ROOT)) continue;
            const ranges = (result.functions || []).flatMap((fn) => fn.ranges);
            const existing = byFile.get(filePath);
            if (existing) existing.ranges.push(...ranges);
            else byFile.set(filePath, { ranges });
        }
    }
    const rows = [];
    let totalLines = 0, totalCovered = 0;
    for (const [filePath, { ranges }] of byFile) {
        let source;
        try { source = await readFile(filePath, 'utf8'); } catch { continue; }
        const { totalLines: lt, coveredLines: lc } = rangesToCoveredLineSet(ranges, source);
        totalLines += lt; totalCovered += lc;
        rows.push({
            file: path.relative(process.cwd(), filePath),
            totalLines: lt, coveredLines: lc,
            pct: lt === 0 ? 100 : (lc * 100) / lt,
        });
    }
    rows.sort((a, b) => a.pct - b.pct);

    console.log(`\nCoverage report (v8) — root: ${path.relative(process.cwd(), ROOT)}`);
    console.log('-'.repeat(90));
    for (const r of rows.slice(0, 50)) {
        console.log(`  ${pctColor(r.pct).padEnd(20)} ${String(r.coveredLines).padStart(5)}/${String(r.totalLines).padEnd(5)}  ${r.file}`);
    }
    if (rows.length > 50) {
        console.log(`  ... ${rows.length - 50} more files (sorted by lowest coverage)`);
    }
    const overall = totalLines === 0 ? 100 : (totalCovered * 100) / totalLines;
    console.log('-'.repeat(90));
    console.log(`  Files measured: ${rows.length}`);
    console.log(`  Lines:          ${totalCovered} / ${totalLines}`);
    console.log(`  Overall:        ${pctColor(overall)}`);
    if (LINE_MIN > 0 && overall < LINE_MIN) {
        console.error(`\nFAIL: coverage ${overall.toFixed(1)}% < threshold ${LINE_MIN}%`);
        process.exit(1);
    }
}

// ── dispatch ──────────────────────────────────────────────────────────────
const summaryPath = path.join(COV_DIR, 'coverage-summary.json');
const useC8 = process.env.COVERAGE_MODE === 'c8' || existsSync(summaryPath);

(useC8 ? reportFromC8(summaryPath) : reportFromV8()).catch((e) => {
    console.error(e);
    process.exit(2);
});

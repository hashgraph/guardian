import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJUnit, summarizeReport, renderSummary, formatDuration } from './report-test-summary.mjs';

const SCRIPT = fileURLToPath(new URL('./report-test-summary.mjs', import.meta.url));

// The shape mocha-junit-reporter actually emits: passed cases are empty
// elements, failed ones carry <failure> with a message attribute and a CDATA
// stack, pending ones only appear when includePending was set.
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Mocha Tests" time="1.234" tests="5" failures="2" skipped="1">
  <testsuite name="Root Suite" timestamp="2026-10-30T18:00:00" tests="0" time="0.000" failures="0">
  </testsuite>
  <testsuite name="UserService" timestamp="2026-10-30T18:00:00" tests="5" file="/repo/tests/user.test.mjs" time="1.234" failures="2">
    <testcase name="UserService creates a user" time="0.010" classname="creates a user">
    </testcase>
    <testcase name="UserService fails with a bearer token" time="0.500" classname="fails with a bearer token">
      <failure message="request failed: authorization: Bearer abcdefghijklmnop123456" type="Error"><![CDATA[Error: request failed: authorization: Bearer abcdefghijklmnop123456
    at Context.run (test.js:10:5)]]></failure>
    </testcase>
    <testcase name="self-closing pass" time="0.100" classname="self-closing pass"/>
    <testcase name="errors out" time="0.200" classname="errors out">
      <error message="kaboom | pipes" type="TypeError"/>
    </testcase>
    <testcase name="pending one" time="0.000" classname="pending one">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>`;

test('parseJUnit classifies empty, self-closing, failure, error and skipped cases', () => {
    const cases = parseJUnit(SAMPLE);
    assert.deepEqual(
        cases.map((c) => [c.name, c.state]),
        [
            ['UserService creates a user', 'passed'],
            ['UserService fails with a bearer token', 'failed'],
            ['self-closing pass', 'passed'],
            ['errors out', 'failed'],
            ['pending one', 'skipped'],
        ],
    );
});

test('parseJUnit converts the seconds-based time attribute to milliseconds', () => {
    const [passing, failing] = parseJUnit(SAMPLE);
    assert.equal(passing.timeMs, 10);
    assert.equal(failing.timeMs, 500);
});

test('parseJUnit unescapes XML entities in names', () => {
    const xml = '<testsuites><testsuite name="s" tests="1"><testcase name="a &lt;tag&gt; &amp; friends" time="0.001"/></testsuite></testsuites>';
    assert.equal(parseJUnit(xml)[0].name, 'a <tag> & friends');
});

test('parseJUnit takes the error message from the attribute, redacting secrets', () => {
    const failing = parseJUnit(SAMPLE).find((c) => c.name.includes('bearer'));
    assert.match(failing.message, /authorization: .*\[REDACTED\]/);
    assert.doesNotMatch(failing.message, /abcdefghijklmnop123456/);
});

test('summarizeReport derives pending tests from the declared total', () => {
    // 4 cases in the file (1 of them skipped) but 5 declared -> 2 pending, 3 skipped overall.
    const partial = SAMPLE.replace(/<testcase name="self-closing pass"[^>]*\/>\n/, '');
    const report = summarizeReport('/repo/test_results/workspace.xml', partial);
    assert.equal(report.workspace, 'workspace');
    assert.equal(report.tests, 5);
    assert.equal(report.passed, 1);
    assert.equal(report.failed, 2);
    assert.equal(report.skipped, 1 + 1); // the <skipped/> case + the pending one absent from the file
    assert.equal(report.failures.length, 2);
    assert.ok(report.durationMs > 0);
});

test('summarizeReport falls back to the parsed count when the root tag is absent', () => {
    const noRoot = SAMPLE.replace(/^<testsuites[^>]*>/, '<testsuites>');
    const report = summarizeReport('w.xml', noRoot);
    assert.equal(report.tests, 5);
    assert.equal(report.skipped, 1);
});

test('renderSummary shows totals, failing workspaces first, slowest next', () => {
    const slow = { workspace: 'slow-pass', tests: 10, passed: 10, failed: 0, skipped: 0, durationMs: 90_000, failures: [] };
    const failing = { workspace: 'w1', tests: 5, passed: 3, failed: 2, skipped: 0, durationMs: 1_000, failures: [
        { name: 'test a', message: 'boom' },
        { name: 'test b', message: 'boom again' },
    ] };
    const failingLater = { workspace: 'w2', tests: 5, passed: 5, failed: 1, skipped: 0, durationMs: 500, failures: [
        { name: 'c | with pipe', message: 'x' },
    ] };

    const text = renderSummary([slow, failing, failingLater]).join('\n');
    assert.match(text, /3 workspaces · 20 tests · ✅ 18 passed · ❌ 3 failed · ⏭️ 0 skipped · 1m 32s/);
    assert.match(text, /\| ⏭️ \| Duration \|/);

    const rowW1 = text.indexOf('| ❌ | `w1`');
    const rowW2 = text.indexOf('| ❌ | `w2`');
    const rowSlow = text.indexOf('| ✅ | `slow-pass`');
    assert.ok(rowW1 < rowW2 && rowW2 < rowSlow, 'failing rows on top, then slowest');

    // Pipes in names are escaped so the table stays one row per test.
    assert.match(text, /c \\| with pipe/);
    assert.match(text, /<details><summary>❌ 3 failing tests<\/summary>/);
    assert.match(text, /boom again/);
});

test('renderSummary uses a neutral separator when nothing failed', () => {
    const text = renderSummary([{ workspace: 'w', tests: 1, passed: 1, failed: 0, skipped: 1, durationMs: 5, failures: [] }]).join('\n');
    assert.match(text, /✅ 1 passed · · 0 failed/);
    assert.doesNotMatch(text, /<details>/);
});

test('formatDuration renders ms, seconds and minutes', () => {
    assert.equal(formatDuration(500), '500ms');
    assert.equal(formatDuration(3200), '3.2s');
    assert.equal(formatDuration(95_000), '1m 35s');
    assert.equal(formatDuration(NaN), '-');
});

test('CLI: a missing results directory warns and exits 0', () => {
    const missing = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'junit-')), 'nope');
    const out = execFileSync(process.execPath, [SCRIPT, missing], { encoding: 'utf8' });
    assert.match(out, /::warning::No test results/);
});

test('CLI: aggregates the xml files in the results directory into the summary', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'junit-'));
    fs.mkdirSync(path.join(dir, 'nested'));
    fs.writeFileSync(path.join(dir, 'nested', 'ws.xml'), SAMPLE);
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'not xml');

    const out = execFileSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    assert.match(out, /## Unit test results/);
    assert.match(out, /1 workspaces · 5 tests/);
    // The workspace row comes from the file basename, found through the nested dir.
    assert.match(out, /`ws`/);
    assert.match(out, /failing tests/);
});

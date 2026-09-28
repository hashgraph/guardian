/**
 * Shared mocha bootstrap, loaded before the test files of every workspace that
 * passes `--file ../test-helpers/quiet-console.mjs` (see the `test` script in
 * package.json).
 *
 * Several helpers log to the console on their failure paths (e.g. `console.error(err)`
 * when a write fails). The tests deliberately exercise those paths, so the output is
 * noise when the suite is green. Every message is captured here and replayed at the end
 * of the run, but only when the run failed, so a red build keeps the full diagnostics.
 */
import fs from 'node:fs';
import util from 'node:util';

const LEVELS = ['log', 'info', 'warn', 'error'];
const original = Object.fromEntries(LEVELS.map((level) => [level, console[level]]));
const captured = [];

for (const level of LEVELS) {
    console[level] = (...args) => {
        captured.push([level, util.format(...args)]);
    };
}

process.on('exit', (code) => {
    if (code === 0 || captured.length === 0) {
        return;
    }

    const header = `\n${captured.length} console message(s) captured during the test run (replayed because the run failed):\n`;
    fs.writeSync(2, header);
    for (const [level, message] of captured) {
        const fd = level === 'error' || level === 'warn' ? 2 : 1;
        fs.writeSync(fd, `[${level}] ${message}\n`);
    }
});

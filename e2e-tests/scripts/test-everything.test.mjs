import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createSandbox, positionOf } from './script-sandbox.mjs';

describe('test-everything.sh', () => {
    let sandbox;
    beforeEach(() => { sandbox = createSandbox('test-everything.sh'); });
    afterEach(() => { sandbox.remove(); });

    it('restarts the services on a fresh build before running Cypress', () => {
        const { status, stderr, commands } = sandbox.run(['cypress']);
        assert.equal(status, 0, stderr);
        const stop = positionOf(commands, 'run guardian:services:down');
        const build = positionOf(commands, 'run guardian:build');
        const start = positionOf(commands, 'run guardian:services:up');
        const test = positionOf(commands, 'run guardian:test');
        assert.ok(stop >= 0 && build > stop && start > build && test > start, commands.join('\n'));
    });

    it('does not start the services nor run Cypress when the build fails', () => {
        const { status, stdout, commands } = sandbox.run(['cypress'], { failingCommand: 'run guardian:build' });
        assert.notEqual(status, 0);
        assert.match(stdout, /FAIL {2}cypress/);
        assert.equal(positionOf(commands, 'run guardian:services:up'), -1, commands.join('\n'));
        assert.equal(positionOf(commands, 'run guardian:test'), -1, commands.join('\n'));
    });

    it('installs dependencies with npm ci only, and the e2e-tests ones once per run', () => {
        const { status, stderr, commands } = sandbox.run(['lint', 'scripts', 'frontend', 'cypress']);
        assert.equal(status, 0, stderr);
        assert.deepEqual(commands.filter((command) => /^npm (install|i|ci)\b/.test(command)), ['npm ci --no-audit --no-fund', 'npm ci --no-audit --no-fund']);
    });

    it('builds @guardian/interfaces before installing and testing the frontend', () => {
        const { status, stderr, commands } = sandbox.run(['frontend']);
        assert.equal(status, 0, stderr);
        const build = positionOf(commands, 'run guardian:build -- @guardian/interfaces');
        const test = positionOf(commands, 'npx ng test');
        assert.ok(build >= 0 && test > build, commands.join('\n'));
    });
});

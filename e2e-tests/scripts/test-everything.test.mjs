import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createSandbox, positionOf } from './script-sandbox.mjs';

const isInstall = (command) => /^npm (install|i|ci)\b/.test(command);

describe('test-everything.sh', () => {
    let sandbox;
    beforeEach(() => { sandbox = createSandbox('test-everything.sh'); });
    afterEach(() => { sandbox.remove(); });

    it('prepares the frontend once, before any group runs', () => {
        const { status, stderr, commands } = sandbox.run(['lint', 'frontend']);
        assert.equal(status, 0, stderr);
        assert.deepEqual(commands.filter(isInstall), ['npm ci --no-audit --no-fund']);
        const playwright = positionOf(commands, 'npx playwright install chromium');
        assert.ok(playwright >= 0 && playwright < positionOf(commands, 'npx eslint cypress'), commands.join('\n'));
    });

    it('does not run the frontend specs when the preparation fails, and runs the other groups', () => {
        const { status, stdout, commands } = sandbox.run(['lint', 'frontend'], { failingCommand: 'playwright install' });
        assert.notEqual(status, 0);
        assert.match(stdout, /PASS {2}lint/);
        assert.match(stdout, /FAIL {2}frontend/);
        assert.equal(positionOf(commands, 'npx ng test'), -1, commands.join('\n'));
    });
});

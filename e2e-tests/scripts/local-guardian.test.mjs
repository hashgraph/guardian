import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { createSandbox } from './script-sandbox.mjs';

describe('local-guardian.sh build', () => {
    let sandbox;
    afterEach(() => { sandbox.remove(); });

    it('installs the workspace with the vendored Yarn release, then builds every package of the stack', () => {
        sandbox = createSandbox('local-guardian.sh');
        const { status, stderr, commands } = sandbox.run(['build']);
        assert.equal(status, 0, stderr);
        const yarn = `node ${path.join(sandbox.root, '.yarn/releases/yarn-9.9.9.cjs')}`;
        assert.equal(commands[0], `${yarn} install --immutable`);
        assert.ok(commands[1].startsWith(`${yarn} workspaces foreach -A --topological-dev `) && commands[1].endsWith(' run build'), commands[1]);
        for (const workspace of ['@guardian/interfaces', '@guardian/common', '@guardian/hedera', 'worker-service', 'api-gateway']) {
            assert.ok(commands[1].includes(`--include ${workspace}`), commands[1]);
        }
    });

    it('builds only the packages named', () => {
        sandbox = createSandbox('local-guardian.sh');
        const { status, stderr, commands } = sandbox.run(['build', '@guardian/interfaces']);
        assert.equal(status, 0, stderr);
        assert.equal(commands[1].match(/--include /g).length, 1, commands[1]);
        assert.ok(commands[1].includes('--include @guardian/interfaces'), commands[1]);
    });

    it('does not build when the workspace install fails', () => {
        sandbox = createSandbox('local-guardian.sh');
        const { status, commands } = sandbox.run(['build'], { failingCommand: 'install --immutable' });
        assert.notEqual(status, 0);
        assert.equal(commands.length, 1, commands.join('\n'));
    });

    it('fails loudly when .yarnrc.yml names no Yarn release', () => {
        sandbox = createSandbox('local-guardian.sh', { yarnrc: 'nodeLinker: node-modules\n' });
        const { status, stderr, commands } = sandbox.run(['build']);
        assert.notEqual(status, 0);
        assert.match(stderr, /no yarnPath/);
        assert.deepEqual(commands, []);
    });
});

describe('local-guardian.sh status', () => {
    let sandbox;
    afterEach(() => { sandbox.remove(); });

    it('fails and says what to run when the network was never created', () => {
        sandbox = createSandbox('local-guardian.sh');
        const { status, stdout, stderr } = sandbox.run(['status']);
        assert.notEqual(status, 0);
        assert.match(stdout, /^FAIL {2}solo +network settings in \.solo\/solo\.env \(npm run solo:up\)$/m);
        assert.match(stderr, /some checks failed/);
    });

    it('names a recorded service that is no longer running, with its log', () => {
        sandbox = createSandbox('local-guardian.sh');
        const logDir = path.join(sandbox.root, 'e2e-tests', '.local', 'logs');
        fs.mkdirSync(logDir, { recursive: true });
        fs.writeFileSync(path.join(logDir, 'pids'), `${process.pid} logger-service#1\n999999 queue-service#1\n`);
        const { status, stdout } = sandbox.run(['status']);
        assert.notEqual(status, 0);
        assert.match(stdout, new RegExp(`^OK {4}services +logger-service#1 \\(pid ${process.pid}\\) running`, 'm'));
        assert.match(stdout, /^FAIL {2}services +queue-service#1 \(pid 999999\) running; log \.local\/logs\/queue-service-1\.log$/m);
    });
});

describe('local-guardian.sh infra-down', () => {
    let sandbox;
    afterEach(() => { sandbox.remove(); });

    it('says which infra containers it removes and which were not there', () => {
        sandbox = createSandbox('local-guardian.sh');
        const { status, stderr, stdout } = sandbox.run(['infra-down'], { failingCommand: 'container inspect guardian-e2e-ipfs' });
        assert.equal(status, 0, stderr);
        assert.deepEqual(stdout.trimEnd().split('\n'), [
            'removing guardian-e2e-cache',
            'removing guardian-e2e-nats',
            'removing guardian-e2e-mongo',
            'guardian-e2e-ipfs is not there',
        ]);
    });

    it('fails when docker does not answer', () => {
        sandbox = createSandbox('local-guardian.sh');
        const { status, stderr } = sandbox.run(['infra-down'], { failingCommand: 'docker info' });
        assert.notEqual(status, 0);
        assert.match(stderr, /docker is not reachable/);
    });
});

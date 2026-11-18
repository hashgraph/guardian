import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createSandbox } from './script-sandbox.mjs';

const cypressRun = (commands) => commands.find((command) => command.startsWith('npx cypress run'));
const argumentOf = (command, flag) => command.match(new RegExp(`${flag} (\\S+(?: (?!--)\\S+)*)`))?.[1];

describe('entrypoint.sh', () => {
    let sandbox;
    beforeEach(() => { sandbox = createSandbox('entrypoint.sh', { scriptPath: 'entrypoint.sh' }); });
    afterEach(() => { sandbox.remove(); });

    it('runs on Chromium unless CYPRESS_BROWSER names another browser', () => {
        const byDefault = sandbox.run([], { env: { CYPRESS_BROWSER: '' } });
        assert.equal(byDefault.status, 0, byDefault.stderr);
        assert.equal(argumentOf(cypressRun(byDefault.commands), '--browser'), 'chromium');

        const chrome = sandbox.run([], { env: { CYPRESS_BROWSER: 'chrome' } });
        assert.equal(argumentOf(cypressRun(chrome.commands), '--browser'), 'chrome');
    });

    it('hands the public values and the grep options to Cypress with --expose, not as variables', () => {
        const { status, stderr, commands, cypressVariables } = sandbox.run([], {
            env: {
                CYPRESS_portApi: '3002',
                CYPRESS_hederaNet: 'localnode',
                CYPRESS_operatorId: '0.0.2',
                CYPRESS_minPasswordLength: '4',
                CYPRESS_passwordComplexity: 'easy',
                CYPRESS_grepTags: 'all, smoke',
            },
        });
        assert.equal(status, 0, stderr);
        const run = cypressRun(commands);
        assert.equal(
            argumentOf(run, '--expose'),
            'portApi=3002,hederaNet=localnode,operatorId=0.0.2,minPasswordLength=4,passwordComplexity=easy,grepTags=all smoke,grepFilterSpecs=true',
        );
        assert.doesNotMatch(run, /--env/);
        const publicVariables = /^npx: CYPRESS_(portApi|hederaNet|operatorId|minPasswordLength|passwordComplexity|grepTags|grepFilterSpecs)=/;
        assert.deepEqual(cypressVariables.filter((line) => publicVariables.test(line)), []);
    });

    it('leaves the secrets in the environment, where cy.env() reads them', () => {
        const { status, stderr, cypressVariables } = sandbox.run([], {
            env: {
                CYPRESS_Password: 'secret-password',
                CYPRESS_operatorKey: 'secret-key',
                CYPRESS_ipfsStorageApiKey: 'secret-ipfs',
                CYPRESS_MGSAdmin: 'secret-tenant',
                CYPRESS_MGSIndexerAPIToken: 'secret-token',
            },
        });
        assert.equal(status, 0, stderr);
        for (const secret of ['Password=secret-password', 'operatorKey=secret-key', 'ipfsStorageApiKey=secret-ipfs', 'MGSAdmin=secret-tenant', 'MGSIndexerAPIToken=secret-token']) {
            assert.ok(cypressVariables.includes(`npx: CYPRESS_${secret}`), cypressVariables.join('\n'));
        }
    });

    it('fails before running Cypress when a public value contains a comma, which --expose would split', () => {
        const { status, stderr, commands } = sandbox.run([], { env: { CYPRESS_passwordComplexity: 'easy,medium' } });
        assert.notEqual(status, 0);
        assert.match(stderr, /CYPRESS_passwordComplexity.*comma/);
        assert.equal(cypressRun(commands), undefined);
    });
});

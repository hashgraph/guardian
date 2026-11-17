import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { PrivateKey } from '@hiero-ledger/sdk';

import { extraCaCertPath, renderSoloEnv, selectGenesisAccount } from './solo-network.mjs';

const genesisKey = PrivateKey.generateED25519().toStringDer();

const accountsFixture = {
    systemAccounts: [{ name: 'Operator', accountId: '0.0.2', privateKey: genesisKey }],
    createdAccounts: [{ accountId: '0.0.1002', privateKey: '0xaa', group: 'ecdsa-alias' }],
};

describe('selectGenesisAccount', () => {
    it('returns the genesis account and its key', () => {
        assert.deepEqual(selectGenesisAccount(accountsFixture), { accountId: '0.0.2', privateKey: genesisKey });
    });

    it('fails loudly when the genesis account carries no private key', () => {
        const withoutKey = { systemAccounts: [{ name: 'Operator', accountId: '0.0.2' }] };
        assert.throws(() => selectGenesisAccount(withoutKey), /no genesis account with a private key/);
    });

    it('fails loudly when systemAccounts is missing', () => {
        assert.throws(() => selectGenesisAccount({}), /no genesis account with a private key/);
    });
});

describe('renderSoloEnv', () => {
    const rendered = renderSoloEnv({ operatorId: '0.0.1012', operatorKey: 'der-key' });
    const lines = rendered.trimEnd().split('\n');

    it('points Guardian at the localnode network through the override variables', () => {
        assert.ok(lines.includes("HEDERA_NET='localnode'"));
        assert.ok(lines.includes("OVERRIDE_NETWORK_CONFIGURATION='true'"));
        assert.ok(lines.includes(`OVERRIDE_HEDERA_CONSENSUS_NODES='{"127.0.0.1:35211":"0.0.3"}'`));
        assert.ok(lines.includes(`OVERRIDE_HEDERA_MIRROR_NODES='["http://127.0.0.1:38081"]'`));
    });

    it('carries the operator and an empty initialization topic', () => {
        assert.ok(lines.includes("OPERATOR_ID='0.0.1012'"));
        assert.ok(lines.includes("OPERATOR_KEY='der-key'"));
        assert.ok(lines.includes("INITIALIZATION_TOPIC_ID=''"));
    });

    it('survives being sourced by a shell unchanged', () => {
        const script = `set -a\n${rendered}printf '%s' "$OVERRIDE_HEDERA_CONSENSUS_NODES"`;
        const sourced = spawnSync('sh', ['-c', script], { encoding: 'utf8' });
        assert.equal(sourced.stdout, '{"127.0.0.1:35211":"0.0.3"}');
    });

    it('ends with a newline so the upload script can append its lines', () => {
        assert.ok(rendered.endsWith('\n'));
    });
});

describe('extraCaCertPath', () => {
    it('is undefined when no CA is configured', () => {
        assert.equal(extraCaCertPath({}), undefined);
    });

    it('resolves an existing file to an absolute path', () => {
        assert.equal(extraCaCertPath({ SOLO_EXTRA_CA_CERT: 'package.json' }), path.resolve('package.json'));
    });

    it('fails loudly when the file does not exist', () => {
        assert.throws(() => extraCaCertPath({ SOLO_EXTRA_CA_CERT: '/nonexistent/ca.pem' }), /does not exist/);
    });
});

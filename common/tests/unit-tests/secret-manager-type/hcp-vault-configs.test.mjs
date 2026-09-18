import { assert } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { HcpVaultSecretManagerConfigs } from '../../../dist/secret-manager/hashicorp/hcp-vault-secret-manager-configs.js';

describe('HcpVaultSecretManagerConfigs.getConfigs', () => {
    const saved = {};
    const keys = [
        'VAULT_API_VERSION',
        'VAULT_ADDRESS',
        'VAULT_CA_CERT',
        'VAULT_CLIENT_CERT',
        'VAULT_CLIENT_KEY',
        'VAULT_APPROLE_ROLE_ID',
        'VAULT_APPROLE_SECRET_ID'
    ];

    before(() => {
        for (const key of keys) {
            saved[key] = process.env[key];
        }
        process.env.VAULT_API_VERSION = 'v1';
        process.env.VAULT_ADDRESS = 'https://vault.local:8200';
        process.env.VAULT_CA_CERT = 'package.json';
        process.env.VAULT_CLIENT_CERT = 'package.json';
        process.env.VAULT_CLIENT_KEY = 'package.json';
        process.env.VAULT_APPROLE_ROLE_ID = 'role-id';
        process.env.VAULT_APPROLE_SECRET_ID = 'secret-id';
    });

    after(() => {
        for (const key of keys) {
            if (saved[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = saved[key];
            }
        }
    });

    it('reads api version and endpoint from the environment', () => {
        const configs = HcpVaultSecretManagerConfigs.getConfigs();
        assert.equal(configs.apiVersion, 'v1');
        assert.equal(configs.endpoint, 'https://vault.local:8200');
    });

    it('builds the approle credential from the environment', () => {
        const configs = HcpVaultSecretManagerConfigs.getConfigs();
        assert.deepEqual(configs.approleCredential, { roleId: 'role-id', secretId: 'secret-id' });
    });

    it('loads tls files relative to the working directory', () => {
        const configs = HcpVaultSecretManagerConfigs.getConfigs();
        const expected = fs.readFileSync(path.join(process.cwd(), 'package.json'));
        assert.deepEqual(configs.tlsOptions.ca, expected);
        assert.deepEqual(configs.tlsOptions.cert, expected);
        assert.deepEqual(configs.tlsOptions.key, expected);
    });

    it('returns Buffers for tls options', () => {
        const configs = HcpVaultSecretManagerConfigs.getConfigs();
        assert.instanceOf(configs.tlsOptions.ca, Buffer);
        assert.instanceOf(configs.tlsOptions.cert, Buffer);
        assert.instanceOf(configs.tlsOptions.key, Buffer);
    });

    it('throws when a tls file is missing', () => {
        process.env.VAULT_CA_CERT = 'does-not-exist.pem';
        try {
            assert.throws(() => HcpVaultSecretManagerConfigs.getConfigs());
        } finally {
            process.env.VAULT_CA_CERT = 'package.json';
        }
    });
});

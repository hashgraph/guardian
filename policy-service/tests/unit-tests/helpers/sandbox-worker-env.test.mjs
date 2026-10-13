import { assert } from 'chai';
import { Worker } from 'node:worker_threads';
import {
    SANDBOX_WORKER_ENV_ALLOWLIST,
    buildSandboxWorkerEnv,
} from '../../../dist/policy-engine/helpers/workers/sandbox-worker-env.js';

function readWorkerEnvKeys(env) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            "require('node:worker_threads').parentPort.postMessage(Object.keys(process.env));",
            { eval: true, env }
        );
        worker.on('message', resolve);
        worker.on('error', reject);
    });
}

describe('sandbox worker env', () => {
    it('keeps only allowlisted variables', () => {
        const env = buildSandboxWorkerEnv({
            PATH: '/bin',
            TZ: 'UTC',
            SERVICE_JWT_SECRET_KEY: 'secret',
            HASHICORP_TOKEN: 'token',
            DB_HOST: 'db',
        });
        assert.deepEqual(env, { PATH: '/bin', TZ: 'UTC' });
    });

    it('omits allowlisted variables that are not set', () => {
        assert.deepEqual(buildSandboxWorkerEnv({}), {});
    });

    it('never exposes non-allowlisted keys, whatever the source contains', () => {
        const source = { OPERATOR_KEY: 'k', VAULT_APPROLE_SECRET_ID: 's' };
        for (const key of SANDBOX_WORKER_ENV_ALLOWLIST) {
            source[key] = 'x';
        }
        assert.sameMembers(Object.keys(buildSandboxWorkerEnv(source)), [...SANDBOX_WORKER_ENV_ALLOWLIST]);
    });

    it('defaults to process.env and still filters it', () => {
        process.env.SANDBOX_ENV_TEST_SECRET = 'secret';
        try {
            assert.notProperty(buildSandboxWorkerEnv(), 'SANDBOX_ENV_TEST_SECRET');
        } finally {
            delete process.env.SANDBOX_ENV_TEST_SECRET;
        }
    });

    it('a worker started with the built env cannot see process secrets', async () => {
        process.env.SANDBOX_ENV_TEST_SECRET = 'secret';
        try {
            const inherited = await readWorkerEnvKeys(undefined);
            assert.include(inherited, 'SANDBOX_ENV_TEST_SECRET', 'control: default inherits everything');
            const restricted = await readWorkerEnvKeys(buildSandboxWorkerEnv());
            assert.notInclude(restricted, 'SANDBOX_ENV_TEST_SECRET');
        } finally {
            delete process.env.SANDBOX_ENV_TEST_SECRET;
        }
    });
});

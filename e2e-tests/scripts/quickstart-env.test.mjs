import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { QUICKSTART_KEYS, renderExports, shellQuote } from './quickstart-env.mjs';

const pem = '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----';
const complete = Object.fromEntries(QUICKSTART_KEYS.map((name) => [name, pem]));

describe('renderExports', () => {
    it('round-trips multi-line values through a shell', () => {
        const sourced = spawnSync('sh', ['-c', `${renderExports(complete)}\nprintf '%s' "$JWT_PRIVATE_KEY"`], { encoding: 'utf8' });
        assert.equal(sourced.stdout, pem);
    });

    it('fails loudly when a key is missing', () => {
        const incomplete = { ...complete, JWT_PUBLIC_KEY: '' };
        assert.throws(() => renderExports(incomplete), /JWT_PUBLIC_KEY is missing/);
    });
});

describe('shellQuote', () => {
    it('escapes single quotes', () => {
        const sourced = spawnSync('sh', ['-c', `printf '%s' ${shellQuote("it's")}`], { encoding: 'utf8' });
        assert.equal(sourced.stdout, "it's");
    });
});

describe('quickstart configuration', () => {
    it('provides every key', () => {
        const printed = spawnSync('node', ['scripts/quickstart-env.mjs'], { encoding: 'utf8' });
        assert.equal(printed.status, 0, printed.stderr);
        for (const name of QUICKSTART_KEYS) {
            assert.match(printed.stdout, new RegExp(`export ${name}=`));
        }
    });
});

import assert from 'node:assert/strict';
import { envNumber } from '../dist/helpers/env.js';

const withEnv = (value, fn) => {
    const previous = process.env.TEST_ENV_NUMBER;
    if (value === undefined) {
        delete process.env.TEST_ENV_NUMBER;
    } else {
        process.env.TEST_ENV_NUMBER = value;
    }
    try {
        return fn();
    } finally {
        if (previous === undefined) {
            delete process.env.TEST_ENV_NUMBER;
        } else {
            process.env.TEST_ENV_NUMBER = previous;
        }
    }
};

describe('envNumber', () => {
    it('falls back when the variable is unset', () => {
        withEnv(undefined, () => assert.equal(envNumber('TEST_ENV_NUMBER', 25), 25));
    });

    it('falls back when the variable is unparsable', () => {
        withEnv('not-a-number', () => assert.equal(envNumber('TEST_ENV_NUMBER', 25), 25));
        withEnv('', () => assert.equal(envNumber('TEST_ENV_NUMBER', 25), 25));
    });

    it('keeps 0 instead of falling back', () => {
        withEnv('0', () => assert.equal(envNumber('TEST_ENV_NUMBER', 25), 0));
    });

    it('reads a normal value', () => {
        withEnv('150', () => assert.equal(envNumber('TEST_ENV_NUMBER', 25), 150));
    });
});

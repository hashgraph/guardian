import assert from 'node:assert/strict';
import { PolicyConverterUtils } from '../../dist/helpers/import-helpers/policy/policy-converter-utils.js';

describe('PolicyConverterUtils.versionCompare', () => {
    it('treats a missing v2 as older than any v1', () => {
        assert.equal(PolicyConverterUtils.versionCompare('1.0.0', undefined), 1);
        assert.equal(PolicyConverterUtils.versionCompare('1.0.0', null), 1);
        assert.equal(PolicyConverterUtils.versionCompare('1.0.0', ''), 1);
    });

    it('returns 0 for identical versions', () => {
        assert.equal(PolicyConverterUtils.versionCompare('1.5.1', '1.5.1'), 0);
        assert.equal(PolicyConverterUtils.versionCompare('0.0.1', '0.0.1'), 0);
    });

    it('returns 1 when v1 is newer at the major level', () => {
        assert.equal(PolicyConverterUtils.versionCompare('2.0.0', '1.9.9'), 1);
    });

    it('returns -1 when v1 is older at the minor level', () => {
        assert.equal(PolicyConverterUtils.versionCompare('1.4.9', '1.5.0'), -1);
    });

    it('returns -1 when v1 is older at the patch level', () => {
        assert.equal(PolicyConverterUtils.versionCompare('1.5.0', '1.5.1'), -1);
    });

    it('treats a longer v1 as newer when shared parts are equal', () => {
        assert.equal(PolicyConverterUtils.versionCompare('1.5.0', '1.5'), 1);
    });

    it('treats a longer v2 as newer when shared parts are equal', () => {
        assert.equal(PolicyConverterUtils.versionCompare('1.5', '1.5.0'), -1);
    });

    it('compares against the constant VERSION', () => {
        assert.equal(
            PolicyConverterUtils.versionCompare(PolicyConverterUtils.VERSION, PolicyConverterUtils.VERSION),
            0,
        );
        assert.equal(PolicyConverterUtils.versionCompare(PolicyConverterUtils.VERSION, '0.0.1'), 1);
    });
});

describe('PolicyConverterUtils.PolicyConverter', () => {
    it('returns the same policy untouched if codeVersion already equals VERSION', () => {
        const policy = {
            codeVersion: PolicyConverterUtils.VERSION,
            config: { blockType: 'noop' },
        };
        const before = JSON.stringify(policy);
        const result = PolicyConverterUtils.PolicyConverter(policy);
        assert.equal(result, policy);
        assert.equal(JSON.stringify(result), before);
    });
});

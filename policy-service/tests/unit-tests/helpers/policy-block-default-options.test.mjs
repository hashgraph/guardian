import assert from 'node:assert/strict';
import { PolicyBlockDefaultOptions } from '../../../dist/policy-engine/helpers/policy-block-default-options.js';

describe('PolicyBlockDefaultOptions', () => {
    it('returns the documented baseline defaults', () => {
        const opts = PolicyBlockDefaultOptions();
        assert.deepEqual(opts, {
            commonBlock: false,
            tag: null,
            defaultActive: false,
            permissions: [],
            _parent: null,
        });
    });

    it('returns a fresh object each call (no shared mutable state)', () => {
        const a = PolicyBlockDefaultOptions();
        const b = PolicyBlockDefaultOptions();
        assert.notEqual(a, b);
        assert.notEqual(a.permissions, b.permissions);
        a.permissions.push('SR');
        assert.deepEqual(b.permissions, []);
    });
});

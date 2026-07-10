import assert from 'node:assert/strict';
import { STATE_KEY } from '../../../dist/policy-engine/helpers/constants.js';

describe('policy-engine helpers / STATE_KEY', () => {
    it('is a unique Symbol suitable for use as a hidden state property key', () => {
        assert.equal(typeof STATE_KEY, 'symbol');
    });
    it('is the same reference across imports (module-level singleton)', async () => {
        const mod = await import('../../../dist/policy-engine/helpers/constants.js');
        assert.equal(mod.STATE_KEY, STATE_KEY);
    });
});

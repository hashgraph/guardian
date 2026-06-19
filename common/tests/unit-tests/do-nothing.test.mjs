import assert from 'node:assert/strict';
import { doNothing } from '../../dist/helpers/do-nothing.js';

describe('doNothing helper', () => {
    it('returns undefined and does not throw', () => {
        assert.equal(doNothing(), undefined);
    });
    it('is callable with arbitrary args (ignored)', () => {
        assert.doesNotThrow(() => doNothing(1, 'x', null, {}));
    });
});

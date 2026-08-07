import { assert } from 'chai';
import { doNothing } from '../../../dist/helpers/do-nothing.js';

describe('doNothing', () => {
    it('is exported as a function', () => {
        assert.equal(typeof doNothing, 'function');
    });

    it('returns undefined when called with no args', () => {
        assert.equal(doNothing(), undefined);
    });

    it('returns undefined regardless of arguments', () => {
        assert.equal(doNothing(1, 'two', { three: 3 }, [4]), undefined);
    });

    it('does not throw under any input', () => {
        assert.doesNotThrow(() => doNothing(null));
        assert.doesNotThrow(() => doNothing(undefined));
        assert.doesNotThrow(() => doNothing(() => { throw new Error('this is never called'); }));
    });
});

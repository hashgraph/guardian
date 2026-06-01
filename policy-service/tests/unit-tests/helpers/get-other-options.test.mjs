import assert from 'node:assert/strict';
import { GetOtherOptions } from '../../../dist/policy-engine/helpers/get-other-options.js';

describe('GetOtherOptions', () => {
    it('strips known framework keys, keeps custom keys', () => {
        const opts = {
            blockType: 'whatever',
            commonBlock: true,
            tag: 't',
            defaultActive: true,
            permissions: ['p'],
            blockMap: {},
            tagMap: {},
            _uuid: 'u1',
            _parent: { id: 'parent' },
            baseClass: 'BC',
            // custom
            myField: 'custom',
            count: 7,
        };
        const result = GetOtherOptions(opts);
        assert.deepEqual(result, { myField: 'custom', count: 7 });
    });

    it('returns a deep copy (no aliasing of nested values)', () => {
        const nested = { deep: 'value' };
        const opts = { custom: nested };
        const result = GetOtherOptions(opts);
        assert.deepEqual(result.custom, nested);
        assert.notStrictEqual(result.custom, nested);
        // Mutating original doesn't affect result
        nested.deep = 'changed';
        assert.equal(result.custom.deep, 'value');
    });

    it('returns an empty object when only framework keys are present', () => {
        const opts = {
            blockType: 'x',
            commonBlock: false,
            tag: 't',
            defaultActive: true,
            permissions: [],
            blockMap: {},
            tagMap: {},
            _uuid: 'u',
            _parent: null,
            baseClass: 'B',
        };
        assert.deepEqual(GetOtherOptions(opts), {});
    });

    it('returns an empty object for an empty input', () => {
        assert.deepEqual(GetOtherOptions({}), {});
    });

    it('drops fields whose values are not JSON-representable (functions/undefined)', () => {
        const opts = {
            keep: 'yes',
            fn: () => 1,
            und: undefined,
        };
        const result = GetOtherOptions(opts);
        assert.equal(result.keep, 'yes');
        assert.notProperty?.(result, 'fn') ?? assert.equal(result.fn, undefined);
        assert.equal(result.fn, undefined);
        assert.equal(result.und, undefined);
    });
});

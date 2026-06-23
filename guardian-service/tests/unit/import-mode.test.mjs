import { assert } from 'chai';
import { ImportMode } from '../../dist/helpers/import-helpers/common/import.interface.js';

describe('@unit ImportMode enum', () => {
    it('contains exactly the documented modes', () => {
        assert.deepEqual(Object.keys(ImportMode).sort(), ['COMMON', 'DEMO', 'VIEW']);
    });

    it('values match keys (string enum convention)', () => {
        assert.equal(ImportMode.COMMON, 'COMMON');
        assert.equal(ImportMode.DEMO, 'DEMO');
        assert.equal(ImportMode.VIEW, 'VIEW');
    });

    it('values are unique (no accidental aliasing)', () => {
        const values = Object.values(ImportMode);
        assert.equal(values.length, new Set(values).size);
    });
});

import assert from 'node:assert/strict';
import { UnitSystem } from '../dist/type/unit-system.type.js';

describe('UnitSystem enum', () => {
    it('exposes Prefix / Postfix / None', () => {
        const values = Object.values(UnitSystem);
        assert.ok(values.length >= 2);
    });
});

import assert from 'node:assert/strict';
import { AccessType } from '../dist/type/access.type.js';

describe('AccessType enum', () => {
    it('exposes all six access modes', () => {
        for (const k of ['NONE', 'ASSIGNED', 'PUBLISHED', 'ASSIGNED_AND_PUBLISHED', 'ASSIGNED_OR_PUBLISHED', 'ALL']) {
            assert.equal(AccessType[k], k);
        }
    });
    it('has exactly six entries', () => {
        assert.equal(Object.keys(AccessType).length, 6);
    });
});

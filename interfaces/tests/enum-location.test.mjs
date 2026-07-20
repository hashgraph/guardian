import assert from 'node:assert/strict';
import { LocationType } from '../dist/type/location.type.js';

describe('LocationType enum', () => {
    it('exposes LOCAL / REMOTE / CUSTOM with lowercase string values', () => {
        assert.equal(LocationType.LOCAL, 'local');
        assert.equal(LocationType.REMOTE, 'remote');
        assert.equal(LocationType.CUSTOM, 'custom');
    });
});

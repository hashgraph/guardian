import assert from 'node:assert/strict';
import { RootState } from '../dist/type/root-state.type.js';

describe('RootState numeric enum', () => {
    it('uses 0 for CREATED and 1 for CONFIRMED', () => {
        assert.equal(RootState.CREATED, 0);
        assert.equal(RootState.CONFIRMED, 1);
    });
    it('supports reverse-lookup', () => {
        assert.equal(RootState[0], 'CREATED');
        assert.equal(RootState[1], 'CONFIRMED');
    });
});

import assert from 'node:assert/strict';
import { ApplicationStates } from '../dist/type/application-states.type.js';

describe('ApplicationStates enum', () => {
    it('exposes the lifecycle states', () => {
        const values = Object.values(ApplicationStates);
        for (const expected of ['STARTED', 'WRONG_CONFIGURATION', 'INITIALIZING', 'READY', 'STOPPED', 'BAD_CONFIGURATION']) {
            assert.ok(values.includes(expected), `missing ${expected}`);
        }
    });
    it('keys equal values (uppercase string enum)', () => {
        for (const [k, v] of Object.entries(ApplicationStates)) assert.equal(k, v);
    });
    it('has six entries', () => {
        assert.equal(Object.keys(ApplicationStates).length, 6);
    });
});

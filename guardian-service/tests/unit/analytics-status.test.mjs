import { assert } from 'chai';
import { Status } from '../../dist/analytics/compare/types/status.type.js';

describe('analytics Status (merge) enum', () => {
    it('exposes the six merge-status sentinels', () => {
        for (const k of ['NONE', 'FULL', 'LEFT', 'RIGHT', 'LEFT_AND_RIGHT', 'PARTLY']) {
            assert.equal(Status[k], k);
        }
        assert.equal(Object.keys(Status).length, 6);
    });
});

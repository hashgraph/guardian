import assert from 'node:assert/strict';
import {
    MSG_DEPRECATION_BLOCK,
    MSG_DEPRECATION_PROP,
    MSG_REACH_NO_IN,
    MSG_REACH_NO_OUT,
    MSG_REACH_ISOLATED,
} from '../dist/validators/policy-messages/types.js';

describe('PolicyMessage code constants', () => {
    it('exposes the canonical deprecation codes', () => {
        assert.equal(MSG_DEPRECATION_BLOCK, 'DEPRECATION_BLOCK');
        assert.equal(MSG_DEPRECATION_PROP, 'DEPRECATION_PROP');
    });

    it('exposes the canonical reachability codes', () => {
        assert.equal(MSG_REACH_NO_IN, 'REACHABILITY_NO_IN');
        assert.equal(MSG_REACH_NO_OUT, 'REACHABILITY_NO_OUT');
        assert.equal(MSG_REACH_ISOLATED, 'REACHABILITY_ISOLATED');
    });

    it('codes are distinct', () => {
        const codes = new Set([
            MSG_DEPRECATION_BLOCK,
            MSG_DEPRECATION_PROP,
            MSG_REACH_NO_IN,
            MSG_REACH_NO_OUT,
            MSG_REACH_ISOLATED,
        ]);
        assert.equal(codes.size, 5);
    });
});

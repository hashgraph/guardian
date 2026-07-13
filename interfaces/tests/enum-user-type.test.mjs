import assert from 'node:assert/strict';
import { UserType } from '../dist/type/user.type.js';

describe('UserType enum', () => {
    it('exposes OWNER and CURRENT', () => {
        assert.equal(UserType.OWNER, 'owner');
        assert.equal(UserType.CURRENT, 'current');
    });

    it('uses lower-case string values (not the SCREAMING_SNAKE_CASE keys)', () => {
        for (const v of Object.values(UserType)) {
            assert.equal(v, v.toLowerCase());
        }
    });

    it('has exactly two entries', () => {
        assert.equal(Object.keys(UserType).length, 2);
    });
});

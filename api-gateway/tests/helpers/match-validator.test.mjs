import assert from 'node:assert/strict';
import { MatchConstraint } from '../../dist/helpers/decorators/match.validator.js';

describe('MatchConstraint (class-validator constraint for "passwords match")', () => {
    const c = new MatchConstraint();

    it('returns true when value === related property', () => {
        const args = { object: { password: 'secret123' }, constraints: ['password'] };
        assert.equal(c.validate('secret123', args), true);
    });

    it('returns false on mismatch', () => {
        const args = { object: { password: 'secret123' }, constraints: ['password'] };
        assert.equal(c.validate('other', args), false);
    });

    it('returns false when related property is undefined', () => {
        const args = { object: {}, constraints: ['password'] };
        assert.equal(c.validate('anything', args), false);
    });
});

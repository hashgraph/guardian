import assert from 'node:assert/strict';
import { validateSync } from 'class-validator';
import { Match, MatchConstraint } from '../dist/helpers/decorators/match.validator.js';

class PasswordPair {
    constructor(password, confirm) {
        this.password = password;
        this.confirm = confirm;
    }
}

Match('password', { message: 'must match password' })(
    PasswordPair.prototype,
    'confirm'
);

describe('Match decorator + MatchConstraint', () => {
    it('passes validation when the two properties are equal', () => {
        const errors = validateSync(new PasswordPair('s3cret', 's3cret'));
        assert.equal(errors.length, 0);
    });

    it('fails validation when the two properties differ', () => {
        const errors = validateSync(new PasswordPair('s3cret', 'other'));
        assert.equal(errors.length, 1);
        assert.equal(errors[0].property, 'confirm');
    });

    it('fails when one side is undefined', () => {
        const errors = validateSync(new PasswordPair('s3cret', undefined));
        assert.equal(errors.length, 1);
    });
});

describe('MatchConstraint.validate (direct)', () => {
    const constraint = new MatchConstraint();

    it('returns true when related property equals the value', () => {
        const ok = constraint.validate('abc', {
            constraints: ['other'],
            object: { other: 'abc' },
        });
        assert.equal(ok, true);
    });

    it('returns false when related property differs', () => {
        const ok = constraint.validate('abc', {
            constraints: ['other'],
            object: { other: 'xyz' },
        });
        assert.equal(ok, false);
    });

    it('uses strict equality (string vs number)', () => {
        const ok = constraint.validate('1', {
            constraints: ['other'],
            object: { other: 1 },
        });
        assert.equal(ok, false);
    });
});

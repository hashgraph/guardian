import assert from 'node:assert/strict';
import { validateSync } from 'class-validator';
import { Match, MatchConstraint } from '../../../dist/helpers/decorators/match.validator.js';

describe('MatchConstraint.validate edge cases', () => {
    const c = new MatchConstraint();

    it('treats two undefined values as matching', () => {
        assert.equal(c.validate(undefined, { object: {}, constraints: ['other'] }), true);
    });

    it('treats null vs undefined as not matching', () => {
        assert.equal(c.validate(null, { object: { other: undefined }, constraints: ['other'] }), false);
    });

    it('matches identical object references but not structural equals', () => {
        const shared = { a: 1 };
        assert.equal(c.validate(shared, { object: { other: shared }, constraints: ['other'] }), true);
        assert.equal(c.validate({ a: 1 }, { object: { other: { a: 1 } }, constraints: ['other'] }), false);
    });

    it('matches NaN against itself as false (strict equality)', () => {
        assert.equal(c.validate(NaN, { object: { other: NaN }, constraints: ['other'] }), false);
    });

    it('uses the first constraint as the related property name', () => {
        const args = { object: { primary: 'v', secondary: 'v' }, constraints: ['primary', 'secondary'] };
        assert.equal(c.validate('v', args), true);
    });
});

describe('Match decorator registration + integration', () => {
    it('registers a validator that fails on numeric vs string mismatch', () => {
        class Dto {
            constructor(a, b) { this.a = a; this.b = b; }
        }
        Match('a')(Dto.prototype, 'b');
        assert.equal(validateSync(new Dto(1, '1')).length, 1);
        assert.equal(validateSync(new Dto(1, 1)).length, 0);
    });

    it('passes the custom message through validationOptions', () => {
        class Dto2 {
            constructor(a, b) { this.a = a; this.b = b; }
        }
        Match('a', { message: 'fields must match' })(Dto2.prototype, 'b');
        const errors = validateSync(new Dto2('x', 'y'));
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constraints.Match, 'fields must match');
    });

    it('registers the constraint against the target constructor', () => {
        class Dto3 {
            constructor(a, b) { this.a = a; this.b = b; }
        }
        Match('a')(Dto3.prototype, 'b');
        assert.equal(validateSync(new Dto3('same', 'same')).length, 0);
    });
});

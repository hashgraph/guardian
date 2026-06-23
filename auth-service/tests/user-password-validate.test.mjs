import { assert } from 'chai';
import { UserPassword } from '../dist/utils/user-password.js';
import { minPasswordLength, passwordComplexity, PasswordComplexityEnum } from '../dist/constants/password.js';

describe('@unit UserPassword.validatePassword — length gate', () => {
    it('rejects an empty password', () => {
        assert.equal(UserPassword.validatePassword(''), false);
    });

    it('rejects a password one char below the minimum', () => {
        const pw = 'Aa1' + 'a'.repeat(Math.max(0, minPasswordLength - 4));
        if (pw.length < minPasswordLength) {
            assert.equal(UserPassword.validatePassword(pw), false);
        }
    });

    it('a sufficiently long, fully-complex password is accepted at any tier', () => {
        const pw = 'Aa1!'.repeat(Math.ceil(minPasswordLength / 4) + 1);
        assert.equal(UserPassword.validatePassword(pw), true);
    });
});

describe('@unit UserPassword.validatePassword — default (MEDIUM) complexity behaviour', () => {
    const isMedium = passwordComplexity === PasswordComplexityEnum.MEDIUM;

    it('returns a boolean for any input', () => {
        assert.equal(typeof UserPassword.validatePassword('whatever-long-enough-1A'), 'boolean');
    });

    it('rejects long all-lowercase password under MEDIUM', function () {
        if (!isMedium) return this.skip();
        assert.equal(UserPassword.validatePassword('abcdefghijkl'), false);
    });

    it('rejects long password missing a digit under MEDIUM', function () {
        if (!isMedium) return this.skip();
        assert.equal(UserPassword.validatePassword('AbcdefghIJKL'), false);
    });

    it('rejects long password missing an uppercase under MEDIUM', function () {
        if (!isMedium) return this.skip();
        assert.equal(UserPassword.validatePassword('abcdefgh1234'), false);
    });

    it('accepts a password with lower+upper+digit under MEDIUM (no symbol required)', function () {
        if (!isMedium) return this.skip();
        assert.equal(UserPassword.validatePassword('Abcdefgh1234'), true);
    });

    it('accepts a password that also has a symbol under MEDIUM', function () {
        if (!isMedium) return this.skip();
        assert.equal(UserPassword.validatePassword('Abcdefgh123!'), true);
    });
});

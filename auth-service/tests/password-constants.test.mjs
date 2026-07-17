import assert from 'node:assert/strict';
import { PasswordComplexityEnum, minPasswordLength, passwordComplexity, PasswordError } from '../dist/constants/password.js';

describe('auth-service password constants', () => {
    it('PasswordComplexityEnum exposes easy/medium/hard', () => {
        assert.equal(PasswordComplexityEnum.EASY, 'easy');
        assert.equal(PasswordComplexityEnum.MEDIUM, 'medium');
        assert.equal(PasswordComplexityEnum.HARD, 'hard');
    });
    it('minPasswordLength is at least 1 and defaults to 8 when env is unset', () => {
        assert.ok(minPasswordLength >= 1);
        // Default branch (no MIN_PASSWORD_LENGTH env) yields 8
        if (!process.env.MIN_PASSWORD_LENGTH) {
            assert.equal(minPasswordLength, 8);
        }
    });
    it('passwordComplexity defaults to MEDIUM when env is unset', () => {
        if (!process.env.PASSWORD_COMPLEXITY) {
            assert.equal(passwordComplexity, PasswordComplexityEnum.MEDIUM);
        }
    });
    it('PasswordError exposes a tailored message per complexity tier', () => {
        for (const tier of [PasswordComplexityEnum.EASY, PasswordComplexityEnum.MEDIUM, PasswordComplexityEnum.HARD]) {
            assert.equal(typeof PasswordError[tier], 'string');
            assert.ok(PasswordError[tier].includes(String(minPasswordLength)));
        }
        assert.ok(PasswordError[PasswordComplexityEnum.HARD].length > PasswordError[PasswordComplexityEnum.EASY].length);
    });
});

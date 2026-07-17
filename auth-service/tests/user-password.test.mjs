import assert from 'node:assert/strict';
import { UserPassword, PasswordType } from '../dist/utils/user-password.js';

describe('UserPassword.generatePasswordV1 / verifyPasswordV1', () => {
    it('hashes deterministically (sha256, no salt)', async () => {
        const a = await UserPassword.generatePasswordV1('hunter2');
        const b = await UserPassword.generatePasswordV1('hunter2');
        assert.equal(a.password, b.password);
        assert.equal(a.salt, null);
        assert.equal(a.passwordVersion, PasswordType.V1);
    });

    it('verifyPasswordV1 succeeds for the matching plaintext', async () => {
        const stored = await UserPassword.generatePasswordV1('correct-horse');
        assert.equal(await UserPassword.verifyPasswordV1(stored, 'correct-horse'), true);
    });

    it('verifyPasswordV1 fails for the wrong plaintext', async () => {
        const stored = await UserPassword.generatePasswordV1('correct-horse');
        assert.equal(await UserPassword.verifyPasswordV1(stored, 'battery-staple'), false);
    });

    it('verifyPasswordV1 returns false when the stored record is missing', async () => {
        assert.equal(await UserPassword.verifyPasswordV1(null, 'anything'), false);
        assert.equal(await UserPassword.verifyPasswordV1(undefined, 'anything'), false);
    });
});

describe('UserPassword.generatePasswordV2 / verifyPasswordV2', function () {
    this.timeout(20000);

    it('produces a unique salt each call', async () => {
        const a = await UserPassword.generatePasswordV2('hunter2');
        const b = await UserPassword.generatePasswordV2('hunter2');
        assert.notEqual(a.salt, b.salt);
        assert.notEqual(a.password, b.password);
        assert.equal(a.passwordVersion, PasswordType.V2);
    });

    it('verifyPasswordV2 succeeds for the matching plaintext', async () => {
        const stored = await UserPassword.generatePasswordV2('s3cret-pw');
        assert.equal(await UserPassword.verifyPasswordV2(stored, 's3cret-pw'), true);
    });

    it('verifyPasswordV2 fails for the wrong plaintext', async () => {
        const stored = await UserPassword.generatePasswordV2('s3cret-pw');
        assert.equal(await UserPassword.verifyPasswordV2(stored, 'wrong-pw'), false);
    });

    it('verifyPasswordV2 returns false when the stored record is missing', async () => {
        assert.equal(await UserPassword.verifyPasswordV2(null, 'anything'), false);
    });
});

describe('UserPassword.verifyPassword (version dispatch)', function () {
    this.timeout(20000);

    it('delegates V2 records to the pbkdf2 verifier', async () => {
        const v2 = await UserPassword.generatePasswordV2('pw-v2');
        assert.equal(await UserPassword.verifyPassword(v2, 'pw-v2'), true);
        assert.equal(await UserPassword.verifyPassword(v2, 'nope'), false);
    });

    it('delegates V1 records (and unspecified versions) to the sha256 verifier', async () => {
        const v1 = await UserPassword.generatePasswordV1('pw-v1');
        assert.equal(await UserPassword.verifyPassword(v1, 'pw-v1'), true);
        assert.equal(await UserPassword.verifyPassword(v1, 'nope'), false);
    });

    it('returns false when no stored password is provided', async () => {
        assert.equal(await UserPassword.verifyPassword(null, 'anything'), false);
    });
});

describe('UserPassword.validatePassword', () => {
    // Note: complexity rules are read at module load from environment-driven
    // constants. Without overriding env, we exercise the always-applicable
    // length check and the pattern-pass case for a strong password.

    it('rejects passwords shorter than the configured minimum', () => {
        assert.equal(UserPassword.validatePassword('a'), false);
    });

    it('accepts a strong password that satisfies any complexity tier', () => {
        // 12+ chars, lower+upper+digit+symbol — passes EASY/MEDIUM/HARD.
        assert.equal(UserPassword.validatePassword('Aa1!Aa1!Aa1!'), true);
    });
});

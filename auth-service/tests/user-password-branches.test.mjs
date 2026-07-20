import assert from 'node:assert/strict';
import esmock from 'esmock';

const PasswordComplexityEnum = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' };

async function loadWithComplexity(complexity, minLen = 8) {
    return esmock('../dist/utils/user-password.js', {
        '#constants': {
            PasswordComplexityEnum,
            minPasswordLength: minLen,
            passwordComplexity: complexity,
        },
    });
}

async function loadWithBrokenPbkdf2() {
    return esmock('../dist/utils/user-password.js', {
        crypto: {
            randomBytes: () => Buffer.from('00'.repeat(16), 'hex'),
            createHash: () => ({ update: () => ({ digest: () => 'x' }) }),
            pbkdf2: (_pw, _salt, _it, _len, _alg, cb) => cb(new Error('pbkdf2-fail')),
        },
    });
}

describe('UserPassword.validatePassword — complexity tiers', function () {
    this.timeout(60000);

    it('HARD requires a special character (line 120-121, 127-128)', async () => {
        const { UserPassword } = await loadWithComplexity(PasswordComplexityEnum.HARD);
        assert.equal(UserPassword.validatePassword('Abcdefgh1234'), false);
        assert.equal(UserPassword.validatePassword('Abcdefgh123!'), true);
    });

    it('EASY only enforces length (line 122-124, returns true at 131)', async () => {
        const { UserPassword } = await loadWithComplexity(PasswordComplexityEnum.EASY);
        assert.equal(UserPassword.validatePassword('alllowercase'), true);
        assert.equal(UserPassword.validatePassword('short'), false);
    });

    it('unknown complexity falls through default to length-only (line 124)', async () => {
        const { UserPassword } = await loadWithComplexity('something-else');
        assert.equal(UserPassword.validatePassword('alllowercase'), true);
    });
});

describe('UserPassword V2 pbkdf2 error propagation', function () {
    this.timeout(60000);

    it('generatePasswordV2 rejects when pbkdf2 errors (line 54-55)', async () => {
        const { UserPassword } = await loadWithBrokenPbkdf2();
        await assert.rejects(() => UserPassword.generatePasswordV2('pw'), /pbkdf2-fail/);
    });

    it('verifyPasswordV2 rejects when pbkdf2 errors (line 84-85)', async () => {
        const { UserPassword } = await loadWithBrokenPbkdf2();
        await assert.rejects(
            () => UserPassword.verifyPasswordV2({ password: 'h', salt: 's', passwordVersion: 'v2' }, 'pw'),
            /pbkdf2-fail/,
        );
    });

    it('verifyPasswordV2 resolves false when record is missing (line 72-74)', async () => {
        const { UserPassword } = await loadWithBrokenPbkdf2();
        assert.equal(await UserPassword.verifyPasswordV2(null, 'pw'), false);
    });
});

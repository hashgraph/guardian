import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import {
    registerSchema,
    loginSchema,
    ChangePasswordDTO,
    LoginUserDTO,
    RegisterUserDTO,
    AccessTokenRequestDTO,
    OTPConfirmDTO,
} from '../../dist/middlewares/validation/schemas/accounts.js';

const assignTo = (Cls, props) => Object.assign(new Cls(), props);

describe('registerSchema (yup)', () => {
    const schema = registerSchema();

    it('accepts a complete valid body', () => {
        assert.equal(schema.isValidSync({ body: { username: 'u', password: 'p', password_confirmation: 'p', role: 'STANDARD_REGISTRY' } }), true);
    });

    it('rejects mismatched password confirmation', () => {
        assert.equal(schema.isValidSync({ body: { username: 'u', password: 'p', password_confirmation: 'x', role: 'STANDARD_REGISTRY' } }), false);
    });

    it('rejects a missing username', () => {
        assert.equal(schema.isValidSync({ body: { password: 'p', password_confirmation: 'p', role: 'STANDARD_REGISTRY' } }), false);
    });

    it('rejects an invalid role', () => {
        assert.equal(schema.isValidSync({ body: { username: 'u', password: 'p', password_confirmation: 'p', role: 'NOPE' } }), false);
    });

    it('rejects an empty body', () => {
        assert.equal(schema.isValidSync({ body: {} }), false);
    });
});

describe('loginSchema (yup)', () => {
    const schema = loginSchema();

    it('accepts a username/password body', () => {
        assert.equal(schema.isValidSync({ body: { username: 'u', password: 'p' } }), true);
    });

    it('rejects a missing password', () => {
        assert.equal(schema.isValidSync({ body: { username: 'u' } }), false);
    });

    it('rejects an empty username', () => {
        assert.equal(schema.isValidSync({ body: { username: '', password: 'p' } }), false);
    });
});

describe('ChangePasswordDTO (class-validator)', () => {
    it('passes when all fields are non-empty strings', async () => {
        const errs = await validate(assignTo(ChangePasswordDTO, { username: 'u', oldPassword: 'o', newPassword: 'n' }));
        assert.equal(errs.length, 0);
    });

    it('reports errors for every missing field', async () => {
        const errs = await validate(new ChangePasswordDTO());
        assert.equal(errs.length, 3);
    });

    it('rejects an empty username', async () => {
        const errs = await validate(assignTo(ChangePasswordDTO, { username: '', oldPassword: 'o', newPassword: 'n' }));
        assert.ok(errs.some((e) => e.property === 'username'));
    });
});

describe('LoginUserDTO (class-validator)', () => {
    it('passes with username and password only', async () => {
        const errs = await validate(assignTo(LoginUserDTO, { username: 'u', password: 'p' }));
        assert.equal(errs.length, 0);
    });

    it('accepts optional tenantId and otp', async () => {
        const errs = await validate(assignTo(LoginUserDTO, { username: 'u', password: 'p', tenantId: 't', otp: '123' }));
        assert.equal(errs.length, 0);
    });

    it('rejects a non-string username', async () => {
        const errs = await validate(assignTo(LoginUserDTO, { username: 5, password: 'p' }));
        assert.ok(errs.some((e) => e.property === 'username'));
    });
});

describe('RegisterUserDTO (class-validator)', () => {
    it('passes when password_confirmation matches and role is valid', async () => {
        const errs = await validate(assignTo(RegisterUserDTO, {
            username: 'u', password: 'p', password_confirmation: 'p', role: 'STANDARD_REGISTRY',
        }));
        assert.equal(errs.length, 0);
    });

    it('reports a Match error when confirmation differs', async () => {
        const errs = await validate(assignTo(RegisterUserDTO, {
            username: 'u', password: 'p', password_confirmation: 'x', role: 'STANDARD_REGISTRY',
        }));
        assert.ok(errs.some((e) => e.property === 'password_confirmation'));
    });

    it('rejects a role not in UserRole', async () => {
        const errs = await validate(assignTo(RegisterUserDTO, {
            username: 'u', password: 'p', password_confirmation: 'p', role: 'NOPE',
        }));
        assert.ok(errs.some((e) => e.property === 'role'));
    });
});

describe('AccessTokenRequestDTO (class-validator)', () => {
    it('passes with a non-empty refreshToken', async () => {
        const errs = await validate(assignTo(AccessTokenRequestDTO, { refreshToken: 'tok' }));
        assert.equal(errs.length, 0);
    });

    it('rejects an empty refreshToken', async () => {
        const errs = await validate(assignTo(AccessTokenRequestDTO, { refreshToken: '' }));
        assert.ok(errs.some((e) => e.property === 'refreshToken'));
    });
});

describe('OTPConfirmDTO (class-validator)', () => {
    it('passes with a string token', async () => {
        const errs = await validate(assignTo(OTPConfirmDTO, { token: '000000' }));
        assert.equal(errs.length, 0);
    });

    it('rejects a non-string token', async () => {
        const errs = await validate(assignTo(OTPConfirmDTO, { token: 123 }));
        assert.ok(errs.some((e) => e.property === 'token'));
    });
});

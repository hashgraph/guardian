import assert from 'node:assert/strict';
import { registerSchema, loginSchema } from '../../dist/middlewares/validation/schemas/accounts.js';

describe('loginSchema (yup)', () => {
    const schema = loginSchema();

    it('is a builder returning a yup schema', () => {
        assert.equal(typeof loginSchema, 'function');
        assert.equal(typeof schema.validate, 'function');
        assert.equal(typeof schema.isValid, 'function');
    });

    it('accepts a username + password body', async () => {
        assert.equal(await schema.isValid({ body: { username: 'alice', password: 'secret' } }), true);
    });

    it('rejects a missing password', async () => {
        assert.equal(await schema.isValid({ body: { username: 'alice' } }), false);
    });

    it('rejects a missing username', async () => {
        assert.equal(await schema.isValid({ body: { password: 'secret' } }), false);
    });

    it('rejects an empty username', async () => {
        assert.equal(await schema.isValid({ body: { username: '', password: 'secret' } }), false);
    });

    it('rejects an empty password', async () => {
        assert.equal(await schema.isValid({ body: { username: 'alice', password: '' } }), false);
    });

    it('surfaces the required-password message', async () => {
        await assert.rejects(
            () => schema.validate({ body: { username: 'alice' } }, { abortEarly: false }),
            (err) => {
                assert.ok(err.errors.some((m) => /password field is required/.test(m)));
                return true;
            }
        );
    });
});

describe('registerSchema (yup)', () => {
    const schema = registerSchema();

    const validBody = {
        username: 'newsr',
        password: 'StrongPassword3#',
        password_confirmation: 'StrongPassword3#',
        role: 'STANDARD_REGISTRY',
    };

    it('is a builder returning a yup schema', () => {
        assert.equal(typeof registerSchema, 'function');
        assert.equal(typeof schema.validate, 'function');
    });

    it('accepts a complete, matching registration body', async () => {
        assert.equal(await schema.isValid({ body: validBody }), true);
    });

    it('rejects a registration with mismatched password confirmation', async () => {
        assert.equal(
            await schema.isValid({ body: { ...validBody, password_confirmation: 'Different1#' } }),
            false
        );
    });

    it('surfaces the "Passwords must match" message on mismatch', async () => {
        await assert.rejects(
            () => schema.validate({ body: { ...validBody, password_confirmation: 'Different1#' } }, { abortEarly: false }),
            (err) => {
                assert.ok(err.errors.some((m) => /Passwords must match/.test(m)));
                return true;
            }
        );
    });

    it('rejects a registration missing the role', async () => {
        const { role, ...noRole } = validBody;
        assert.equal(await schema.isValid({ body: noRole }), false);
    });

    it('rejects an unknown role value', async () => {
        assert.equal(await schema.isValid({ body: { ...validBody, role: 'NOT_A_ROLE' } }), false);
    });

    it('rejects a registration missing the username', async () => {
        const { username, ...noUser } = validBody;
        assert.equal(await schema.isValid({ body: noUser }), false);
    });

    it('rejects a registration missing the password', async () => {
        const { password, ...noPass } = validBody;
        assert.equal(await schema.isValid({ body: noPass }), false);
    });

    it('builds a fresh schema instance on each call', () => {
        assert.notEqual(registerSchema(), registerSchema());
    });
});

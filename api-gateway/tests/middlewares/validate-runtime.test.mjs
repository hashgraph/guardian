import assert from 'node:assert/strict';
import * as yup from 'yup';
import validate, { prepareValidationResponse } from '../../dist/middlewares/validation/index.js';
import fieldsValidation from '../../dist/middlewares/validation/fields-validation.js';

const makeRes = () => ({
    code: undefined,
    body: undefined,
    status(c) { this.code = c; return this; },
    send(b) { this.body = b; return this; },
});

describe('prepareValidationResponse edge cases', () => {
    it('wraps a null error as a single-element array (no errors property)', () => {
        assert.deepEqual(prepareValidationResponse(null), { type: 'ValidationError', message: [null] });
    });

    it('wraps undefined as a single-element array', () => {
        assert.deepEqual(prepareValidationResponse(undefined), { type: 'ValidationError', message: [undefined] });
    });

    it('keeps an explicit empty errors array as the message', () => {
        assert.deepEqual(prepareValidationResponse({ errors: [] }), { type: 'ValidationError', message: [] });
    });

    it('falls back to wrapping the error when errors is an empty string (falsy)', () => {
        const err = { errors: '' };
        assert.deepEqual(prepareValidationResponse(err), { type: 'ValidationError', message: [err] });
    });

    it('passes through a populated errors array verbatim', () => {
        assert.deepEqual(
            prepareValidationResponse({ errors: ['x', 'y'] }, 'YupError'),
            { type: 'YupError', message: ['x', 'y'] }
        );
    });
});

describe('validate middleware runtime branches', () => {
    it('defaults type to ValidationError when the thrown error has no name', async () => {
        const res = makeRes();
        let nexted = false;
        const mw = validate({ validate: async () => { throw { errors: ['boom'] }; } });
        await mw({ body: {}, query: {}, params: {} }, res, () => { nexted = true; });
        assert.equal(res.code, 422);
        assert.deepEqual(res.body, { type: 'ValidationError', message: ['boom'] });
        assert.equal(nexted, false);
    });

    it('wraps a thrown non-object string into the message array', async () => {
        const res = makeRes();
        const mw = validate({ validate: async () => { throw 'raw failure'; } });
        await mw({ body: {}, query: {}, params: {} }, res, () => {});
        assert.equal(res.code, 422);
        assert.deepEqual(res.body.message, ['raw failure']);
    });

    it('does not call next() after a validation failure', async () => {
        const res = makeRes();
        let nexted = false;
        const mw = validate({ validate: async () => { throw { name: 'E', errors: ['e'] }; } });
        await mw({ body: {}, query: {}, params: {} }, res, () => { nexted = true; });
        assert.equal(nexted, false);
    });

    it('returns the same res instance from the success path (next return value)', async () => {
        const mw = validate({ validate: async () => undefined });
        const sentinel = Symbol('next-return');
        const result = await mw({ body: {}, query: {}, params: {} }, makeRes(), () => sentinel);
        assert.equal(result, sentinel);
    });

    it('integrates with a real yup object schema and calls next on valid input', async () => {
        const schema = yup.object({ body: yup.object({ name: fieldsValidation.name }) });
        let called = false;
        await validate(schema)({ body: { name: 'Alice' }, query: {}, params: {} }, makeRes(), () => { called = true; });
        assert.equal(called, true);
    });

    it('integrates with a real yup object schema and responds 422 on invalid input', async () => {
        const schema = yup.object({ body: yup.object({ name: fieldsValidation.name }) });
        const res = makeRes();
        await validate(schema)({ body: { name: '' }, query: {}, params: {} }, res, () => {});
        assert.equal(res.code, 422);
        assert.equal(res.body.type, 'ValidationError');
        assert.ok(res.body.message.includes('The name field can not be empty'));
    });
});

describe('fieldsValidation uncovered branches', () => {
    it('oppositeTokenId coerces a number to its string form (yup string cast)', async () => {
        assert.equal(await fieldsValidation.oppositeTokenId.isValid(123), true);
        assert.equal(fieldsValidation.oppositeTokenId.cast(123), '123');
    });

    it('oppositeTokenId rejects a non-castable object with its typeError message', async () => {
        try {
            await fieldsValidation.oppositeTokenId.validate({}, { abortEarly: false });
            assert.fail('expected a type error');
        } catch (err) {
            assert.ok(err.errors.includes('The oppositeTokenId field must be a string'), JSON.stringify(err.errors));
        }
    });

    it('baseTokenCount rejects a non-string with its typeError message', async () => {
        try {
            await fieldsValidation.baseTokenCount.validate({}, { abortEarly: false });
            assert.fail('expected a type error');
        } catch (err) {
            assert.ok(err.errors.includes('The baseTokenCount field must be a string'), JSON.stringify(err.errors));
        }
    });

    it('oppositeTokenSerials within an object schema accepts an array of numbers', async () => {
        const schema = yup.object({
            baseTokenId: fieldsValidation.baseTokenId,
            oppositeTokenId: fieldsValidation.oppositeTokenId,
            oppositeTokenSerials: fieldsValidation.oppositeTokenSerials,
        });
        const ok = await schema.isValid({
            baseTokenId: '0.0.1',
            oppositeTokenId: '0.0.2',
            oppositeTokenSerials: [1, 2, 3],
        });
        assert.equal(ok, true);
    });

    it('oppositeTokenSerials within an object schema accepts null', async () => {
        const schema = yup.object({
            baseTokenId: fieldsValidation.baseTokenId,
            oppositeTokenId: fieldsValidation.oppositeTokenId,
            oppositeTokenSerials: fieldsValidation.oppositeTokenSerials,
        });
        const ok = await schema.isValid({
            baseTokenId: '0.0.1',
            oppositeTokenId: '0.0.2',
            oppositeTokenSerials: null,
        });
        assert.equal(ok, true);
    });

    it('oppositeTokenSerials rejects a non-numeric array element', async () => {
        const ok = await fieldsValidation.oppositeTokenSerials.isValid(['not-a-number']);
        assert.equal(ok, false);
    });

    it('baseTokenSerials coerces numeric-string elements (yup number cast)', async () => {
        assert.equal(await fieldsValidation.baseTokenSerials.isValid(['1', '2']), true);
    });

    it('password_confirmation matching is order-sensitive to the password ref', async () => {
        const schema = yup.object({
            password: fieldsValidation.password,
            password_confirmation: fieldsValidation.password_confirmation,
        });
        assert.equal(await schema.isValid({ password: 'p@ss', password_confirmation: 'p@ss' }), true);
        assert.equal(await schema.isValid({ password: 'p@ss', password_confirmation: 'P@SS' }), false);
    });

    it('role accepts every value derived from Object.values(UserRole) plus ROOT_AUTHORITY', async () => {
        assert.equal(await fieldsValidation.role.isValid('ROOT_AUTHORITY'), true);
    });
});

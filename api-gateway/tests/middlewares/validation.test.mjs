import assert from 'node:assert/strict';
import * as yup from 'yup';
import validate, { prepareValidationResponse } from '../../dist/middlewares/validation/index.js';
import { IsNumberOrString } from '../../dist/middlewares/validation/string-or-number.js';
import { IsStringOrObject } from '../../dist/middlewares/validation/string-or-object.js';
import fieldsValidation from '../../dist/middlewares/validation/fields-validation.js';
import { UserRole, SchemaEntity } from '@guardian/interfaces';

describe('IsNumberOrString constraint', () => {
    const c = new IsNumberOrString();
    it('accepts numbers', () => assert.equal(c.validate(5), true));
    it('accepts strings', () => assert.equal(c.validate('x'), true));
    it('rejects objects', () => assert.equal(c.validate({}), false));
    it('rejects null', () => assert.equal(c.validate(null), false));
    it('rejects booleans', () => assert.equal(c.validate(true), false));
    it('exposes a default message', () => assert.match(c.defaultMessage(), /must be number or string/));
});

describe('IsStringOrObject constraint', () => {
    const c = new IsStringOrObject();
    it('accepts strings', () => assert.equal(c.validate('x'), true));
    it('accepts objects', () => assert.equal(c.validate({}), true));
    it('accepts null (typeof null === object)', () => assert.equal(c.validate(null), true));
    it('rejects numbers', () => assert.equal(c.validate(5), false));
    it('rejects booleans', () => assert.equal(c.validate(false), false));
    it('exposes a default message', () => assert.match(c.defaultMessage(), /must be object or string/));
});

describe('prepareValidationResponse', () => {
    it('wraps an errors array under message', () => {
        assert.deepEqual(prepareValidationResponse({ errors: ['a', 'b'] }), { type: 'ValidationError', message: ['a', 'b'] });
    });
    it('wraps a bare error in a single-element array', () => {
        assert.deepEqual(prepareValidationResponse('boom'), { type: 'ValidationError', message: ['boom'] });
    });
    it('uses the provided type', () => {
        assert.equal(prepareValidationResponse({ errors: [] }, 'CustomError').type, 'CustomError');
    });
    it('defaults the type to ValidationError', () => {
        assert.equal(prepareValidationResponse({ errors: [] }).type, 'ValidationError');
    });
});

describe('validate middleware', () => {
    const makeRes = () => ({
        code: undefined, body: undefined,
        status(c) { this.code = c; return this; },
        send(b) { this.body = b; return this; }
    });

    it('calls next() when the schema resolves', async () => {
        let called = false;
        const mw = validate({ validate: async () => undefined });
        await mw({ body: {}, query: {}, params: {} }, makeRes(), () => { called = true; });
        assert.equal(called, true);
    });

    it('passes body/query/params with abortEarly:false to the schema', async () => {
        let received;
        let opts;
        const mw = validate({ validate: async (data, o) => { received = data; opts = o; } });
        await mw({ body: { a: 1 }, query: { b: 2 }, params: { c: 3 } }, makeRes(), () => {});
        assert.deepEqual(received, { body: { a: 1 }, query: { b: 2 }, params: { c: 3 } });
        assert.equal(opts.abortEarly, false);
    });

    it('responds 422 with a prepared body on validation failure', async () => {
        const res = makeRes();
        let nexted = false;
        const err = { name: 'MyError', errors: ['bad'] };
        const mw = validate({ validate: async () => { throw err; } });
        await mw({ body: {}, query: {}, params: {} }, res, () => { nexted = true; });
        assert.equal(res.code, 422);
        assert.deepEqual(res.body, { type: 'MyError', message: ['bad'] });
        assert.equal(nexted, false);
    });
});

describe('fieldsValidation yup schemas', () => {
    const f = fieldsValidation;

    it('contractId is a required string', () => {
        assert.equal(f.contractId.isValidSync('0.0.1'), true);
        assert.equal(f.contractId.isValidSync(undefined), false);
    });

    it('description is required', () => {
        assert.equal(f.description.isValidSync('x'), true);
        assert.equal(f.description.isValidSync(undefined), false);
    });

    it('requestId is required', () => {
        assert.equal(f.requestId.isValidSync('r'), true);
        assert.equal(f.requestId.isValidSync(undefined), false);
    });

    it('name rejects empty and missing values', () => {
        assert.equal(f.name.isValidSync('Alice'), true);
        assert.equal(f.name.isValidSync(''), false);
        assert.equal(f.name.isValidSync(undefined), false);
    });

    it('username rejects empty and missing values', () => {
        assert.equal(f.username.isValidSync('bob'), true);
        assert.equal(f.username.isValidSync(''), false);
    });

    it('password rejects empty and missing values', () => {
        assert.equal(f.password.isValidSync('secret'), true);
        assert.equal(f.password.isValidSync(''), false);
    });

    it('oppositeTokenId is a nullable string', () => {
        assert.equal(f.oppositeTokenId.isValidSync(null), true);
        assert.equal(f.oppositeTokenId.isValidSync('0.0.2'), true);
    });

    it('baseTokenSerials requires at least one numeric entry', () => {
        assert.equal(f.baseTokenSerials.isValidSync([1, 2]), true);
        assert.equal(f.baseTokenSerials.isValidSync([]), false);
        assert.equal(f.baseTokenSerials.isValidSync(undefined), false);
    });

    it('entity accepts only STANDARD_REGISTRY or USER', () => {
        assert.equal(f.entity.isValidSync(SchemaEntity.STANDARD_REGISTRY), true);
        assert.equal(f.entity.isValidSync(SchemaEntity.USER), true);
        assert.equal(f.entity.isValidSync('SOMETHING_ELSE'), false);
    });

    it('role accepts UserRole values and ROOT_AUTHORITY', () => {
        assert.equal(f.role.isValidSync('ROOT_AUTHORITY'), true);
        assert.equal(f.role.isValidSync(Object.values(UserRole)[0]), true);
        assert.equal(f.role.isValidSync('NOT_A_ROLE'), false);
    });

    it('password_confirmation must match password within an object schema', () => {
        const schema = yup.object({ password: f.password, password_confirmation: f.password_confirmation });
        assert.equal(schema.isValidSync({ password: 'a', password_confirmation: 'a' }), true);
        assert.equal(schema.isValidSync({ password: 'a', password_confirmation: 'b' }), false);
    });

    it('operatorId and operatorKey are required', () => {
        assert.equal(f.operatorId.isValidSync('0.0.1'), true);
        assert.equal(f.operatorId.isValidSync(undefined), false);
        assert.equal(f.operatorKey.isValidSync('key'), true);
        assert.equal(f.operatorKey.isValidSync(undefined), false);
    });

    it('messageId is required', () => {
        assert.equal(f.messageId.isValidSync('m'), true);
        assert.equal(f.messageId.isValidSync(undefined), false);
    });
});

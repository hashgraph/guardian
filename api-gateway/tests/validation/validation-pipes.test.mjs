import assert from 'node:assert/strict';
import * as yup from 'yup';
import validate, { prepareValidationResponse } from '../../dist/middlewares/validation/index.js';
import { pageHeader } from '../../dist/middlewares/validation/page-header.js';
import fieldsValidation from '../../dist/middlewares/validation/fields-validation.js';
import { IsNumberOrString } from '../../dist/middlewares/validation/string-or-number.js';
import { IsStringOrObject } from '../../dist/middlewares/validation/string-or-object.js';

function buildRes() {
    return {
        statusCode: null,
        payload: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        send(payload) {
            this.payload = payload;
            return this;
        },
    };
}

describe('@unit IsNumberOrString constraint', () => {
    const c = new IsNumberOrString();

    it('accepts an integer', () => assert.equal(c.validate(42, {}), true));
    it('accepts zero', () => assert.equal(c.validate(0, {}), true));
    it('accepts a negative number', () => assert.equal(c.validate(-3.5, {}), true));
    it('accepts Infinity', () => assert.equal(c.validate(Infinity, {}), true));
    it('accepts NaN because typeof NaN is number', () => assert.equal(c.validate(NaN, {}), true));
    it('accepts a non-empty string', () => assert.equal(c.validate('hello', {}), true));
    it('accepts an empty string', () => assert.equal(c.validate('', {}), true));
    it('rejects a boolean true', () => assert.equal(c.validate(true, {}), false));
    it('rejects a plain object', () => assert.equal(c.validate({}, {}), false));
    it('rejects an array', () => assert.equal(c.validate([1, 2], {}), false));
    it('rejects null', () => assert.equal(c.validate(null, {}), false));
    it('rejects undefined', () => assert.equal(c.validate(undefined, {}), false));
    it('rejects a bigint', () => assert.equal(c.validate(10n, {}), false));
    it('rejects a symbol', () => assert.equal(c.validate(Symbol('x'), {}), false));
    it('rejects a function', () => assert.equal(c.validate(() => 0, {}), false));
    it('returns the documented default message', () => {
        assert.equal(c.defaultMessage({}), '($value) must be number or string');
    });
});

describe('@unit IsStringOrObject constraint', () => {
    const c = new IsStringOrObject();

    it('accepts a populated object', () => assert.equal(c.validate({ a: 1 }, {}), true));
    it('accepts an empty object', () => assert.equal(c.validate({}, {}), true));
    it('accepts an array because typeof array is object', () => assert.equal(c.validate([1], {}), true));
    it('accepts null because typeof null is object', () => assert.equal(c.validate(null, {}), true));
    it('accepts a non-empty string', () => assert.equal(c.validate('value', {}), true));
    it('accepts an empty string', () => assert.equal(c.validate('', {}), true));
    it('rejects an integer', () => assert.equal(c.validate(123, {}), false));
    it('rejects NaN', () => assert.equal(c.validate(NaN, {}), false));
    it('rejects a boolean false', () => assert.equal(c.validate(false, {}), false));
    it('rejects undefined', () => assert.equal(c.validate(undefined, {}), false));
    it('rejects a bigint', () => assert.equal(c.validate(5n, {}), false));
    it('rejects a symbol', () => assert.equal(c.validate(Symbol('y'), {}), false));
    it('rejects a function', () => assert.equal(c.validate(function () {}, {}), false));
    it('returns the documented default message', () => {
        assert.equal(c.defaultMessage({}), '($value) must be object or string');
    });
});

describe('@unit prepareValidationResponse', () => {
    it('passes through a populated errors array under message', () => {
        assert.deepEqual(
            prepareValidationResponse({ errors: ['a', 'b'] }),
            { type: 'ValidationError', message: ['a', 'b'] }
        );
    });

    it('wraps a bare string error in a single-element array', () => {
        assert.deepEqual(
            prepareValidationResponse('boom'),
            { type: 'ValidationError', message: ['boom'] }
        );
    });

    it('wraps an err whose errors property is undefined', () => {
        assert.deepEqual(
            prepareValidationResponse({ message: 'x' }),
            { type: 'ValidationError', message: [{ message: 'x' }] }
        );
    });

    it('returns the empty errors array unchanged because an empty array is truthy', () => {
        assert.deepEqual(
            prepareValidationResponse({ errors: [] }),
            { type: 'ValidationError', message: [] }
        );
    });

    it('wraps a null err in a single-element array', () => {
        assert.deepEqual(
            prepareValidationResponse(null),
            { type: 'ValidationError', message: [null] }
        );
    });

    it('wraps an undefined err in a single-element array', () => {
        assert.deepEqual(
            prepareValidationResponse(undefined),
            { type: 'ValidationError', message: [undefined] }
        );
    });

    it('uses a provided custom type', () => {
        assert.equal(prepareValidationResponse({ errors: ['e'] }, 'CustomError').type, 'CustomError');
    });

    it('defaults the type to ValidationError when omitted', () => {
        assert.equal(prepareValidationResponse({ errors: ['e'] }).type, 'ValidationError');
    });
});

describe('@unit validate middleware', () => {
    it('calls next() and leaves status untouched when the schema resolves', async () => {
        let nextCalled = false;
        const res = buildRes();
        const mw = validate({ validate: async () => undefined });
        await mw({ body: {}, query: {}, params: {} }, res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(res.statusCode, null);
    });

    it('forwards body/query/params with abortEarly false to the schema', async () => {
        let received;
        let opts;
        const mw = validate({
            validate: async (data, o) => {
                received = data;
                opts = o;
            },
        });
        await mw({ body: { a: 1 }, query: { b: 2 }, params: { c: 3 } }, buildRes(), () => {});
        assert.deepEqual(received, { body: { a: 1 }, query: { b: 2 }, params: { c: 3 } });
        assert.equal(opts.abortEarly, false);
    });

    it('responds 422 with the prepared body and skips next() on failure', async () => {
        let nextCalled = false;
        const res = buildRes();
        const err = { name: 'MyError', errors: ['bad'] };
        const mw = validate({
            validate: async () => {
                throw err;
            },
        });
        await mw({ body: {}, query: {}, params: {} }, res, () => {
            nextCalled = true;
        });
        assert.equal(res.statusCode, 422);
        assert.deepEqual(res.payload, { type: 'MyError', message: ['bad'] });
        assert.equal(nextCalled, false);
    });

    it('uses ValidationError as the type when the thrown error has no name', async () => {
        const res = buildRes();
        const mw = validate({
            validate: async () => {
                throw { errors: ['oops'] };
            },
        });
        await mw({ body: {}, query: {}, params: {} }, res, () => {});
        assert.equal(res.payload.type, 'ValidationError');
        assert.deepEqual(res.payload.message, ['oops']);
    });

    it('propagates real yup error messages through to the 422 payload', async () => {
        const schema = yup.object({
            body: yup.object({ name: yup.string().required('name required') }),
        });
        const res = buildRes();
        await mw422(validate(schema), res);
        assert.equal(res.statusCode, 422);
        assert.ok(res.payload.message.includes('name required'));
        assert.equal(res.payload.type, 'ValidationError');
    });
});

async function mw422(handler, res) {
    await handler({ body: {}, query: {}, params: {} }, res, () => {});
}

describe('@unit pageHeader definition', () => {
    it('is a non-null object', () => {
        assert.equal(typeof pageHeader, 'object');
        assert.notEqual(pageHeader, null);
    });

    it('declares exactly the X-Total-Count header', () => {
        assert.deepEqual(Object.keys(pageHeader), ['X-Total-Count']);
    });

    it('types X-Total-Count as an integer schema', () => {
        assert.equal(pageHeader['X-Total-Count'].schema.type, 'integer');
    });

    it('describes X-Total-Count for the collection total', () => {
        assert.equal(pageHeader['X-Total-Count'].description, 'Total items in the collection.');
    });
});

describe('@unit fieldsValidation re-exported through the index barrel', () => {
    it('exposes the same default fields object referenced from the barrel', () => {
        assert.equal(typeof fieldsValidation, 'object');
        assert.ok(fieldsValidation.contractId);
    });

    it('contractId accepts a string and rejects undefined', () => {
        assert.equal(fieldsValidation.contractId.isValidSync('0.0.1'), true);
        assert.equal(fieldsValidation.contractId.isValidSync(undefined), false);
    });

    it('oppositeTokenSerials accepts null and an array of numbers', () => {
        assert.equal(fieldsValidation.oppositeTokenSerials.isValidSync(null), true);
        assert.equal(fieldsValidation.oppositeTokenSerials.isValidSync([1, 2]), true);
        assert.equal(fieldsValidation.oppositeTokenSerials.isValidSync(undefined), true);
    });
});

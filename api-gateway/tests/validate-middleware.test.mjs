import assert from 'node:assert/strict';
import * as yup from 'yup';
import validate from '../dist/middlewares/validation/index.js';

function buildReq({ body = {}, query = {}, params = {} } = {}) {
    return { body, query, params };
}

function buildRes() {
    const res = {
        statusCode: null,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        send(payload) {
            this.payload = payload;
            return this;
        },
    };
    return res;
}

describe('validate middleware', () => {
    const schema = yup.object({
        body: yup.object({
            name: yup.string().required('The name field is required'),
        }),
    });

    it('calls next() when the schema passes', async () => {
        const handler = validate(schema);
        let nextCalled = false;
        const res = buildRes();
        await handler(buildReq({ body: { name: 'ok' } }), res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, true);
        assert.equal(res.statusCode, null);
    });

    it('responds 422 and does not call next() when the schema fails', async () => {
        const handler = validate(schema);
        let nextCalled = false;
        const res = buildRes();
        await handler(buildReq({ body: {} }), res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 422);
    });

    it('places yup error messages on the 422 response message array', async () => {
        const handler = validate(schema);
        const res = buildRes();
        await handler(buildReq({ body: {} }), res, () => {});
        assert.ok(Array.isArray(res.payload.message));
        assert.ok(res.payload.message.includes('The name field is required'));
    });

    it('uses the yup error name (ValidationError) as the response type', async () => {
        const handler = validate(schema);
        const res = buildRes();
        await handler(buildReq({ body: {} }), res, () => {});
        assert.equal(res.payload.type, 'ValidationError');
    });

    it('validates body, query, and params together', async () => {
        const combined = yup.object({
            query: yup.object({ page: yup.string().required('page required') }),
        });
        const handler = validate(combined);
        const res = buildRes();
        let nextCalled = false;
        await handler(buildReq({ query: {} }), res, () => {
            nextCalled = true;
        });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 422);
        assert.ok(res.payload.message.includes('page required'));
    });
});

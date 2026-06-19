import assert from 'node:assert/strict';
import { of, lastValueFrom } from 'rxjs';
import { AnyFilesInterceptor } from '../../../dist/helpers/interceptors/multipart.js';

function buildContext(req) {
    return { switchToHttp: () => ({ getRequest: () => req }) };
}

function buildRequest(overrides = {}) {
    return {
        isMultipart: () => true,
        parts: overrides.parts ?? (async function* () {}),
        ...overrides,
    };
}

async function* partsFrom(items) {
    for (const item of items) {
        yield item;
    }
}

function filePart(overrides = {}) {
    return {
        type: 'file',
        fieldname: 'document',
        filename: 'doc.pdf',
        mimetype: 'application/pdf',
        encoding: '7bit',
        toBuffer: async () => Buffer.from('hello'),
        ...overrides,
    };
}

function fieldPart(fieldname, value) {
    return { type: 'field', fieldname, value };
}

describe('AnyFilesInterceptor', () => {
    it('returns a NestJS mixin class (constructible)', () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        assert.equal(typeof instance.intercept, 'function');
    });

    it('throws BAD_REQUEST 400 when the request is not multipart', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const req = buildRequest({ isMultipart: () => false });
        const next = { handle: () => of('downstream') };
        await assert.rejects(
            () => instance.intercept(buildContext(req), next),
            (err) => {
                assert.equal(err.getStatus(), 400);
                assert.equal(err.message, 'The request should be a form-data');
                return true;
            }
        );
    });

    it('collects files onto req.storedFiles and calls next.handle()', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([filePart()]) });
        let handled = false;
        const next = { handle: () => { handled = true; return of('ok'); } };
        const result = await lastValueFrom(await instance.intercept(buildContext(req), next));
        assert.equal(result, 'ok');
        assert.equal(handled, true);
        assert.equal(req.storedFiles.length, 1);
        assert.equal(req.storedFiles[0].fieldname, 'document');
    });

    it('puts non-file field parts into req.body', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const req = buildRequest({
            parts: () => partsFrom([fieldPart('name', 'alice'), fieldPart('age', '30')]),
        });
        const next = { handle: () => of('ok') };
        await lastValueFrom(await instance.intercept(buildContext(req), next));
        assert.deepEqual(req.body, { name: 'alice', age: '30' });
    });

    it('does not set storedFiles when there are no files', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([fieldPart('x', '1')]) });
        const next = { handle: () => of('ok') };
        await lastValueFrom(await instance.intercept(buildContext(req), next));
        assert.equal('storedFiles' in req, false);
    });

    it('skips files whose getFileFromPart returns null (empty buffer)', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const req = buildRequest({
            parts: () => partsFrom([filePart({ toBuffer: async () => Buffer.alloc(0) })]),
        });
        const next = { handle: () => of('ok') };
        await lastValueFrom(await instance.intercept(buildContext(req), next));
        assert.equal('storedFiles' in req, false);
    });

    it('throws UNPROCESSABLE_ENTITY 422 for a field not in allowedFields', async () => {
        const Cls = AnyFilesInterceptor({ allowedFields: ['document'] });
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([filePart({ fieldname: 'evil' })]) });
        const next = { handle: () => of('ok') };
        await assert.rejects(
            () => instance.intercept(buildContext(req), next),
            (err) => {
                assert.equal(err.getStatus(), 422);
                assert.match(err.message, /allowed keys: document/);
                return true;
            }
        );
    });

    it('accepts a field present in allowedFields', async () => {
        const Cls = AnyFilesInterceptor({ allowedFields: ['document'] });
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([filePart()]) });
        const next = { handle: () => of('ok') };
        const result = await lastValueFrom(await instance.intercept(buildContext(req), next));
        assert.equal(result, 'ok');
        assert.equal(req.storedFiles.length, 1);
    });

    it('throws UNPROCESSABLE_ENTITY 422 when a requiredField file is missing', async () => {
        const Cls = AnyFilesInterceptor({ requiredFields: ['avatar'] });
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([filePart({ fieldname: 'document' })]) });
        const next = { handle: () => of('ok') };
        await assert.rejects(
            () => instance.intercept(buildContext(req), next),
            (err) => {
                assert.equal(err.getStatus(), 422);
                assert.equal(err.message, 'There are no files to upload.');
                return true;
            }
        );
    });

    it('passes when all requiredFields are present', async () => {
        const Cls = AnyFilesInterceptor({ requiredFields: ['document'] });
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([filePart({ fieldname: 'document' })]) });
        const next = { handle: () => of('ok') };
        const result = await lastValueFrom(await instance.intercept(buildContext(req), next));
        assert.equal(result, 'ok');
    });

    it('wraps an error thrown during part iteration into an HttpException (preserving status)', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const boom = Object.assign(new Error('disk full'), { status: 507 });
        const req = buildRequest({
            parts: () => (async function* () { throw boom; })(),
        });
        const next = { handle: () => of('ok') };
        await assert.rejects(
            () => instance.intercept(buildContext(req), next),
            (err) => {
                assert.equal(err.getStatus(), 507);
                assert.equal(err.message, 'disk full');
                return true;
            }
        );
    });

    it('defaults wrapped-error status to BAD_REQUEST 400 when none provided', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const req = buildRequest({
            parts: () => (async function* () { throw new Error('parse fail'); })(),
        });
        const next = { handle: () => of('ok') };
        await assert.rejects(
            () => instance.intercept(buildContext(req), next),
            (err) => {
                assert.equal(err.getStatus(), 400);
                assert.equal(err.message, 'parse fail');
                return true;
            }
        );
    });

    it('an allowedFields violation is caught and re-wrapped, surfacing status 422 via the catch', async () => {
        const Cls = AnyFilesInterceptor({ allowedFields: ['document'] });
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([filePart({ fieldname: 'bad' })]) });
        const next = { handle: () => of('ok') };
        await assert.rejects(
            () => instance.intercept(buildContext(req), next),
            (err) => {
                assert.equal(err.getStatus(), 422);
                return true;
            }
        );
    });

    it('sets req.body even when only files (no field parts) are present', async () => {
        const Cls = AnyFilesInterceptor();
        const instance = new Cls();
        const req = buildRequest({ parts: () => partsFrom([filePart()]) });
        const next = { handle: () => of('ok') };
        await lastValueFrom(await instance.intercept(buildContext(req), next));
        assert.deepEqual(req.body, {});
    });
});

import assert from 'node:assert/strict';
import { of, lastValueFrom } from 'rxjs';
import { AnyFilesInterceptor } from '../../dist/helpers/interceptors/multipart.js';
import { getFileFromPart } from '../../dist/helpers/interceptors/utils/multipart.js';
import { MultipartOptions } from '../../dist/helpers/interceptors/types/multipart.js';
import { PerformanceInterceptor } from '../../dist/helpers/interceptors/performance.js';

const makeContext = (req) => ({
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
    getHandler: () => 'h',
    getClass: () => 'c',
});

const next = (val) => ({ handle: () => of(val) });

const filePart = (overrides = {}) => ({
    type: 'file',
    filename: 'doc.pdf',
    mimetype: 'application/pdf',
    fieldname: 'document',
    encoding: '7bit',
    toBuffer: async () => Buffer.from('hello'),
    ...overrides,
});

const valuePart = (fieldname, value) => ({
    type: 'field',
    fieldname,
    value,
});

const multipartReq = (parts, overrides = {}) => ({
    isMultipart: () => true,
    parts: async function* () {
        for (const p of parts) {
            yield p;
        }
    },
    ...overrides,
});

const instantiate = (options) => {
    const Mixin = AnyFilesInterceptor(options);
    return new Mixin();
};

describe('@unit AnyFilesInterceptor.intercept', () => {
    it('throws BAD_REQUEST when the request is not multipart', async () => {
        const interceptor = instantiate();
        const ctx = makeContext({ isMultipart: () => false });
        await assert.rejects(() => interceptor.intercept(ctx, next('ok')), (err) => {
            assert.equal(err.message, 'The request should be a form-data');
            assert.equal(err.getStatus(), 400);
            return true;
        });
    });

    it('passes through to next.handle and emits the downstream value', async () => {
        const interceptor = instantiate();
        const req = multipartReq([]);
        const obs = await interceptor.intercept(makeContext(req), next('downstream'));
        assert.equal(await lastValueFrom(obs), 'downstream');
    });

    it('maps a single file part onto req.storedFiles', async () => {
        const interceptor = instantiate();
        const req = multipartReq([filePart()]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.equal(req.storedFiles.length, 1);
        assert.equal(req.storedFiles[0].fieldname, 'document');
        assert.equal(req.storedFiles[0].originalname, 'document');
        assert.equal(req.storedFiles[0].size, 5);
    });

    it('collects multiple file parts in order', async () => {
        const interceptor = instantiate();
        const req = multipartReq([
            filePart({ fieldname: 'a', toBuffer: async () => Buffer.from('aa') }),
            filePart({ fieldname: 'b', toBuffer: async () => Buffer.from('bbb') }),
        ]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.equal(req.storedFiles.length, 2);
        assert.equal(req.storedFiles[0].fieldname, 'a');
        assert.equal(req.storedFiles[1].fieldname, 'b');
        assert.equal(req.storedFiles[0].size, 2);
        assert.equal(req.storedFiles[1].size, 3);
    });

    it('does not set storedFiles when there are no files', async () => {
        const interceptor = instantiate();
        const req = multipartReq([valuePart('name', 'alice')]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.equal('storedFiles' in req, false);
    });

    it('maps non-file parts onto req.body keyed by fieldname', async () => {
        const interceptor = instantiate();
        const req = multipartReq([valuePart('name', 'alice'), valuePart('age', '30')]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.deepEqual(req.body, { name: 'alice', age: '30' });
    });

    it('always replaces req.body even when only files are present', async () => {
        const interceptor = instantiate();
        const req = multipartReq([filePart()], { body: { stale: true } });
        await interceptor.intercept(makeContext(req), next('x'));
        assert.deepEqual(req.body, {});
    });

    it('handles a mix of file and value parts', async () => {
        const interceptor = instantiate();
        const req = multipartReq([
            valuePart('title', 't'),
            filePart({ fieldname: 'f1' }),
            valuePart('desc', 'd'),
            filePart({ fieldname: 'f2' }),
        ]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.deepEqual(req.body, { title: 't', desc: 'd' });
        assert.equal(req.storedFiles.length, 2);
    });

    it('skips a file part whose buffer is empty (getFileFromPart returns null)', async () => {
        const interceptor = instantiate();
        const req = multipartReq([
            filePart({ fieldname: 'empty', toBuffer: async () => Buffer.alloc(0) }),
            filePart({ fieldname: 'real' }),
        ]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.equal(req.storedFiles.length, 1);
        assert.equal(req.storedFiles[0].fieldname, 'real');
    });

    it('does not set storedFiles when the only file part yields null', async () => {
        const interceptor = instantiate();
        const req = multipartReq([filePart({ toBuffer: async () => Buffer.alloc(0) })]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.equal('storedFiles' in req, false);
        assert.deepEqual(req.body, {});
    });

    it('a later value part with same name overwrites earlier in body', async () => {
        const interceptor = instantiate();
        const req = multipartReq([valuePart('k', 'first'), valuePart('k', 'second')]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.equal(req.body.k, 'second');
    });

    it('stores undefined value when a field part has no value', async () => {
        const interceptor = instantiate();
        const req = multipartReq([valuePart('k', undefined)]);
        await interceptor.intercept(makeContext(req), next('x'));
        assert.equal('k' in req.body, true);
        assert.equal(req.body.k, undefined);
    });

    describe('allowedFields option', () => {
        it('rejects with UNPROCESSABLE_ENTITY when a fieldname is not allowed', async () => {
            const interceptor = instantiate({ allowedFields: ['document'] });
            const req = multipartReq([filePart({ fieldname: 'evil' })]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (err) => {
                assert.equal(err.getStatus(), 422);
                assert.match(err.message, /allowed keys: document/);
                return true;
            });
        });

        it('lists all allowed keys joined by comma-space in the message', async () => {
            const interceptor = instantiate({ allowedFields: ['a', 'b', 'c'] });
            const req = multipartReq([valuePart('z', '1')]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (err) => {
                assert.match(err.message, /allowed keys: a, b, c/);
                return true;
            });
        });

        it('allows parts whose fieldname is in allowedFields', async () => {
            const interceptor = instantiate({ allowedFields: ['document'] });
            const req = multipartReq([filePart()]);
            await interceptor.intercept(makeContext(req), next('x'));
            assert.equal(req.storedFiles.length, 1);
        });

        it('applies the allowed check to value parts too', async () => {
            const interceptor = instantiate({ allowedFields: ['ok'] });
            const req = multipartReq([valuePart('notok', '1')]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (err) => {
                assert.equal(err.getStatus(), 422);
                return true;
            });
        });

        it('an empty allowedFields array does not restrict any field', async () => {
            const interceptor = instantiate({ allowedFields: [] });
            const req = multipartReq([filePart({ fieldname: 'anything' })]);
            await interceptor.intercept(makeContext(req), next('x'));
            assert.equal(req.storedFiles.length, 1);
        });

        it('rejection from allowedFields wraps to status 422 not the catch BAD_REQUEST', async () => {
            const interceptor = instantiate({ allowedFields: ['x'] });
            const req = multipartReq([valuePart('y', '1')]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (err) => {
                assert.equal(err.getStatus(), 422);
                return true;
            });
        });
    });

    describe('requiredFields option', () => {
        it('rejects with UNPROCESSABLE_ENTITY when a required field is missing', async () => {
            const interceptor = instantiate({ requiredFields: ['document'] });
            const req = multipartReq([]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (err) => {
                assert.equal(err.getStatus(), 422);
                assert.equal(err.message, 'There are no files to upload.');
                return true;
            });
        });

        it('passes when all required file fields are present', async () => {
            const interceptor = instantiate({ requiredFields: ['document'] });
            const req = multipartReq([filePart()]);
            const obs = await interceptor.intercept(makeContext(req), next('done'));
            assert.equal(await lastValueFrom(obs), 'done');
        });

        it('rejects when a required field only arrives as a value part not a file', async () => {
            const interceptor = instantiate({ requiredFields: ['document'] });
            const req = multipartReq([valuePart('document', 'text')]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (err) => {
                assert.equal(err.getStatus(), 422);
                return true;
            });
        });

        it('requires every field in the list', async () => {
            const interceptor = instantiate({ requiredFields: ['a', 'b'] });
            const req = multipartReq([filePart({ fieldname: 'a' })]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (err) => {
                assert.equal(err.getStatus(), 422);
                return true;
            });
        });

        it('passes when all of several required fields are present', async () => {
            const interceptor = instantiate({ requiredFields: ['a', 'b'] });
            const req = multipartReq([filePart({ fieldname: 'a' }), filePart({ fieldname: 'b' })]);
            await interceptor.intercept(makeContext(req), next('x'));
            assert.equal(req.storedFiles.length, 2);
        });

        it('an empty requiredFields array imposes no requirement', async () => {
            const interceptor = instantiate({ requiredFields: [] });
            const req = multipartReq([]);
            const obs = await interceptor.intercept(makeContext(req), next('y'));
            assert.equal(await lastValueFrom(obs), 'y');
        });
    });

    describe('error handling around req.parts()', () => {
        it('wraps a thrown error from the parts iterator into HttpException with its status', async () => {
            const interceptor = instantiate();
            const err = new Error('boom');
            err.status = 418;
            const req = {
                isMultipart: () => true,
                parts: async function* () {
                    throw err;
                },
            };
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (e) => {
                assert.equal(e.message, 'boom');
                assert.equal(e.getStatus(), 418);
                return true;
            });
        });

        it('defaults to BAD_REQUEST when the thrown error has no status', async () => {
            const interceptor = instantiate();
            const req = {
                isMultipart: () => true,
                parts: async function* () {
                    throw new Error('no status');
                },
            };
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (e) => {
                assert.equal(e.message, 'no status');
                assert.equal(e.getStatus(), 400);
                return true;
            });
        });

        it('wraps an error thrown by part.toBuffer', async () => {
            const interceptor = instantiate();
            const req = multipartReq([filePart({ toBuffer: async () => { throw new Error('read fail'); } })]);
            await assert.rejects(() => interceptor.intercept(makeContext(req), next('x')), (e) => {
                assert.equal(e.message, 'read fail');
                assert.equal(e.getStatus(), 400);
                return true;
            });
        });
    });

    it('returns the same observable instance produced by next.handle', async () => {
        const interceptor = instantiate();
        const req = multipartReq([]);
        const handle = of('once');
        const obs = await interceptor.intercept(makeContext(req), { handle: () => handle });
        assert.equal(obs, handle);
    });
});

describe('@unit getFileFromPart', () => {
    it('returns the canonical MultipartFile shape', async () => {
        const out = await getFileFromPart(filePart());
        assert.deepEqual(out, {
            buffer: Buffer.from('hello'),
            size: 5,
            filename: 'doc.pdf',
            mimetype: 'application/pdf',
            fieldname: 'document',
            encoding: '7bit',
            originalname: 'document',
        });
    });

    it('returns null when size is 0', async () => {
        const out = await getFileFromPart(filePart({ toBuffer: async () => Buffer.alloc(0) }));
        assert.equal(out, null);
    });

    it('returns null when fieldname is missing', async () => {
        const out = await getFileFromPart(filePart({ fieldname: undefined }));
        assert.equal(out, null);
    });

    it('returns null when fieldname is empty string', async () => {
        const out = await getFileFromPart(filePart({ fieldname: '' }));
        assert.equal(out, null);
    });

    it('uses byteLength of the buffer as size', async () => {
        const out = await getFileFromPart(filePart({ toBuffer: async () => Buffer.alloc(2048) }));
        assert.equal(out.size, 2048);
    });
});

describe('@unit MultipartOptions', () => {
    it('assigns all four constructor args to fields', () => {
        const opts = new MultipartOptions(100, 'pdf', ['a'], ['b']);
        assert.equal(opts.maxFileSize, 100);
        assert.equal(opts.fileType, 'pdf');
        assert.deepEqual(opts.allowedFields, ['a']);
        assert.deepEqual(opts.requiredFields, ['b']);
    });

    it('leaves fields undefined when constructed with no args', () => {
        const opts = new MultipartOptions();
        assert.equal(opts.maxFileSize, undefined);
        assert.equal(opts.fileType, undefined);
        assert.equal(opts.allowedFields, undefined);
        assert.equal(opts.requiredFields, undefined);
    });
});

describe('@unit PerformanceInterceptor.intercept', () => {
    const withCapturedLog = async (fn) => {
        const original = console.log;
        const logs = [];
        console.log = (...args) => logs.push(args.join(' '));
        try {
            await fn(logs);
        } finally {
            console.log = original;
        }
    };

    it('passes the downstream value through unchanged', async () => {
        await withCapturedLog(async () => {
            const interceptor = new PerformanceInterceptor();
            const ctx = makeContext({ url: '/api/v1/x' });
            const obs = interceptor.intercept(ctx, next('payload'));
            assert.equal(await lastValueFrom(obs), 'payload');
        });
    });

    it('logs an execution time line including the route url', async () => {
        await withCapturedLog(async (logs) => {
            const interceptor = new PerformanceInterceptor();
            const ctx = makeContext({ url: '/api/v1/route' });
            await lastValueFrom(interceptor.intercept(ctx, next('v')));
            assert.equal(logs.length, 1);
            assert.match(logs[0], /^Execution time for \/api\/v1\/route: \d+\.\d{2}ms$/);
        });
    });

    it('does not log until the observable is subscribed', async () => {
        await withCapturedLog(async (logs) => {
            const interceptor = new PerformanceInterceptor();
            const ctx = makeContext({ url: '/lazy' });
            interceptor.intercept(ctx, next('v'));
            assert.equal(logs.length, 0);
        });
    });

    it('logs undefined route when the request has no url', async () => {
        await withCapturedLog(async (logs) => {
            const interceptor = new PerformanceInterceptor();
            const ctx = makeContext({});
            await lastValueFrom(interceptor.intercept(ctx, next('v')));
            assert.match(logs[0], /^Execution time for undefined: /);
        });
    });

    it('tolerates a null request via optional chaining on url', async () => {
        await withCapturedLog(async (logs) => {
            const interceptor = new PerformanceInterceptor();
            const ctx = { switchToHttp: () => ({ getRequest: () => null }) };
            await lastValueFrom(interceptor.intercept(ctx, next('v')));
            assert.match(logs[0], /^Execution time for undefined: /);
        });
    });

    it('formats the execution time with exactly two decimals', async () => {
        await withCapturedLog(async (logs) => {
            const interceptor = new PerformanceInterceptor();
            const ctx = makeContext({ url: '/t' });
            await lastValueFrom(interceptor.intercept(ctx, next('v')));
            const ms = logs[0].match(/: (\d+\.\d+)ms$/);
            assert.ok(ms);
            assert.equal(ms[1].split('.')[1].length, 2);
        });
    });

    it('emits exactly one log per subscription', async () => {
        await withCapturedLog(async (logs) => {
            const interceptor = new PerformanceInterceptor();
            const ctx = makeContext({ url: '/once' });
            const obs = interceptor.intercept(ctx, next('v'));
            await lastValueFrom(obs);
            assert.equal(logs.length, 1);
        });
    });
});

import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { UploadedFiles } from '../../../dist/helpers/decorators/file.js';

const extractFactory = (paramDecorator) => {
    class Probe { handler(arg) { return arg; } }
    paramDecorator()(Probe.prototype, 'handler', 0);
    const meta = Reflect.getOwnMetadata(ROUTE_ARGS_METADATA, Probe, 'handler');
    const key = Object.keys(meta)[0];
    return meta[key].factory;
};

const ctxWith = (request) => ({ switchToHttp: () => ({ getRequest: () => request }) });

describe('UploadedFiles param decorator factory', () => {
    const factory = extractFactory(UploadedFiles);

    it('returns req.storedFiles from the http context', async () => {
        const files = [{ filename: 'a.csv' }, { filename: 'b.csv' }];
        assert.deepEqual(await factory(undefined, ctxWith({ storedFiles: files })), files);
    });

    it('returns undefined when no files were stored', async () => {
        assert.equal(await factory(undefined, ctxWith({})), undefined);
    });

    it('returns null when storedFiles is explicitly null', async () => {
        assert.equal(await factory(undefined, ctxWith({ storedFiles: null })), null);
    });

    it('resolves a promise (factory is async)', () => {
        const result = factory(undefined, ctxWith({ storedFiles: [] }));
        assert.ok(typeof result.then === 'function');
    });

    it('returns an empty array unchanged', async () => {
        const empty = [];
        assert.equal(await factory(undefined, ctxWith({ storedFiles: empty })), empty);
    });
});

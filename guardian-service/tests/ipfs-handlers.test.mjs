import assert from 'node:assert/strict';
import { MessageAPI } from '@guardian/interfaces';
import { ipfsAPI } from '../dist/api/ipfs.service.js';
import { register, callHandler, ok, common, DatabaseServer, stub, stubProto, silentLogger, restoreStubs } from './_handler-harness.mjs';

const { IPFS } = common;

describe('ipfs.service handlers', () => {
    let handlers;

    beforeEach(async () => {
        stub(IPFS, 'getFile', async () => Buffer.from('hello'));
        handlers = await register(ipfsAPI, silentLogger());
    });

    afterEach(() => restoreStubs());

    describe('GET_FILE_DRY_RUN_STORAGE', () => {
        it('returns the stored file', async () => {
            stubProto(DatabaseServer, 'findOne', async () => ({ file: Buffer.from('content') }));
            const r = await callHandler(handlers, MessageAPI.GET_FILE_DRY_RUN_STORAGE, { cid: 'id', responseType: 'raw' });
            assert.ok(ok(r));
        });
        it('returns an error envelope when cid missing', async () => {
            const r = await callHandler(handlers, MessageAPI.GET_FILE_DRY_RUN_STORAGE, { responseType: 'raw' });
            assert.match(r.body.error, /Invalid cid/);
        });
        it('reports not found instead of throwing when the cid has no dry-run file', async () => {
            stubProto(DatabaseServer, 'findOne', async () => null);
            const r = await callHandler(handlers, MessageAPI.GET_FILE_DRY_RUN_STORAGE, { cid: 'not-an-object-id', responseType: 'raw' });
            assert.ok(ok(r));
            assert.match(r.body.error, /File is not found/);
        });
        it('reports not found when the record exists but carries no file', async () => {
            stubProto(DatabaseServer, 'findOne', async () => ({ file: undefined }));
            const r = await callHandler(handlers, MessageAPI.GET_FILE_DRY_RUN_STORAGE, { cid: 'id', responseType: 'raw' });
            assert.ok(ok(r));
            assert.match(r.body.error, /File is not found/);
        });
    });
});

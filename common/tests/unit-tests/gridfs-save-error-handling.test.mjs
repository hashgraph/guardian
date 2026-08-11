import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { ObjectId } from 'mongodb';
// Load the package entry first so the module graph initializes in the right order.
import '../../dist/index.js';
import { DataBaseHelper } from '../../dist/helpers/db-helper.js';

/**
 * Regression tests for silent GridFS write loss.
 *
 * saveFile / saveFileWithId mint the file _id up front and used to resolve on
 * `end()` regardless of the write outcome, with NO `on('error')` handler - so an
 * async GridFS write error would hang the promise (end callback never fires) or
 * leave a phantom id -> later FileNotFound. The fix must:
 *   - REJECT (not hang) when the upload stream emits 'error'
 *   - REJECT on null/undefined content
 *   - resolve with the id only after a successful finish
 */

// A fake GridFS upload stream. In 'ok' mode the end callback fires (finish);
// in 'error' mode it emits 'error' and never calls the callback (mirrors the
// real failure that used to hang the un-fixed code).
class FakeUploadStream extends EventEmitter {
    constructor(id, mode) {
        super();
        this.id = id;
        this._mode = mode;
        this.written = [];
    }
    write(chunk) { this.written.push(chunk); return true; }
    end(...args) {
        const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
        setImmediate(() => {
            if (this._mode === 'error') {
                this.emit('error', new Error('gridfs write failed'));
            } else if (cb) {
                cb();
            }
        });
    }
}

function fakeBucket(mode) {
    return {
        openUploadStream: (_name) => new FakeUploadStream(new ObjectId(), mode),
        openUploadStreamWithId: (id, _name) => new FakeUploadStream(id, mode),
    };
}

describe('DataBaseHelper GridFS write error handling', () => {
    let saved;
    beforeEach(() => { saved = DataBaseHelper.gridFS; });
    afterEach(() => { DataBaseHelper.gridFS = saved; });

    describe('saveFile', () => {
        it('resolves with the minted file id on a successful finish', async () => {
            DataBaseHelper.gridFS = fakeBucket('ok');
            const id = await DataBaseHelper.saveFile('uuid-1', Buffer.from('hello'));
            assert.ok(id instanceof ObjectId, 'resolves with an ObjectId');
        });

        it('REJECTS (does not hang) when the upload stream emits an error', async () => {
            DataBaseHelper.gridFS = fakeBucket('error');
            await assert.rejects(
                DataBaseHelper.saveFile('uuid-2', Buffer.from('hello')),
                /gridfs write failed/
            );
        });

        it('rejects on null/undefined content instead of writing a phantom file', async () => {
            DataBaseHelper.gridFS = fakeBucket('ok');
            await assert.rejects(DataBaseHelper.saveFile('uuid-3', null), /null\/undefined/);
            await assert.rejects(DataBaseHelper.saveFile('uuid-4', undefined), /null\/undefined/);
        });

        it('allows an empty buffer (valid 0-length file, not null)', async () => {
            DataBaseHelper.gridFS = fakeBucket('ok');
            const id = await DataBaseHelper.saveFile('uuid-5', Buffer.alloc(0));
            assert.ok(id instanceof ObjectId);
        });
    });

    describe('saveFileWithId', () => {
        it('resolves with the given id on success', async () => {
            DataBaseHelper.gridFS = fakeBucket('ok');
            const id = new ObjectId();
            const out = await DataBaseHelper.saveFileWithId(id, 'file', Buffer.from('x'));
            assert.equal(out.toString(), id.toString());
        });

        it('REJECTS when the upload stream emits an error', async () => {
            DataBaseHelper.gridFS = fakeBucket('error');
            await assert.rejects(
                DataBaseHelper.saveFileWithId(new ObjectId(), 'file', Buffer.from('x')),
                /gridfs write failed/
            );
        });

        it('rejects on null/undefined content', async () => {
            DataBaseHelper.gridFS = fakeBucket('ok');
            await assert.rejects(
                DataBaseHelper.saveFileWithId(new ObjectId(), 'file', null),
                /null\/undefined/
            );
        });
    });

    // Both BaseEntity._createFile and PolicyImportExport._createFile delegate here,
    // so asserting the helper directly covers them too.
    describe('writeToGridFS', () => {
        it('resolves with the id of the stream it was given', async () => {
            const id = new ObjectId();
            const out = await DataBaseHelper.writeToGridFS(
                'payload', 'label', () => new FakeUploadStream(id, 'ok')
            );
            assert.equal(out.toString(), id.toString());
        });

        it('writes the content to the stream', async () => {
            const stream = new FakeUploadStream(new ObjectId(), 'ok');
            await DataBaseHelper.writeToGridFS('payload', 'label', () => stream);
            assert.deepEqual(stream.written, ['payload']);
        });

        it('REJECTS when the upload stream emits an error', async () => {
            await assert.rejects(
                DataBaseHelper.writeToGridFS('payload', 'label', () => new FakeUploadStream(new ObjectId(), 'error')),
                /gridfs write failed/
            );
        });

        it('rejects on null/undefined content and names the label', async () => {
            const open = () => new FakeUploadStream(new ObjectId(), 'ok');
            await assert.rejects(
                DataBaseHelper.writeToGridFS(null, 'policy.zip', open),
                /GridFS write \(policy\.zip\): content is null\/undefined/
            );
            await assert.rejects(DataBaseHelper.writeToGridFS(undefined, 'label', open), /null\/undefined/);
        });

        it('allows empty content (valid 0-length file, not null)', async () => {
            const open = () => new FakeUploadStream(new ObjectId(), 'ok');
            assert.ok(await DataBaseHelper.writeToGridFS('', 'label', open) instanceof ObjectId);
            assert.ok(await DataBaseHelper.writeToGridFS(Buffer.alloc(0), 'label', open) instanceof ObjectId);
        });

        it('rejects instead of throwing when the stream cannot be opened', async () => {
            await assert.rejects(
                DataBaseHelper.writeToGridFS('payload', 'label', () => {
                    throw new Error('gridFS is undefined');
                }),
                /gridFS is undefined/
            );
        });
    });
});

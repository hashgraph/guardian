import assert from 'node:assert/strict';
import { ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper } from '../../../dist/helpers/db-helper.js';

let bucket;
function makeBucket() {
    const calls = [];
    const state = { files: [], download: [], deleteError: null };
    const b = {
        calls,
        state,
        openUploadStream(name) {
            const id = new ObjectId(ObjectId.generate());
            return {
                id,
                write(buf) { calls.push(['write', name, buf]); },
                end(cb) { calls.push(['end', name]); cb(); },
            };
        },
        openUploadStreamWithId(id, name) {
            return {
                end(buf, cb) { calls.push(['endWithId', id, name, buf]); cb(state.endError || undefined); },
            };
        },
        async delete(id) { calls.push(['delete', id]); if (state.deleteError) { throw state.deleteError; } },
        find(id) { calls.push(['find', id]); return { toArray: async () => state.files }; },
        openDownloadStream(id) {
            calls.push(['openDownloadStream', id]);
            const chunks = state.download;
            return (async function* () { for (const c of chunks) { yield c; } })();
        },
    };
    return b;
}
beforeEach(() => { bucket = makeBucket(); DataBaseHelper.gridFS = bucket; });

describe('@unit DataBaseHelper.saveFile', () => {
    it('writes the buffer, ends the stream, and resolves the new file id', async () => {
        const id = await DataBaseHelper.saveFile('uuid-1', Buffer.from('hello'));
        assert.ok(id instanceof ObjectId);
        assert.deepEqual(bucket.calls.map((c) => c[0]), ['write', 'end']);
    });
});

describe('@unit DataBaseHelper.saveFileWithId', () => {
    it('ends the upload stream with the buffer and resolves the supplied id', async () => {
        const id = new ObjectId(ObjectId.generate());
        const out = await DataBaseHelper.saveFileWithId(id, 'f.json', Buffer.from('x'));
        assert.equal(out, id);
        assert.equal(bucket.calls[0][0], 'endWithId');
    });

    it('rejects when the upload stream reports an error', async () => {
        bucket.state.endError = new Error('disk full');
        const id = new ObjectId(ObjectId.generate());
        await assert.rejects(() => DataBaseHelper.saveFileWithId(id, 'f', Buffer.from('x')), /disk full/);
    });
});

describe('@unit DataBaseHelper.overwriteFile', () => {
    it('deletes the existing file then re-saves with the same id', async () => {
        const id = new ObjectId(ObjectId.generate());
        const out = await DataBaseHelper.overwriteFile(id, 'f', Buffer.from('x'));
        assert.equal(out, id);
        assert.equal(bucket.calls[0][0], 'delete');
        assert.ok(bucket.calls.some((c) => c[0] === 'endWithId'));
    });

    it('swallows a delete error and still re-saves', async () => {
        bucket.state.deleteError = new Error('not found');
        const id = new ObjectId(ObjectId.generate());
        const out = await DataBaseHelper.overwriteFile(id, 'f', Buffer.from('x'));
        assert.equal(out, id);
    });
});

describe('@unit DataBaseHelper.deleteFile', () => {
    it('delegates to gridFS.delete', async () => {
        const id = new ObjectId(ObjectId.generate());
        await DataBaseHelper.deleteFile(id);
        assert.deepEqual(bucket.calls[0], ['delete', id]);
    });
});

describe('@unit DataBaseHelper.loadFile', () => {
    it('returns null when no file matches', async () => {
        bucket.state.files = [];
        assert.equal(await DataBaseHelper.loadFile(new ObjectId(ObjectId.generate())), null);
    });

    it('concatenates the download stream chunks into a single buffer', async () => {
        bucket.state.files = [{ _id: new ObjectId(ObjectId.generate()) }];
        bucket.state.download = [Buffer.from('foo'), Buffer.from('bar')];
        const out = await DataBaseHelper.loadFile(new ObjectId(ObjectId.generate()));
        assert.equal(out.toString(), 'foobar');
    });
});

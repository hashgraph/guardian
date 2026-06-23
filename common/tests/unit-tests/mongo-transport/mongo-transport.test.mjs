import assert from 'node:assert/strict';
import { MongoTransport } from '../../../dist/helpers/mongo-transport.js';

function fakeDb(collectionImpl) {
    const calls = { requested: [], inserted: [] };
    const collection = collectionImpl === null ? null : {
        async insertOne(doc) { calls.inserted.push(doc); },
        ...collectionImpl,
    };
    return {
        calls,
        collection(name) { calls.requested.push(name); return collection; },
    };
}

function write(transport, log) {
    return new Promise((resolve) => transport._write(typeof log === 'string' ? log : JSON.stringify(log), 'utf8', resolve));
}

describe('@unit MongoTransport', () => {
    it('resolves the target collection by name at construction', () => {
        const db = fakeDb();
        new MongoTransport({ collectionName: 'logs', client: db });
        assert.deepEqual(db.calls.requested, ['logs']);
    });

    it('is an object-mode Writable stream', () => {
        const t = new MongoTransport({ collectionName: 'logs', client: fakeDb() });
        assert.equal(t.writableObjectMode, true);
    });

    it('inserts the parsed log document', async () => {
        const db = fakeDb();
        const t = new MongoTransport({ collectionName: 'logs', client: db });
        await write(t, { level: 'info', message: 'hi' });
        assert.deepEqual(db.calls.inserted, [{ level: 'info', message: 'hi' }]);
    });

    it('calls back without error on a successful insert', async () => {
        const t = new MongoTransport({ collectionName: 'logs', client: fakeDb() });
        const err = await write(t, { a: 1 });
        assert.equal(err, undefined);
    });

    it('calls back with an error on malformed JSON and does not insert', async () => {
        const db = fakeDb();
        const t = new MongoTransport({ collectionName: 'logs', client: db });
        const err = await write(t, 'not-json{');
        assert.ok(err instanceof Error);
        assert.equal(db.calls.inserted.length, 0);
    });

    it('propagates insertOne failures via the callback', async () => {
        const db = fakeDb({ insertOne: async () => { throw new Error('write concern'); } });
        const t = new MongoTransport({ collectionName: 'logs', client: db });
        const err = await write(t, { a: 1 });
        assert.ok(err instanceof Error);
        assert.match(err.message, /write concern/);
    });

    it('succeeds without inserting when the collection could not be resolved', async () => {
        const db = fakeDb(null);
        const t = new MongoTransport({ collectionName: 'logs', client: db });
        const err = await write(t, { a: 1 });
        assert.equal(err, undefined);
    });
});

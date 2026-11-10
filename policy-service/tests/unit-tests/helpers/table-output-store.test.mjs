import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { IPFS } from '@guardian/common/helpers/ipfs';
import { storeTableOutputFile, deleteTableOutputFiles } from '../../../dist/policy-engine/helpers/table-output-store.js';

const columns = [{ name: 'Year', key: 'year' }, { name: 'CO2', key: 'co2' }];

describe('@unit table output file storage', () => {
    let original;
    let writes;
    let pins;
    let deleted;
    let warnings;
    let ref;

    beforeEach(() => {
        original = { upsert: DatabaseServer.upsertGridFile, remove: DatabaseServer.deleteGridFile, pin: IPFS.addFile, unpin: IPFS.deleteCid };
        writes = [];
        pins = [];
        deleted = [];
        warnings = [];
        ref = { dryRun: null, warn: (message) => warnings.push(message) };
        DatabaseServer.upsertGridFile = async (file) => { writes.push(file); return { fileId: `file-${writes.length}` }; };
        DatabaseServer.deleteGridFile = async (id) => { deleted.push(id); };
        IPFS.addFile = async (buffer, options) => { pins.push({ buffer, options }); return { cid: 'cid-1' }; };
        IPFS.deleteCid = async () => { assert.fail('published content must be retained'); };
    });

    afterEach(() => {
        DatabaseServer.upsertGridFile = original.upsert;
        DatabaseServer.deleteGridFile = original.remove;
        IPFS.addFile = original.pin;
        IPFS.deleteCid = original.unpin;
    });

    it('stores a gzipped CSV and returns the compact published value', async () => {
        const stored = [];
        const value = await storeTableOutputFile(ref, [{ co2: 5, year: 2020 }], columns, 'user-1', stored);
        assert.equal(writes.length, 1);
        assert.equal(writes[0].filename, 'table.csv.gz');
        assert.equal(writes[0].contentType, 'application/gzip');
        assert.equal(gunzipSync(writes[0].buffer).toString(), 'Year,CO2\r\n2020,5');
        assert.deepEqual(pins, [{ buffer: writes[0].buffer, options: { userId: 'user-1', interception: null } }]);
        assert.deepEqual(JSON.parse(value), { type: 'table', fileId: 'file-1', cid: 'cid-1', columnNames: ['Year', 'CO2'], columnKeys: ['year', 'co2'] });
        assert.deepEqual(stored, [{ fileId: 'file-1', cid: 'cid-1' }]);
    });

    it('stores only in GridFS during Dry Run', async () => {
        ref.dryRun = 'dry-run';
        const stored = [];
        const value = await storeTableOutputFile(ref, [], columns, null, stored);
        assert.equal(gunzipSync(writes[0].buffer).toString(), 'Year,CO2');
        assert.equal(pins.length, 0);
        assert.equal(Object.hasOwn(JSON.parse(value), 'cid'), false);
        assert.deepEqual(stored, [{ fileId: 'file-1', cid: null }]);
    });

    it('retains a GridFS write for rollback when pinning fails', async () => {
        IPFS.addFile = async () => { throw new Error('pin failed'); };
        const stored = [];
        await assert.rejects(storeTableOutputFile(ref, [], columns, null, stored), /pin failed/);
        assert.deepEqual(stored, [{ fileId: 'file-1', cid: null }]);
        await deleteTableOutputFiles(ref, stored);
        assert.deepEqual(deleted, ['file-1']);
    });

    it('does not register a file when GridFS rejects the write', async () => {
        DatabaseServer.upsertGridFile = async () => { throw new Error('write failed'); };
        const stored = [];
        await assert.rejects(storeTableOutputFile(ref, [], columns, null, stored), /write failed/);
        assert.deepEqual(stored, []);
        assert.deepEqual(pins, []);
    });

    it('continues rollback after a failed delete and retains published content', async () => {
        DatabaseServer.deleteGridFile = async (id) => { deleted.push(id); if (id === 'bad') throw new Error('unavailable'); };
        await deleteTableOutputFiles(ref, [{ fileId: 'bad', cid: 'cid-a' }, { fileId: 'good', cid: 'cid-b' }]);
        assert.deepEqual(deleted, ['bad', 'good']);
        assert.deepEqual(warnings, ['Failed to delete result table bad: unavailable']);
    });
});

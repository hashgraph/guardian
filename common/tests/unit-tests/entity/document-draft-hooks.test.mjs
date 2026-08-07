import { assert } from 'chai';
import { ObjectId } from '@mikro-orm/mongodb';
import { DocumentDraft } from '../../../dist/entity/index.js';
import { DataBaseHelper } from '../../../dist/helpers/db-helper.js';

const FILE_A = '507f1f77bcf86cd799439011';
const FILE_B = '507f1f77bcf86cd799439012';

function makeBucket() {
    const calls = [];
    return { calls, async delete(id) { calls.push(String(id)); } };
}

describe('@unit DocumentDraft lifecycle hooks', () => {
    let bucket;
    let prevGridFS;
    let prevOrm;
    beforeEach(() => {
        bucket = makeBucket();
        prevGridFS = DataBaseHelper.gridFS;
        prevOrm = DataBaseHelper.orm;
        DataBaseHelper.gridFS = bucket;
        DataBaseHelper._orm = undefined;
    });
    afterEach(() => {
        DataBaseHelper.gridFS = prevGridFS;
        DataBaseHelper._orm = prevOrm;
    });

    it('setDefaults extracts table file ids from a string payload', async () => {
        const e = new DocumentDraft();
        e.data = JSON.stringify({ type: 'table', fileId: FILE_A });
        await e.setDefaults();
        assert.equal(e.tableFileIds.length, 1);
        assert.equal(e.tableFileIds[0].toString(), FILE_A);
    });

    it('setDefaults extracts from an object payload', async () => {
        const e = new DocumentDraft();
        e.data = { type: 'table', fileId: FILE_A };
        await e.setDefaults();
        assert.equal(e.tableFileIds.length, 1);
    });

    it('setDefaults leaves tableFileIds undefined for invalid json / empty string', async () => {
        const e = new DocumentDraft();
        e.data = '{not json';
        await e.setDefaults();
        assert.isUndefined(e.tableFileIds);
        const e2 = new DocumentDraft();
        e2.data = '   ';
        await e2.setDefaults();
        assert.isUndefined(e2.tableFileIds);
    });

    it('updateFiles marks removed ids as _oldTableFileIds', async () => {
        const e = new DocumentDraft();
        e.tableFileIds = [new ObjectId(FILE_A), new ObjectId(FILE_B)];
        e.data = { type: 'table', fileId: FILE_A };
        await e.updateFiles();
        assert.equal(e.tableFileIds.length, 1);
        assert.equal(e._oldTableFileIds.length, 1);
        assert.equal(e._oldTableFileIds[0].toString(), FILE_B);
    });

    it('updateFiles with no parsed data stashes all current ids for deletion', async () => {
        const e = new DocumentDraft();
        e.tableFileIds = [new ObjectId(FILE_A)];
        e.data = '   ';
        await e.updateFiles();
        assert.isUndefined(e.tableFileIds);
        assert.equal(e._oldTableFileIds.length, 1);
    });

    it('postUpdateFiles deletes the stashed old ids via gridFS', async () => {
        const e = new DocumentDraft();
        e._id = new ObjectId(ObjectId.generate());
        e._oldTableFileIds = [new ObjectId(FILE_A), new ObjectId(FILE_B)];
        await e.postUpdateFiles();
        assert.deepEqual(bucket.calls.sort(), [FILE_A, FILE_B].sort());
        assert.isUndefined(e._oldTableFileIds);
    });

    it('deleteFiles removes all current table file ids', async () => {
        const e = new DocumentDraft();
        e._id = new ObjectId(ObjectId.generate());
        e.tableFileIds = [new ObjectId(FILE_A)];
        await e.deleteFiles();
        assert.deepEqual(bucket.calls, [FILE_A]);
    });

    it('deleteCache swallows the ORM-not-initialized error', async () => {
        const e = new DocumentDraft();
        e._id = new ObjectId(ObjectId.generate());
        await e.deleteCache();
        assert.instanceOf(e, DocumentDraft);
    });
});

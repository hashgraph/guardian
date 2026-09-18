import { assert } from 'chai';
import * as DB from '../../../dist/policy-engine/db-restore/index.js';

const { VcCollectionBackup, VcCollectionRestore, DiffActionType } = DB;

class TestVcBackup extends VcCollectionBackup {
    hash(...args) { return this.actionHash(...args); }
    backupData(row) { return this.createBackupData(row); }
    diffData(newRow, oldRow) { return this.createDiffData(newRow, oldRow); }
    check(newRow, oldRow) { return this.checkDocument(newRow, oldRow); }
    need(newRow, oldRow) { return this.needLoadFile(newRow, oldRow); }
    clear(row) { return this.clearFile(row); }
}

class TestVcRestore extends VcCollectionRestore {
    hash(...args) { return this.actionHash(...args); }
    row(data, id) { return this.createRow(data, id); }
}

const makeBackup = () => new TestVcBackup('tenant', 'policy', 'owner', 'message');
const makeRestore = () => new TestVcRestore('tenant', 'policy', 'owner', 'message');

describe('VcCollectionBackup pure methods', () => {
    it('createBackupData keeps only the hashes', () => {
        const out = makeBackup().backupData({ _propHash: 'p', _docHash: 'd', extra: 1 });
        assert.deepEqual(out, { _propHash: 'p', _docHash: 'd' });
    });

    it('checkDocument is false when both hashes are equal', () => {
        assert.isFalse(makeBackup().check({ _docHash: 'a', _propHash: 'b' }, { _docHash: 'a', _propHash: 'b' }));
    });

    it('checkDocument is true when the doc hash differs', () => {
        assert.isTrue(makeBackup().check({ _docHash: 'a', _propHash: 'b' }, { _docHash: 'x', _propHash: 'b' }));
    });

    it('checkDocument is true when the prop hash differs', () => {
        assert.isTrue(makeBackup().check({ _docHash: 'a', _propHash: 'b' }, { _docHash: 'a', _propHash: 'y' }));
    });

    it('needLoadFile is true when there is no old row', () => {
        assert.isTrue(makeBackup().need({ _docHash: 'a' }));
    });

    it('needLoadFile is false when doc hashes match', () => {
        assert.isFalse(makeBackup().need({ _docHash: 'a' }, { _docHash: 'a' }));
    });

    it('needLoadFile is true when doc hashes differ', () => {
        assert.isTrue(makeBackup().need({ _docHash: 'a' }, { _docHash: 'b' }));
    });

    it('createDiffData drops document file ids', async () => {
        const out = await makeBackup().diffData({ a: 1, documentFileId: 'f', encryptedDocumentFileId: 'g' });
        assert.deepEqual(out, { a: 1 });
    });

    it('clearFile removes the document field', async () => {
        const out = await makeBackup().clear({ document: 'x', keep: 1 });
        assert.deepEqual(out, { keep: 1 });
    });

    it('actionHash without a row is a 32-char md5 hex', () => {
        const out = makeBackup().hash('', { type: DiffActionType.Create, id: 'i' });
        assert.match(out, /^[0-9a-f]{32}$/);
    });

    it('actionHash incorporates the row hashes', () => {
        const b = makeBackup();
        const action = { type: DiffActionType.Create, id: 'i' };
        assert.notEqual(b.hash('', action, { _propHash: 'p', _docHash: 'd' }), b.hash('', action));
    });

    it('actionHash is deterministic', () => {
        const b = makeBackup();
        const action = { type: DiffActionType.Create, id: 'i' };
        assert.equal(b.hash('seed', action), b.hash('seed', action));
    });
});

describe('VcCollectionRestore pure methods', () => {
    it('actionHash without a row is a 32-char md5 hex', () => {
        assert.match(makeRestore().hash('', { type: DiffActionType.Create, id: 'i' }), /^[0-9a-f]{32}$/);
    });

    it('createRow parses a base64 document into an object', () => {
        const data = { document: Buffer.from(JSON.stringify({ hello: 'world' })).toString('base64') };
        const row = makeRestore().row(data, 'id');
        assert.deepEqual(row.document, { hello: 'world' });
    });

    it('createRow strips file ids', () => {
        const data = {
            document: Buffer.from('{}').toString('base64'),
            documentFileId: 'f',
            encryptedDocumentFileId: 'g'
        };
        const row = makeRestore().row(data, 'id');
        assert.isUndefined(row.documentFileId);
        assert.isUndefined(row.encryptedDocumentFileId);
    });

    it('createRow decodes the encrypted document base64 string', () => {
        const data = { encryptedDocument: Buffer.from('cipher-text').toString('base64') };
        const row = makeRestore().row(data, 'id');
        assert.equal(row.encryptedDocument, 'cipher-text');
    });

    it('createRow leaves data without documents untouched', () => {
        const row = makeRestore().row({ a: 1 }, 'id');
        assert.deepEqual(row, { a: 1 });
    });
});

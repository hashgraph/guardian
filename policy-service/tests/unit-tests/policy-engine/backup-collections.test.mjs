import { assert } from 'chai';
import { DiffActionType } from '../../../dist/policy-engine/db-restore/index.js';
import {
    ApproveCollectionBackup,
    DidCollectionBackup,
    DocStateCollectionBackup,
    ExternalCollectionBackup,
    MintRequestCollectionBackup,
    MintTransactionCollectionBackup,
    MultiDocCollectionBackup,
    PolicyCommentCollectionBackup,
    PolicyDiscussionCollectionBackup,
    PolicyInvitationsCollectionBackup,
    RoleCollectionBackup,
    StateCollectionBackup,
    TagCollectionBackup,
    TokenCollectionBackup,
    TopicCollectionBackup,
    VpCollectionBackup,
} from '../../../dist/policy-engine/db-restore/collections/index.js';

const expose = (Cls) => {
    class T extends Cls {
        hash(...args) { return this.actionHash(...args); }
        backupData(row) { return this.createBackupData(row); }
        diffData(newRow, oldRow) { return this.createDiffData(newRow, oldRow); }
        check(newRow, oldRow) { return this.checkDocument(newRow, oldRow); }
        need(newRow, oldRow) { return this.needLoadFile(newRow, oldRow); }
        clear(row) { return this.clearFile(row); }
    }
    return new T('tenant', 'policy', 'owner', 'message');
};

const fileBacked = [
    ['VpCollectionBackup', VpCollectionBackup],
    ['ApproveCollectionBackup', ApproveCollectionBackup],
    ['PolicyCommentCollectionBackup', PolicyCommentCollectionBackup],
    ['PolicyDiscussionCollectionBackup', PolicyDiscussionCollectionBackup],
    ['MultiDocCollectionBackup', MultiDocCollectionBackup],
];

const propOnly = [
    ['DidCollectionBackup', DidCollectionBackup],
    ['StateCollectionBackup', StateCollectionBackup],
    ['RoleCollectionBackup', RoleCollectionBackup],
    ['TokenCollectionBackup', TokenCollectionBackup],
    ['TagCollectionBackup', TagCollectionBackup],
    ['DocStateCollectionBackup', DocStateCollectionBackup],
    ['TopicCollectionBackup', TopicCollectionBackup],
    ['ExternalCollectionBackup', ExternalCollectionBackup],
    ['MintRequestCollectionBackup', MintRequestCollectionBackup],
    ['MintTransactionCollectionBackup', MintTransactionCollectionBackup],
    ['PolicyInvitationsCollectionBackup', PolicyInvitationsCollectionBackup],
];

for (const [name, Cls] of [...fileBacked, ...propOnly]) {
    describe(`${name} pure methods`, () => {
        it('createBackupData keeps only the hashes', () => {
            const out = expose(Cls).backupData({ _propHash: 'p', _docHash: 'd', owner: 'o', extra: 1 });
            assert.deepEqual(out, { _propHash: 'p', _docHash: 'd' });
        });

        it('checkDocument is false when both hashes are equal', () => {
            assert.isFalse(expose(Cls).check({ _docHash: 'a', _propHash: 'b' }, { _docHash: 'a', _propHash: 'b' }));
        });

        it('checkDocument is true when the doc hash differs', () => {
            assert.isTrue(expose(Cls).check({ _docHash: 'a', _propHash: 'b' }, { _docHash: 'x', _propHash: 'b' }));
        });

        it('checkDocument is true when the prop hash differs', () => {
            assert.isTrue(expose(Cls).check({ _docHash: 'a', _propHash: 'b' }, { _docHash: 'a', _propHash: 'y' }));
        });

        it('actionHash without a row is a 32-char md5 hex', () => {
            const out = expose(Cls).hash('', { type: DiffActionType.Create, id: 'i' });
            assert.match(out, /^[0-9a-f]{32}$/);
        });

        it('actionHash is deterministic', () => {
            const b = expose(Cls);
            const action = { type: DiffActionType.Update, id: 'i' };
            assert.equal(b.hash('seed', action), b.hash('seed', action));
        });

        it('actionHash incorporates the row hashes', () => {
            const b = expose(Cls);
            const action = { type: DiffActionType.Create, id: 'i' };
            assert.notEqual(b.hash('', action, { _propHash: 'p', _docHash: 'd' }), b.hash('', action));
        });
    });
}

for (const [name, Cls] of fileBacked) {
    describe(`${name} file handling`, () => {
        it('needLoadFile is true when there is no old row', () => {
            assert.isTrue(expose(Cls).need({ _docHash: 'a' }));
        });

        it('needLoadFile is false when doc hashes match', () => {
            assert.isFalse(expose(Cls).need({ _docHash: 'a' }, { _docHash: 'a' }));
        });

        it('needLoadFile is true when doc hashes differ', () => {
            assert.isTrue(expose(Cls).need({ _docHash: 'a' }, { _docHash: 'b' }));
        });

        it('clearFile removes the document field', async () => {
            const out = await expose(Cls).clear({ document: 'x', keep: 1 });
            assert.deepEqual(out, { keep: 1 });
        });
    });
}

for (const [name, Cls] of propOnly) {
    describe(`${name} file handling`, () => {
        it('needLoadFile is false without an old row', () => {
            assert.isFalse(expose(Cls).need({ _docHash: 'a' }));
        });

        it('needLoadFile is false even when doc hashes differ', () => {
            assert.isFalse(expose(Cls).need({ _docHash: 'a' }, { _docHash: 'b' }));
        });

        it('clearFile keeps the row untouched', async () => {
            const out = await expose(Cls).clear({ document: 'x', keep: 1 });
            assert.deepEqual(out, { document: 'x', keep: 1 });
        });
    });
}

describe('createDiffData per collection', () => {
    it('VpCollectionBackup drops documentFileId', async () => {
        const out = await expose(VpCollectionBackup).diffData({ a: 1, documentFileId: 'f' });
        assert.deepEqual(out, { a: 1 });
    });

    it('ApproveCollectionBackup drops documentFileId', async () => {
        const out = await expose(ApproveCollectionBackup).diffData({ a: 1, documentFileId: 'f' });
        assert.deepEqual(out, { a: 1 });
    });

    it('MultiDocCollectionBackup drops documentFileId', async () => {
        const out = await expose(MultiDocCollectionBackup).diffData({ a: 1, documentFileId: 'f' });
        assert.deepEqual(out, { a: 1 });
    });

    it('PolicyCommentCollectionBackup drops both file ids', async () => {
        const out = await expose(PolicyCommentCollectionBackup).diffData({ a: 1, documentFileId: 'f', encryptedDocumentFileId: 'g' });
        assert.deepEqual(out, { a: 1 });
    });

    it('PolicyDiscussionCollectionBackup drops both file ids', async () => {
        const out = await expose(PolicyDiscussionCollectionBackup).diffData({ a: 1, documentFileId: 'f', encryptedDocumentFileId: 'g' });
        assert.deepEqual(out, { a: 1 });
    });

    it('TagCollectionBackup strips db ids and dates', async () => {
        const out = await expose(TagCollectionBackup).diffData({ _id: '1', id: '2', createDate: 'c', updateDate: 'u', a: 1 });
        assert.deepEqual(out, { a: 1 });
    });

    it('DidCollectionBackup keeps file ids in the diff', async () => {
        const out = await expose(DidCollectionBackup).diffData({ a: 1, documentFileId: 'f' });
        assert.deepEqual(out, { a: 1, documentFileId: 'f' });
    });

    it('returns only changed keys when an old row is given', async () => {
        const out = await expose(VpCollectionBackup).diffData({ a: 1, b: 2 }, { a: 1, b: 3 });
        assert.deepEqual(out, { b: 2 });
    });

    it('includes keys removed from the new row as undefined', async () => {
        const out = await expose(TokenCollectionBackup).diffData({ a: 1 }, { a: 1, gone: 5 });
        assert.deepEqual(Object.keys(out), ['gone']);
        assert.isUndefined(out.gone);
    });
});

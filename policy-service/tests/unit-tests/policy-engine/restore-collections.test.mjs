import { assert } from 'chai';
import { DiffActionType } from '../../../dist/policy-engine/db-restore/index.js';
import {
    ApproveCollectionRestore,
    DidCollectionRestore,
    DocStateCollectionRestore,
    ExternalCollectionRestore,
    MintRequestCollectionRestore,
    MintTransactionCollectionRestore,
    MultiDocCollectionRestore,
    PolicyCommentCollectionRestore,
    PolicyDiscussionCollectionRestore,
    PolicyInvitationsCollectionRestore,
    RoleCollectionRestore,
    StateCollectionRestore,
    TagCollectionRestore,
    TokenCollectionRestore,
    TopicCollectionRestore,
    VpCollectionRestore,
} from '../../../dist/policy-engine/db-restore/collections/index.js';

const expose = (Cls) => {
    class T extends Cls {
        hash(...args) { return this.actionHash(...args); }
        row(data, id) { return this.createRow(data, id); }
    }
    return new T('tenant', 'policy', 'owner', 'message');
};

const allRestores = [
    ['VpCollectionRestore', VpCollectionRestore],
    ['ApproveCollectionRestore', ApproveCollectionRestore],
    ['PolicyCommentCollectionRestore', PolicyCommentCollectionRestore],
    ['PolicyDiscussionCollectionRestore', PolicyDiscussionCollectionRestore],
    ['MultiDocCollectionRestore', MultiDocCollectionRestore],
    ['DidCollectionRestore', DidCollectionRestore],
    ['StateCollectionRestore', StateCollectionRestore],
    ['RoleCollectionRestore', RoleCollectionRestore],
    ['TokenCollectionRestore', TokenCollectionRestore],
    ['TagCollectionRestore', TagCollectionRestore],
    ['DocStateCollectionRestore', DocStateCollectionRestore],
    ['TopicCollectionRestore', TopicCollectionRestore],
    ['ExternalCollectionRestore', ExternalCollectionRestore],
    ['MintRequestCollectionRestore', MintRequestCollectionRestore],
    ['MintTransactionCollectionRestore', MintTransactionCollectionRestore],
    ['PolicyInvitationsCollectionRestore', PolicyInvitationsCollectionRestore],
];

const b64 = (value) => Buffer.from(value).toString('base64');

for (const [name, Cls] of allRestores) {
    describe(`${name} actionHash`, () => {
        it('without a row is a 32-char md5 hex', () => {
            const out = expose(Cls).hash('', { type: DiffActionType.Create, id: 'i' });
            assert.match(out, /^[0-9a-f]{32}$/);
        });

        it('is deterministic', () => {
            const r = expose(Cls);
            const action = { type: DiffActionType.Update, id: 'i' };
            assert.equal(r.hash('seed', action), r.hash('seed', action));
        });

        it('incorporates the row hashes', () => {
            const r = expose(Cls);
            const action = { type: DiffActionType.Create, id: 'i' };
            assert.notEqual(r.hash('', action, { _propHash: 'p', _docHash: 'd' }), r.hash('', action));
        });
    });
}

describe('VpCollectionRestore.createRow', () => {
    it('parses a base64 document into JSON', () => {
        const out = expose(VpCollectionRestore).row({ document: b64('{"a":1}') }, 'id');
        assert.deepEqual(out.document, { a: 1 });
    });

    it('drops documentFileId', () => {
        const out = expose(VpCollectionRestore).row({ documentFileId: 'f', x: 1 }, 'id');
        assert.deepEqual(out, { x: 1 });
    });

    it('leaves rows without a document untouched', () => {
        const out = expose(VpCollectionRestore).row({ x: 1 }, 'id');
        assert.deepEqual(out, { x: 1 });
    });
});

describe('ApproveCollectionRestore.createRow', () => {
    it('parses a base64 document into JSON', () => {
        const out = expose(ApproveCollectionRestore).row({ document: b64('{"ok":true}') }, 'id');
        assert.deepEqual(out.document, { ok: true });
    });

    it('drops documentFileId', () => {
        const out = expose(ApproveCollectionRestore).row({ documentFileId: 'f', x: 1 }, 'id');
        assert.deepEqual(out, { x: 1 });
    });
});

describe('MultiDocCollectionRestore.createRow', () => {
    it('parses a base64 document into JSON', () => {
        const out = expose(MultiDocCollectionRestore).row({ document: b64('{"n":2}') }, 'id');
        assert.deepEqual(out.document, { n: 2 });
    });

    it('drops documentFileId', () => {
        const out = expose(MultiDocCollectionRestore).row({ documentFileId: 'f', x: 1 }, 'id');
        assert.deepEqual(out, { x: 1 });
    });
});

describe('PolicyCommentCollectionRestore.createRow', () => {
    it('decodes a base64 encryptedDocument into a string', () => {
        const out = expose(PolicyCommentCollectionRestore).row({ encryptedDocument: b64('secret') }, 'id');
        assert.equal(out.encryptedDocument, 'secret');
    });

    it('drops both file ids', () => {
        const out = expose(PolicyCommentCollectionRestore).row({ documentFileId: 'f', encryptedDocumentFileId: 'g', x: 1 }, 'id');
        assert.deepEqual(out, { x: 1 });
    });
});

describe('PolicyDiscussionCollectionRestore.createRow', () => {
    it('decodes a base64 encryptedDocument into a string', () => {
        const out = expose(PolicyDiscussionCollectionRestore).row({ encryptedDocument: b64('secret') }, 'id');
        assert.equal(out.encryptedDocument, 'secret');
    });

    it('drops both file ids', () => {
        const out = expose(PolicyDiscussionCollectionRestore).row({ documentFileId: 'f', encryptedDocumentFileId: 'g', x: 1 }, 'id');
        assert.deepEqual(out, { x: 1 });
    });
});

describe('MintRequestCollectionRestore.createRow', () => {
    it('marks the row readonly', () => {
        const out = expose(MintRequestCollectionRestore).row({ x: 1 }, 'id');
        assert.isTrue(out.readonly);
    });

    it('keeps other fields', () => {
        const out = expose(MintRequestCollectionRestore).row({ x: 1 }, 'id');
        assert.equal(out.x, 1);
    });
});

describe('MintTransactionCollectionRestore.createRow', () => {
    it('marks the row readonly', () => {
        const out = expose(MintTransactionCollectionRestore).row({ x: 1 }, 'id');
        assert.isTrue(out.readonly);
    });
});

describe('TokenCollectionRestore.createRow', () => {
    it('marks the row as view', () => {
        const out = expose(TokenCollectionRestore).row({ x: 1 }, 'id');
        assert.isTrue(out.view);
        assert.equal(out.x, 1);
    });
});

const passthrough = [
    ['DidCollectionRestore', DidCollectionRestore],
    ['StateCollectionRestore', StateCollectionRestore],
    ['RoleCollectionRestore', RoleCollectionRestore],
    ['TagCollectionRestore', TagCollectionRestore],
    ['DocStateCollectionRestore', DocStateCollectionRestore],
    ['TopicCollectionRestore', TopicCollectionRestore],
    ['ExternalCollectionRestore', ExternalCollectionRestore],
    ['PolicyInvitationsCollectionRestore', PolicyInvitationsCollectionRestore],
];

for (const [name, Cls] of passthrough) {
    describe(`${name}.createRow`, () => {
        it('returns the data unchanged', () => {
            const data = { x: 1, document: 'raw', documentFileId: 'f' };
            const out = expose(Cls).row(data, 'id');
            assert.deepEqual(out, { x: 1, document: 'raw', documentFileId: 'f' });
        });
    });
}

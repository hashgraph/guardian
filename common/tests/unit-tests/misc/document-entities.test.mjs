import { assert } from 'chai';
import { DidDocument } from '../../../dist/entity/did-document.js';
import { VpDocument as VpDocumentEntity } from '../../../dist/entity/vp-document.js';
import { VcDocument as VcDocumentEntity } from '../../../dist/entity/vc-document.js';
import { MultiDocuments } from '../../../dist/entity/multi-documents.js';
import { ExternalDocument } from '../../../dist/entity/external-document.js';
import { DocumentState } from '../../../dist/entity/document-state.js';
import { BlockState } from '../../../dist/entity/block-state.js';

describe('DidDocument.createDocument', () => {
    it('defaults status to NEW and computes hashes', async () => {
        const d = new DidDocument();
        d.did = 'did:1';
        await d.createDocument();
        assert.equal(d.status, 'NEW');
        assert.equal(d._propHash.length, 32);
        assert.equal(d._docHash, '');
    });

    it('hashes the document when present', async () => {
        const d = new DidDocument();
        d.document = { id: 'x' };
        await d.createDocument();
        assert.equal(d._docHash.length, 32);
    });

    it('keeps an explicit status', async () => {
        const d = new DidDocument();
        d.status = 'CREATE';
        await d.createDocument();
        assert.equal(d.status, 'CREATE');
    });
});

describe('VpDocument entity.setDefaults (no document)', () => {
    it('defaults status and signature, computes propHash, empty docHash', async () => {
        const v = new VpDocumentEntity();
        await v.setDefaults();
        assert.equal(v.status, 'NEW');
        assert.equal(v.signature, 0);
        assert.equal(v._propHash.length, 32);
        assert.equal(v._docHash, '');
    });
});

describe('VcDocument entity.setDefaults (no document)', () => {
    it('defaults hederaStatus/signature/option and clears tableFileIds', async () => {
        const v = new VcDocumentEntity();
        await v.setDefaults();
        assert.equal(v.hederaStatus, 'NEW');
        assert.equal(v.signature, 0);
        assert.isObject(v.option);
        assert.equal(v.option.status, 'NEW');
        assert.isUndefined(v.tableFileIds);
        assert.equal(v._docHash, '');
        assert.equal(v._propHash.length, 32);
    });

    it('preserves an existing option.status', async () => {
        const v = new VcDocumentEntity();
        v.option = { status: 'Approved' };
        await v.setDefaults();
        assert.equal(v.option.status, 'Approved');
    });
});

describe('MultiDocuments.setDefaults (no document)', () => {
    it('computes propHash and empty docHash', async () => {
        const m = new MultiDocuments();
        m.uuid = 'u';
        m.did = 'did:1';
        await m.setDefaults();
        assert.equal(m._propHash.length, 32);
        assert.equal(m._docHash, '');
    });
});

describe('ExternalDocument.createDocument', () => {
    it('defaults lastMessage/lastUpdate/active and hashes', async () => {
        const e = new ExternalDocument();
        await e.createDocument();
        assert.equal(e.lastMessage, '');
        assert.equal(e.lastUpdate, '');
        assert.equal(e.active, false);
        assert.equal(e._propHash.length, 32);
        assert.equal(e._docHash, '');
    });

    it('keeps an explicit active flag', async () => {
        const e = new ExternalDocument();
        e.active = true;
        await e.createDocument();
        assert.equal(e.active, true);
    });
});

describe('DocumentState.createDocument', () => {
    it('computes propHash from documentId and empty docHash', async () => {
        const s = new DocumentState();
        s.documentId = 'doc-1';
        await s.createDocument();
        assert.equal(s._propHash.length, 32);
        assert.equal(s._docHash, '');
    });

    it('hashes the document when present', async () => {
        const s = new DocumentState();
        s.document = { v: 1 };
        await s.createDocument();
        assert.equal(s._docHash.length, 32);
    });
});

describe('BlockState.createDocument', () => {
    it('computes propHash and docHash from blockState', async () => {
        const b = new BlockState();
        b.blockId = 'b-1';
        b.policyId = 'p-1';
        b.blockState = 'state-string';
        await b.createDocument();
        assert.equal(b._propHash.length, 32);
        assert.equal(b._docHash.length, 32);
    });

    it('propHash is deterministic for identical input', async () => {
        const a = new BlockState();
        a.blockId = 'x';
        a.blockTag = 't';
        a.policyId = 'p';
        a.blockState = 's';
        await a.createDocument();
        const c = new BlockState();
        c.blockId = 'x';
        c.blockTag = 't';
        c.policyId = 'p';
        c.blockState = 's';
        await c.createDocument();
        assert.equal(a._propHash, c._propHash);
        assert.equal(a._docHash, c._docHash);
    });
});

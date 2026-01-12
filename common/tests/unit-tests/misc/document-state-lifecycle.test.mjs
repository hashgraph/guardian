import { assert } from 'chai';
import crypto from 'node:crypto';
import { DidDocument } from '../../../dist/entity/did-document.js';
import { DocumentState } from '../../../dist/entity/document-state.js';
import { ExternalPolicy } from '../../../dist/entity/external-policy.js';
import { GlobalEventsReaderStream } from '../../../dist/entity/global-events-reader-stream.js';
import { GlobalEventsWriterStream } from '../../../dist/entity/global-events-writer-stream.js';
import { RestoreEntity } from '../../../dist/models/index.js';

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

describe('RestoreEntity hash primitives', () => {
    class Probe extends RestoreEntity {}

    it('hashes a property object as md5 of its JSON', () => {
        const p = new Probe();
        p._updatePropHash({ a: 1, b: 'x' });
        assert.equal(p._propHash, md5(JSON.stringify({ a: 1, b: 'x' })));
    });

    it('produces a 32-char prop hash', () => {
        const p = new Probe();
        p._updatePropHash({ a: 1 });
        assert.equal(p._propHash.length, 32);
    });

    it('is order-sensitive on object keys', () => {
        const a = new Probe();
        const b = new Probe();
        a._updatePropHash({ x: 1, y: 2 });
        b._updatePropHash({ y: 2, x: 1 });
        assert.notEqual(a._propHash, b._propHash);
    });

    it('hashes a non-empty document string', () => {
        const p = new Probe();
        p._updateDocHash('payload');
        assert.equal(p._docHash, md5('payload'));
    });

    it('empties the doc hash for an empty string', () => {
        const p = new Probe();
        p._updateDocHash('');
        assert.equal(p._docHash, '');
    });

    it('empties the doc hash for falsy input', () => {
        const p = new Probe();
        p._updateDocHash(undefined);
        assert.equal(p._docHash, '');
    });

    it('is deterministic for equal documents', () => {
        const a = new Probe();
        const b = new Probe();
        a._updateDocHash('same');
        b._updateDocHash('same');
        assert.equal(a._docHash, b._docHash);
    });
});

describe('DidDocument status transitions', () => {
    it('defaults a missing status to NEW', async () => {
        const d = new DidDocument();
        await d.createDocument();
        assert.equal(d.status, 'NEW');
    });

    for (const status of ['CREATE', 'UPDATE', 'DELETE', 'FAILED']) {
        it(`preserves an explicit ${status} status`, async () => {
            const d = new DidDocument();
            d.status = status;
            await d.createDocument();
            assert.equal(d.status, status);
        });
    }

    it('treats empty-string status as missing and defaults to NEW', async () => {
        const d = new DidDocument();
        d.status = '';
        await d.createDocument();
        assert.equal(d.status, 'NEW');
    });

    it('folds the status into the property hash', async () => {
        const a = new DidDocument();
        a.did = 'did:1';
        a.status = 'CREATE';
        await a.createDocument();
        const b = new DidDocument();
        b.did = 'did:1';
        b.status = 'UPDATE';
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('empties the doc hash when no document is present', async () => {
        const d = new DidDocument();
        await d.createDocument();
        assert.equal(d._docHash, '');
    });

    it('hashes the document JSON when present', async () => {
        const d = new DidDocument();
        d.document = { id: 'x', value: 1 };
        await d.createDocument();
        assert.equal(d._docHash, md5(JSON.stringify({ id: 'x', value: 1 })));
    });

    it('changing relationships changes the prop hash', async () => {
        const a = new DidDocument();
        a.relationships = ['m1'];
        await a.createDocument();
        const b = new DidDocument();
        b.relationships = ['m1', 'm2'];
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('is idempotent across two runs with the same input', async () => {
        const a = new DidDocument();
        a.did = 'did:z';
        a.status = 'CREATE';
        a.policyId = 'p1';
        await a.createDocument();
        const h1 = a._propHash;
        await a.createDocument();
        assert.equal(a._propHash, h1);
    });
});

describe('DocumentState lifecycle', () => {
    it('hashes the documentId into prop hash with empty doc hash', async () => {
        const s = new DocumentState();
        s.documentId = 'doc-1';
        await s.createDocument();
        assert.equal(s._propHash, md5(JSON.stringify({ documentId: 'doc-1' })));
        assert.equal(s._docHash, '');
    });

    it('hashes a present document', async () => {
        const s = new DocumentState();
        s.document = { v: 1 };
        await s.createDocument();
        assert.equal(s._docHash, md5(JSON.stringify({ v: 1 })));
    });

    it('different documentIds give different prop hashes', async () => {
        const a = new DocumentState();
        a.documentId = 'd1';
        await a.createDocument();
        const b = new DocumentState();
        b.documentId = 'd2';
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('prop hash ignores policyId (not in the hashed prop)', async () => {
        const a = new DocumentState();
        a.documentId = 'd1';
        a.policyId = 'p1';
        await a.createDocument();
        const b = new DocumentState();
        b.documentId = 'd1';
        b.policyId = 'p2';
        await b.createDocument();
        assert.equal(a._propHash, b._propHash);
    });
});

describe('ExternalPolicy.setDefaults', () => {
    it('defaults a missing status to NEW', () => {
        const e = new ExternalPolicy();
        e.setDefaults();
        assert.equal(e.status, 'NEW');
    });

    it('keeps an explicit status', () => {
        const e = new ExternalPolicy();
        e.status = 'APPROVED';
        e.setDefaults();
        assert.equal(e.status, 'APPROVED');
    });

    it('treats empty-string status as missing', () => {
        const e = new ExternalPolicy();
        e.status = '';
        e.setDefaults();
        assert.equal(e.status, 'NEW');
    });
});

describe('GlobalEventsReaderStream defaults and hash', () => {
    it('defaults status to FREE and active to false', () => {
        const r = new GlobalEventsReaderStream();
        assert.equal(r.status, 'FREE');
        assert.equal(r.active, false);
    });

    it('defaults cursor and json maps', () => {
        const r = new GlobalEventsReaderStream();
        assert.equal(r.lastMessageCursor, '');
        assert.deepEqual(r.filterFieldsByBranch, {});
        assert.deepEqual(r.branchDocumentTypeByBranch, {});
    });

    it('computes a prop hash and empties the doc hash', () => {
        const r = new GlobalEventsReaderStream();
        r.policyId = 'p1';
        r.blockId = 'b1';
        r.prepareEntity();
        assert.equal(r._propHash.length, 32);
        assert.equal(r._docHash, '');
    });

    it('is deterministic for identical input', () => {
        const a = new GlobalEventsReaderStream();
        a.policyId = 'p';
        a.blockId = 'b';
        a.prepareEntity();
        const b = new GlobalEventsReaderStream();
        b.policyId = 'p';
        b.blockId = 'b';
        b.prepareEntity();
        assert.equal(a._propHash, b._propHash);
    });

    it('reflects status changes in the prop hash', () => {
        const a = new GlobalEventsReaderStream();
        a.policyId = 'p';
        a.prepareEntity();
        const b = new GlobalEventsReaderStream();
        b.policyId = 'p';
        b.status = 'PROCESSING';
        b.prepareEntity();
        assert.notEqual(a._propHash, b._propHash);
    });
});

describe('DidDocument relationship and message chain in prop hash', () => {
    it('empty vs populated messageIds differ', async () => {
        const a = new DidDocument();
        await a.createDocument();
        const b = new DidDocument();
        b.messageIds = ['m1'];
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('message chain order is significant', async () => {
        const a = new DidDocument();
        a.messageIds = ['m1', 'm2'];
        await a.createDocument();
        const b = new DidDocument();
        b.messageIds = ['m2', 'm1'];
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('topicId is folded into the prop hash', async () => {
        const a = new DidDocument();
        a.topicId = '0.0.1';
        await a.createDocument();
        const b = new DidDocument();
        b.topicId = '0.0.2';
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('policyId is folded into the prop hash', async () => {
        const a = new DidDocument();
        a.policyId = 'p1';
        await a.createDocument();
        const b = new DidDocument();
        b.policyId = 'p2';
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('verificationMethods are folded into the prop hash', async () => {
        const a = new DidDocument();
        await a.createDocument();
        const b = new DidDocument();
        b.verificationMethods = { key: 'v' };
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('two empty did documents share the same prop hash', async () => {
        const a = new DidDocument();
        await a.createDocument();
        const b = new DidDocument();
        await b.createDocument();
        assert.equal(a._propHash, b._propHash);
    });
});

describe('GlobalEventsWriterStream defaults and hash', () => {
    it('defaults active false, documentType any, empty lastPublishMessageId', () => {
        const w = new GlobalEventsWriterStream();
        assert.equal(w.active, false);
        assert.equal(w.documentType, 'any');
        assert.equal(w.lastPublishMessageId, '');
    });

    it('computes a prop hash and empties the doc hash', () => {
        const w = new GlobalEventsWriterStream();
        w.policyId = 'p1';
        w.prepareEntity();
        assert.equal(w._propHash.length, 32);
        assert.equal(w._docHash, '');
    });

    it('reflects documentType changes in the prop hash', () => {
        const a = new GlobalEventsWriterStream();
        a.policyId = 'p';
        a.prepareEntity();
        const b = new GlobalEventsWriterStream();
        b.policyId = 'p';
        b.documentType = 'vc';
        b.prepareEntity();
        assert.notEqual(a._propHash, b._propHash);
    });
});

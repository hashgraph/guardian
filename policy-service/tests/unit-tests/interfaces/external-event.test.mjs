import assert from 'node:assert/strict';
import {
    ExternalEvent,
    ExternalEventType,
    ExternalDocuments,
} from '../../../dist/policy-engine/interfaces/external-event.js';

describe('ExternalEventType', () => {
    it('exposes the documented event names', () => {
        assert.equal(ExternalEventType.Run, 'Run');
        assert.equal(ExternalEventType.Set, 'Set');
        assert.equal(ExternalEventType.TickAggregate, 'TickAggregate');
        assert.equal(ExternalEventType.TickCron, 'TickCron');
        assert.equal(ExternalEventType.StartCron, 'StartCron');
        assert.equal(ExternalEventType.StopCron, 'StopCron');
        assert.equal(ExternalEventType.Step, 'Step');
        assert.equal(ExternalEventType.Chunk, 'Chunk');
    });
});

describe('ExternalEvent', () => {
    const block = { uuid: 'b-uuid', blockType: 'b-type', tag: 'b-tag' };
    const user = { id: 'u-id' };

    it('captures type/block/user/data on construction', () => {
        const event = new ExternalEvent(ExternalEventType.Run, block, user, { x: 1 });
        assert.equal(event.type, ExternalEventType.Run);
        assert.equal(event.blockUUID, 'b-uuid');
        assert.equal(event.blockType, 'b-type');
        assert.equal(event.blockTag, 'b-tag');
        assert.equal(event.userId, 'u-id');
        assert.deepEqual(event.data, { x: 1 });
    });

    it('tolerates a null block (sets fields to undefined)', () => {
        const event = new ExternalEvent(ExternalEventType.Set, null, user, null);
        assert.equal(event.blockUUID, undefined);
        assert.equal(event.blockType, undefined);
        assert.equal(event.blockTag, undefined);
        assert.equal(event.userId, 'u-id');
    });

    it('tolerates a null user (userId becomes undefined)', () => {
        const event = new ExternalEvent(ExternalEventType.Set, block, null, null);
        assert.equal(event.userId, undefined);
    });

    it('preserves arbitrary data payloads', () => {
        const payload = { complex: { nested: [1, 2, 3] } };
        const event = new ExternalEvent(ExternalEventType.Run, block, user, payload);
        assert.equal(event.data, payload);
    });
});

describe('ExternalDocuments', () => {
    it('returns null for falsy input', () => {
        assert.equal(ExternalDocuments(null), null);
        assert.equal(ExternalDocuments(undefined), null);
    });

    it('classifies a VC document', () => {
        const doc = { id: 'd1', document: { id: 'doc-id', credentialSubject: [{}] } };
        const out = ExternalDocuments(doc);
        assert.deepEqual(out, [{ type: 'VC', id: 'd1', uuid: 'doc-id' }]);
    });

    it('classifies a VP document', () => {
        const doc = { id: 'd2', document: { verifiableCredential: [{}] } };
        const out = ExternalDocuments(doc);
        assert.equal(out[0].type, 'VP');
    });

    it('classifies a DID document', () => {
        const doc = { id: 'd3', document: { verificationMethod: [{}] } };
        const out = ExternalDocuments(doc);
        assert.equal(out[0].type, 'DID');
    });

    it('returns type=null when no recognised section is present', () => {
        const doc = { id: 'd4', document: { other: true } };
        const out = ExternalDocuments(doc);
        assert.equal(out[0].type, null);
    });

    it('handles an array of documents', () => {
        const docs = [
            { id: 'a', document: { credentialSubject: [] } },
            { id: 'b', document: { verifiableCredential: [] } },
        ];
        const out = ExternalDocuments(docs);
        assert.equal(out.length, 2);
        assert.equal(out[0].type, 'VC');
        assert.equal(out[1].type, 'VP');
    });

    it('returns null on internal errors (e.g. document field missing)', () => {
        // Pass an object whose `document` getter throws.
        const broken = {};
        Object.defineProperty(broken, 'document', {
            get() { throw new Error('boom'); },
        });
        assert.equal(ExternalDocuments(broken), null);
    });
});

import assert from 'node:assert/strict';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

describe('@unit RecordActionStep preview', () => {
    it('is not a preview by default', () => {
        const step = new RecordActionStep(() => {});
        assert.equal(step.preview, false);
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('ignores preview documents outside a preview', () => {
        const step = new RecordActionStep(() => {});
        step.addPreviewDocument('form', null, { data: { a: 1 } });
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('records the source, the target block and a copy of the document', () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const doc = { a: 1 };
        step.addPreviewDocument('math', { tag: 'save', blockType: 'sendToGuardianBlock' }, { data: doc });
        doc.a = 2;
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'math', target: 'save', blockType: 'sendToGuardianBlock', document: { a: 1 } }
        ]);
    });

    it('records the end of a chain without a target', () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.addPreviewDocument('math', null, { data: [{ a: 1 }, { a: 2 }] });
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'math', target: null, blockType: null, document: [{ a: 1 }, { a: 2 }] }
        ]);
    });

    it('records null when the event carries no data or the target has no tag', () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.addPreviewDocument(null, { blockType: 'mintDocumentBlock' }, null);
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: null, target: null, blockType: 'mintDocumentBlock', document: null }
        ]);
    });
});

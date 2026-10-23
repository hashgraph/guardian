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

    it('ignores calculations outside a preview', () => {
        const step = new RecordActionStep(() => {});
        step.addPreviewCalculation({ source: 'math', blockType: 'mathBlock', inputs: [], values: [], outputs: [] });
        assert.deepEqual(step.getPreviewCalculations(), []);
    });

    it('keeps a copy of each calculation in order', () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const first = {
            source: 'math',
            blockType: 'mathBlock',
            inputs: [{ name: 'a', path: 'amount', value: 2 }],
            values: [],
            outputs: []
        };
        step.addPreviewCalculation(first);
        step.addPreviewCalculation({ source: 'calc', blockType: 'calculateContainerBlock', inputs: [], values: [], outputs: [] });
        first.inputs[0].value = 99;
        assert.deepEqual(step.getPreviewCalculations().map((item) => item.source), ['math', 'calc']);
        assert.equal(step.getPreviewCalculations()[0].inputs[0].value, 2);
    });

    it('keeps each read once and ignores empty paths', () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.addPreviewRead('#S', 'amount');
        step.addPreviewRead('#S', 'amount');
        step.addPreviewRead(null, 'amount');
        step.addPreviewRead('#S', '');
        assert.deepEqual(step.getPreviewReads(), [
            { schema: '#S', path: 'amount' },
            { schema: null, path: 'amount' }
        ]);
    });

    it('ignores reads and the form source outside a preview', () => {
        const step = new RecordActionStep(() => {});
        step.addPreviewRead('#S', 'amount');
        step.setPreviewSource({ schema: '#S', document: {}, paths: [], dependencies: {} });
        assert.deepEqual(step.getPreviewReads(), []);
        assert.equal(step.getPreviewSource(), null);
    });

    it('keeps a copy of the form source', () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        const source = { schema: '#S', document: { amount: 1 }, paths: ['amount'], dependencies: {} };
        step.setPreviewSource(source);
        source.document.amount = 5;
        assert.equal(step.getPreviewSource().document.amount, 1);
    });
});

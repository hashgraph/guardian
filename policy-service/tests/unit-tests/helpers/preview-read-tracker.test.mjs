import assert from 'node:assert/strict';
import { PreviewReadTracker } from '../../../dist/policy-engine/helpers/workers/preview-read-tracker.js';

describe('@unit PreviewReadTracker', () => {
    it('records nested reads with dotted paths', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ amount: 2, location: { lat: 1 } }, '#S');
        assert.equal(doc.amount + doc.location.lat, 3);
        assert.deepEqual(tracker.take(), [
            { schema: '#S', path: 'amount' },
            { schema: '#S', path: 'location' },
            { schema: '#S', path: 'location.lat' }
        ]);
    });

    it('records a read of a field that is not there', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({}, '#S');
        assert.equal(doc.rate, undefined);
        assert.deepEqual(tracker.take(), [{ schema: '#S', path: 'rate' }]);
    });

    it('leaves array indexes out of the path', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ items: [{ value: 1 }, { value: 2 }] }, null);
        const total = doc.items.map((item) => item.value).reduce((sum, value) => sum + value, 0);
        assert.equal(total, 3);
        assert.deepEqual(tracker.take().map((read) => read.path), ['items', 'items.value']);
    });

    it('returns each read once and clears on take', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ a: 1 }, null);
        const first = doc.a;
        const second = doc.a;
        assert.equal(first + second, 2);
        assert.equal(tracker.take().length, 1);
        assert.deepEqual(tracker.take(), []);
    });

    it('returns the same proxy for the same object', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ location: { lat: 1 } }, null);
        assert.equal(doc.location, doc.location);
    });

    it('unwraps tracked values so they can be sent between threads', () => {
        const tracker = new PreviewReadTracker();
        const doc = tracker.track({ amount: 2, location: { lat: 1 } }, null);
        const result = { copy: doc.location, total: doc.amount };
        assert.throws(() => structuredClone(result));
        assert.deepEqual(structuredClone(tracker.unwrap(result)), { copy: { lat: 1 }, total: 2 });
        assert.deepEqual(structuredClone(tracker.unwrap(doc)), { amount: 2, location: { lat: 1 } });
    });

    it('tracks the credential subjects of policy documents with their schema', () => {
        const tracker = new PreviewReadTracker();
        const documents = tracker.trackPolicyDocuments([
            { schema: '#S', document: { credentialSubject: [{ amount: 2 }] } },
            { schema: '#R', document: { credentialSubject: { rate: 3 } } },
            { document: null }
        ]);
        assert.equal(documents[0].document.credentialSubject[0].amount, 2);
        assert.equal(documents[1].document.credentialSubject.rate, 3);
        assert.deepEqual(documents[2], { document: null });
        assert.deepEqual(tracker.take(), [
            { schema: '#S', path: 'amount' },
            { schema: '#R', path: 'rate' }
        ]);
    });

    it('passes primitives and non-lists through', () => {
        const tracker = new PreviewReadTracker();
        assert.equal(tracker.track(5, null), 5);
        assert.equal(tracker.trackPolicyDocuments(null), null);
        assert.equal(tracker.unwrap('text'), 'text');
    });

    it('ignores an empty path', () => {
        const tracker = new PreviewReadTracker();
        tracker.add('#S', '');
        assert.deepEqual(tracker.take(), []);
    });
});

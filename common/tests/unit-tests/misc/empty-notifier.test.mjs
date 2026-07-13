import { assert } from 'chai';
import { EmptyNotifier } from '../../../dist/notification/empty-notifier.js';

describe('EmptyNotifier', () => {
    let n;
    beforeEach(() => { n = new EmptyNotifier(); });

    it('exposes the literal name "empty"', () => {
        assert.equal(n.name, 'empty');
    });

    it('all chainable methods return the same instance', () => {
        assert.strictEqual(n.minimize(true), n);
        assert.strictEqual(n.setEstimate(10), n);
        assert.strictEqual(n.addEstimate(1), n);
        assert.strictEqual(n.start(), n);
        assert.strictEqual(n.complete(), n);
        assert.strictEqual(n.skip(), n);
        assert.strictEqual(n.result({ ok: true }), n);
        assert.strictEqual(n.fail('err'), n);
        assert.strictEqual(n.startStep('any'), n);
        assert.strictEqual(n.completeStep('any'), n);
        assert.strictEqual(n.skipStep('any'), n);
    });

    it('does not throw under any sequence of calls', () => {
        assert.doesNotThrow(() => {
            n.start().setEstimate(5).addEstimate(2);
            n.startStep('a').completeStep('a');
            n.fail(new Error('x'), 500).complete();
        });
    });
});

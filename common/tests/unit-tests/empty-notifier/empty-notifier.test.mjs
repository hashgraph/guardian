import assert from 'node:assert/strict';
import { EmptyNotifier } from '../../../dist/notification/empty-notifier.js';

describe('EmptyNotifier', () => {
    it('exposes the documented "empty" name', () => {
        const n = new EmptyNotifier();
        assert.equal(n.name, 'empty');
    });

    it('every mutator returns this (fluent chain compatibility)', () => {
        const n = new EmptyNotifier();
        assert.equal(n.minimize(true), n);
        assert.equal(n.setEstimate(7), n);
        assert.equal(n.addEstimate(2), n);
        assert.equal(n.start(), n);
        assert.equal(n.complete(), n);
        assert.equal(n.skip(), n);
        assert.equal(n.fail('err'), n);
        assert.equal(n.fail(new Error('e'), 500), n);
        assert.equal(n.result({}), n);
    });

    it('child-step methods return this (so step chains keep working)', () => {
        const n = new EmptyNotifier();
        assert.equal(n.startStep('any'), n);
        assert.equal(n.completeStep('any'), n);
        assert.equal(n.skipStep('any'), n);
        assert.equal(n.failStep('any', 'err'), n);
        assert.equal(n.addStep('any'), n);
        assert.equal(n.getStep('any'), n);
        assert.equal(n.findStepById('any'), n);
        assert.equal(n.getStepById('any'), n);
        assert.equal(n.setId('any'), n);
    });

    it('sendStatus / sendError / sendResult return undefined (no-op)', () => {
        const n = new EmptyNotifier();
        assert.equal(n.sendStatus(), undefined);
        assert.equal(n.sendError({ code: 500, message: 'x' }), undefined);
        assert.equal(n.sendResult({}), undefined);
    });

    it('info() returns the documented zero/empty shape', () => {
        const n = new EmptyNotifier();
        const info = n.info();
        assert.equal(info.name, 'empty');
        assert.equal(info.started, false);
        assert.equal(info.completed, false);
        assert.equal(info.failed, false);
        assert.equal(info.skipped, false);
        assert.equal(info.error, null);
        assert.equal(info.size, -1);
        assert.equal(info.estimate, -1);
        assert.deepEqual(info.steps, []);
        assert.equal(info.startDate, null);
        assert.equal(info.stopDate, null);
        assert.equal(info.minimized, false);
        assert.equal(info.index, -1);
        assert.equal(info.progress, 0);
        assert.equal(info.message, '');
    });
});

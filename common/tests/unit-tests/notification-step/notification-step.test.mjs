import assert from 'node:assert/strict';
import { NotificationStep } from '../../../dist/notification/notification-step.js';

describe('NotificationStep construction', () => {
    it('captures name and size; starts in the default state', () => {
        const s = new NotificationStep('build', 5);
        assert.equal(s.name, 'build');
        assert.equal(s.size, 5);
        assert.equal(s.started, false);
        assert.equal(s.completed, false);
        assert.equal(s.failed, false);
        assert.equal(s.skipped, false);
        assert.equal(s.minimized, false);
        assert.equal(s.estimate, 0);
    });
});

describe('NotificationStep mutators (chaining + state)', () => {
    it('minimize() sets the flag and chains', () => {
        const s = new NotificationStep('x', 1);
        assert.equal(s.minimize(true), s);
        assert.equal(s.minimized, true);
    });

    it('setEstimate() sets and chains', () => {
        const s = new NotificationStep('x', 1);
        assert.equal(s.setEstimate(7), s);
        assert.equal(s.estimate, 7);
    });

    it('addEstimate() adds steps.length + estimate', () => {
        const s = new NotificationStep('x', 1);
        s.addStep('a');
        s.addStep('b');
        assert.equal(s.addEstimate(3), s);
        assert.equal(s.estimate, 5);
    });

    it('start() flips started=true and stamps startDate', () => {
        const s = new NotificationStep('x', 1);
        const before = Date.now();
        s.start();
        assert.equal(s.started, true);
        assert.ok(s.startDate >= before);
    });

    it('complete() sets completed=true and stamps stopDate', () => {
        const s = new NotificationStep('x', 1);
        s.complete();
        assert.equal(s.completed, true);
        assert.equal(s.failed, false);
        assert.ok(typeof s.stopDate === 'number');
    });

    it('skip() (after no completion) sets skipped=true and completed=true', () => {
        const s = new NotificationStep('x', 1);
        s.skip();
        assert.equal(s.completed, true);
        assert.equal(s.skipped, true);
        assert.equal(s.failed, false);
    });

    it('skip() after complete() leaves skipped=false', () => {
        const s = new NotificationStep('x', 1);
        s.complete();
        s.skip();
        assert.equal(s.skipped, false);
    });

    it('fail() captures string error with default code 500', () => {
        const s = new NotificationStep('x', 1);
        s.fail('boom');
        assert.equal(s.failed, true);
        assert.equal(s.completed, true);
        assert.equal(s.error.code, 500);
        assert.equal(s.error.message, 'boom');
    });

    it('fail() captures Error.message when given an Error', () => {
        const s = new NotificationStep('x', 1);
        s.fail(new Error('nested'), 'CUSTOM');
        assert.equal(s.error.code, 'CUSTOM');
        assert.equal(s.error.message, 'nested');
    });

    it('fail() falls back to "Unknown error" when error has no message/stack', () => {
        const s = new NotificationStep('x', 1);
        s.fail({});
        assert.equal(s.error.message, 'Unknown error');
    });
});

describe('NotificationStep nested steps', () => {
    it('addStep() returns a child NotificationStep with the same parent notifier', () => {
        const parent = new NotificationStep('parent', 1);
        const child = parent.addStep('child', 2);
        assert.ok(child instanceof NotificationStep);
        assert.equal(child.name, 'child');
        assert.equal(child.size, 2);
    });

    it('startStep / completeStep / skipStep / failStep manage children by name', () => {
        const parent = new NotificationStep('parent', 1);
        parent.addStep('a');
        parent.addStep('b');
        parent.startStep('a');
        parent.completeStep('a');
        parent.skipStep('b');
        const a = parent.getStep('a');
        const b = parent.getStep('b');
        assert.equal(a.completed, true);
        assert.equal(b.skipped, true);
    });

    it('failStep records error on the named child', () => {
        const parent = new NotificationStep('parent', 1);
        parent.addStep('a');
        parent.failStep('a', 'bad', 400);
        const a = parent.getStep('a');
        assert.equal(a.failed, true);
        assert.equal(a.error.code, 400);
        assert.equal(a.error.message, 'bad');
    });

    it('throws "Step <name> not found" when interacting with an unknown step', () => {
        const parent = new NotificationStep('parent', 1);
        assert.throws(() => parent.startStep('nope'), /Step nope not found/);
        assert.throws(() => parent.completeStep('nope'), /Step nope not found/);
        assert.throws(() => parent.skipStep('nope'), /Step nope not found/);
        assert.throws(() => parent.failStep('nope', 'x'), /Step nope not found/);
    });
});

describe('NotificationStep.info', () => {
    it('returns progress=0 when not yet started', () => {
        const info = new NotificationStep('x', 1).info();
        assert.equal(info.progress, 0);
        assert.equal(info.index, 0);
        assert.equal(info.message, '');
    });

    it('returns progress=100 when completed', () => {
        const s = new NotificationStep('x', 1);
        s.complete();
        const info = s.info();
        assert.equal(info.progress, 100);
        assert.equal(info.message, 'x');
    });

    it('reports progress=100 when failed (fail() also sets completed=true)', () => {
        // fail() flips completed=true alongside failed=true, so info()
        // treats it like a finished step (progress=100). Document this.
        const s = new NotificationStep('x', 1);
        s.fail('boom');
        const info = s.info();
        assert.equal(info.progress, 100);
        assert.equal(info.failed, true);
    });

    it('skipped steps look identical to completed (progress=100)', () => {
        const s = new NotificationStep('x', 1);
        s.skip();
        const info = s.info();
        assert.equal(info.progress, 100);
    });

    it('children are omitted when minimized=true', () => {
        const parent = new NotificationStep('p', 1);
        parent.addStep('a');
        parent.minimize(true);
        const info = parent.info();
        assert.deepEqual(info.steps, []);
    });

    it('estimate reflects max(steps.length, estimate)', () => {
        const parent = new NotificationStep('p', 1);
        parent.addStep('a');
        parent.addStep('b');
        parent.addStep('c');
        parent.setEstimate(2);
        const info = parent.info();
        assert.equal(info.estimate, 3);
    });
});

describe('NotificationStep findStepById', () => {
    it('finds the root by id', () => {
        const s = new NotificationStep('x', 1);
        s.setId('root-id');
        assert.equal(s.findStepById('root-id'), s);
    });

    it('finds a nested child by id', () => {
        const parent = new NotificationStep('p', 1);
        const child = parent.addStep('c');
        child.setId('child-id');
        assert.equal(parent.findStepById('child-id'), child);
    });

    it('returns null when no step matches', () => {
        const s = new NotificationStep('x', 1);
        s.setId('root');
        assert.equal(s.findStepById('missing'), null);
    });
});

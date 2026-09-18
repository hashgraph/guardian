import { assert } from 'chai';
import { NotificationStep } from '../../../dist/notification/notification-step.js';

describe('NotificationStep constructor', () => {
    it('captures name and size', () => {
        const s = new NotificationStep('build', 5);
        assert.equal(s.name, 'build');
        assert.equal(s.size, 5);
    });

    it('starts not-started/not-completed/not-failed/not-skipped', () => {
        const s = new NotificationStep('x', 1);
        assert.isFalse(s.started);
        assert.isFalse(s.completed);
        assert.isFalse(s.failed);
        assert.isFalse(s.skipped);
        assert.equal(s.estimate, 0);
        assert.isFalse(s.minimized);
    });
});

describe('NotificationStep lifecycle: start / complete / skip / fail', () => {
    it('start() sets started=true and stamps startDate', () => {
        const s = new NotificationStep('x', 1);
        const before = Date.now();
        s.start();
        const after = Date.now();
        assert.isTrue(s.started);
        assert.isAtLeast(s.startDate, before);
        assert.isAtMost(s.startDate, after);
    });

    it('complete() sets completed=true and stamps stopDate', () => {
        const s = new NotificationStep('x', 1).start();
        s.complete();
        assert.isTrue(s.completed);
        assert.isFalse(s.failed);
        assert.isNumber(s.stopDate);
    });

    it('skip() on a fresh step marks completed+skipped=true', () => {
        const s = new NotificationStep('x', 1);
        s.skip();
        assert.isTrue(s.completed);
        assert.isTrue(s.skipped);
    });

    it('fail(string) records {code:500, message:string} by default', () => {
        const s = new NotificationStep('x', 1);
        s.fail('oh no');
        assert.deepEqual(s.error, { code: 500, message: 'oh no' });
        assert.isTrue(s.completed);
        assert.isTrue(s.failed);
    });

    it('fail(Error, code) records the message and the supplied code', () => {
        const s = new NotificationStep('x', 1);
        s.fail(new Error('boom'), 'E_BOOM');
        assert.deepEqual(s.error, { code: 'E_BOOM', message: 'boom' });
    });

    it('fail with empty Error falls back to "Unknown error"', () => {
        const s = new NotificationStep('x', 1);
        const e = new Error();
        e.message = '';
        e.stack = '';
        s.fail(e);
        assert.equal(s.error.message, 'Unknown error');
    });
});

describe('NotificationStep estimate', () => {
    it('setEstimate stores the supplied number', () => {
        const s = new NotificationStep('x', 1);
        s.setEstimate(7);
        assert.equal(s.estimate, 7);
    });

    it('addEstimate computes (children + delta)', () => {
        const s = new NotificationStep('x', 1);
        s.addStep('a').addStep?.('b'); // ignore second result
        s.addStep('b');
        s.addEstimate(3);
        assert.equal(s.estimate, 5); // 2 children + 3
    });
});

describe('NotificationStep child steps', () => {
    it('addStep registers and returns a child step', () => {
        const root = new NotificationStep('root', 1);
        const child = root.addStep('child', 2, true);
        assert.instanceOf(child, NotificationStep);
        assert.equal(child.name, 'child');
        assert.equal(child.size, 2);
        assert.isTrue(child.minimized);
    });

    it('getStep finds an existing child by name', () => {
        const root = new NotificationStep('root', 1);
        root.addStep('child', 1);
        assert.equal(root.getStep('child').name, 'child');
        assert.isUndefined(root.getStep('missing'));
    });

    it('startStep starts a registered child', () => {
        const root = new NotificationStep('root', 1);
        root.addStep('child', 1);
        const child = root.startStep('child');
        assert.isTrue(child.started);
    });

    it('startStep throws if the named step is not registered', () => {
        const root = new NotificationStep('root', 1);
        assert.throws(() => root.startStep('missing'), /Step missing not found/);
    });
});

describe('NotificationStep.findStepById', () => {
    it('finds itself when id matches', () => {
        const s = new NotificationStep('x', 1);
        s.setId('id-1');
        assert.strictEqual(s.findStepById('id-1'), s);
    });

    it('descends into children to find a matching id', () => {
        const root = new NotificationStep('root', 1);
        const child = root.addStep('c1', 1);
        child.setId('child-id');
        assert.strictEqual(root.findStepById('child-id'), child);
    });

    it('returns null when no descendant matches', () => {
        const root = new NotificationStep('root', 1);
        root.addStep('c1', 1);
        assert.isNull(root.findStepById('nope'));
    });
});

describe('NotificationStep.info()', () => {
    it('reports progress=0/index=0 on a fresh step (not started)', () => {
        const s = new NotificationStep('x', 1);
        const info = s.info();
        assert.equal(info.progress, 0);
        assert.equal(info.index, 0);
        assert.equal(info.message, '');
    });

    it('reports progress=100 on a completed step', () => {
        const s = new NotificationStep('x', 1).start().complete();
        const info = s.info();
        assert.equal(info.progress, 100);
        assert.equal(info.message, 'x');
    });

    it('reports progress=100 even on a failed step (fail() also marks completed=true)', () => {
        // fail() sets both completed=true and failed=true; the completed branch wins in info().
        const s = new NotificationStep('x', 1).start();
        s.fail('blew up');
        const info = s.info();
        assert.equal(info.progress, 100);
        assert.deepEqual(info.error, { code: 500, message: 'blew up' });
    });

    it('omits child steps from info when minimized', () => {
        const root = new NotificationStep('root', 1);
        root.addStep('hidden', 1);
        root.minimize(true);
        const info = root.info();
        assert.deepEqual(info.steps, []);
    });

    it('includes child steps when not minimized', () => {
        const root = new NotificationStep('root', 1);
        root.addStep('shown', 1);
        const info = root.info();
        assert.equal(info.steps.length, 1);
        assert.equal(info.steps[0].name, 'shown');
    });
});

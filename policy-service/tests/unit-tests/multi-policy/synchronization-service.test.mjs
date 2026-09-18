import { assert } from 'chai';
import esmock from 'esmock';

let cronInstances = [];

class FakeCronJob {
    constructor(mask, onTick) {
        this.mask = mask;
        this.onTick = onTick;
        this.started = false;
        this.stopped = false;
        cronInstances.push(this);
    }
    start() { this.started = true; }
    stop() { this.stopped = true; }
}

const loggerCalls = [];
const fakeLogger = {
    info: (...a) => { loggerCalls.push(['info', ...a]); },
    error: (...a) => { loggerCalls.push(['error', ...a]); },
    warn: (...a) => { loggerCalls.push(['warn', ...a]); },
};

const { SynchronizationService } = await esmock.strict(
    '../../../dist/policy-engine/multi-policy-service/synchronization-service.js',
    {
        'cron': { CronJob: FakeCronJob },
        '../../../dist/policy-engine/mint/mint-service.js': { MintService: { multiMint() {} } },
        '@guardian/common': {
            DatabaseServer: class {},
            MessageAction: {},
            MessageServer: class {},
            MultiPolicyTransaction: class {},
            NotificationHelper: { init() { return {}; } },
            PinoLogger: class {},
            Policy: class {},
            SynchronizationMessage: class {},
            Token: class {},
            TopicConfig: class {},
            Users: class {},
            Workers: class {},
            MgsUsers: class {},
        },
        '@guardian/interfaces': {
            PolicyStatus: { PUBLISH: 'PUBLISH', DRAFT: 'DRAFT' },
            WorkerTaskType: {},
            TenantContext: { fromTenantId() { return {}; } },
        },
    },
);

const PUBLISH = 'PUBLISH';

describe('@unit SynchronizationService.start', () => {
    beforeEach(() => {
        cronInstances = [];
        loggerCalls.length = 0;
        delete process.env.MULTI_POLICY_SCHEDULER;
    });

    it('returns false when policy is not PUBLISH', () => {
        const policy = { status: 'DRAFT', synchronizationTopicId: '0.0.1' };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        assert.equal(svc.start(), false);
        assert.equal(cronInstances.length, 0);
    });

    it('returns false when synchronizationTopicId is missing', () => {
        const policy = { status: PUBLISH, synchronizationTopicId: null };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        assert.equal(svc.start(), false);
        assert.equal(cronInstances.length, 0);
    });

    it('starts a cron job and returns true when PUBLISH with topic', () => {
        const policy = { status: PUBLISH, synchronizationTopicId: '0.0.1' };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        assert.equal(svc.start(), true);
        assert.equal(cronInstances.length, 1);
        assert.equal(cronInstances[0].started, true);
    });

    it('uses the default cron mask when env var is unset', () => {
        const policy = { status: PUBLISH, synchronizationTopicId: '0.0.1' };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        svc.start();
        assert.equal(cronInstances[0].mask, '0 0 * * *');
    });

    it('uses MULTI_POLICY_SCHEDULER env override for the cron mask', () => {
        process.env.MULTI_POLICY_SCHEDULER = '*/5 * * * *';
        const policy = { status: PUBLISH, synchronizationTopicId: '0.0.1' };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        svc.start();
        assert.equal(cronInstances[0].mask, '*/5 * * * *');
    });

    it('logs an info line on successful start', () => {
        const policy = { status: PUBLISH, synchronizationTopicId: '0.0.1' };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        svc.start();
        assert.equal(loggerCalls.some((c) => c[0] === 'info'), true);
    });

    it('is idempotent: a second start returns true without creating a new job', () => {
        const policy = { status: PUBLISH, synchronizationTopicId: '0.0.1' };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        assert.equal(svc.start(), true);
        assert.equal(svc.start(), true);
        assert.equal(cronInstances.length, 1);
    });
});

describe('@unit SynchronizationService.stop', () => {
    beforeEach(() => { cronInstances = []; });

    it('does nothing when no job is running', () => {
        const policy = { status: 'DRAFT', synchronizationTopicId: null };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        assert.doesNotThrow(() => svc.stop());
    });

    it('stops the running job and allows restart', () => {
        const policy = { status: PUBLISH, synchronizationTopicId: '0.0.1' };
        const svc = new SynchronizationService(policy, fakeLogger, 'owner');
        svc.start();
        const job = cronInstances[0];
        svc.stop();
        assert.equal(job.stopped, true);
        svc.start();
        assert.equal(cronInstances.length, 2);
    });
});

import { assert } from 'chai';
import { PolicyStatus } from '@guardian/interfaces';
import { SynchronizationService } from '../../../dist/policy-engine/multi-policy-service/synchronization-service.js';

const makeLogger = () => {
    const calls = [];
    return {
        calls,
        info(...args) { calls.push(['info', ...args]); },
        error(...args) { calls.push(['error', ...args]); }
    };
};

describe('SynchronizationService.start (pre-IO branches)', () => {
    it('returns false when status is not PUBLISH', () => {
        const service = new SynchronizationService(
            { status: PolicyStatus.DRAFT, synchronizationTopicId: 'topic-1' },
            makeLogger(),
            null
        );
        assert.isFalse(service.start());
    });

    it('returns false for DRY_RUN status', () => {
        const service = new SynchronizationService(
            { status: PolicyStatus.DRY_RUN, synchronizationTopicId: 'topic-1' },
            makeLogger(),
            null
        );
        assert.isFalse(service.start());
    });

    it('returns false when there is no synchronizationTopicId', () => {
        const service = new SynchronizationService(
            { status: PolicyStatus.PUBLISH, synchronizationTopicId: null },
            makeLogger(),
            null
        );
        assert.isFalse(service.start());
    });

    it('returns false when synchronizationTopicId is an empty string', () => {
        const service = new SynchronizationService(
            { status: PolicyStatus.PUBLISH, synchronizationTopicId: '' },
            makeLogger(),
            null
        );
        assert.isFalse(service.start());
    });

    it('does not log when start is rejected', () => {
        const logger = makeLogger();
        const service = new SynchronizationService(
            { status: PolicyStatus.DRAFT, synchronizationTopicId: 'topic-1' },
            logger,
            null
        );
        service.start();
        assert.equal(logger.calls.length, 0);
    });

    it('schedules and reports true for a published policy, and is idempotent', () => {
        const logger = makeLogger();
        const service = new SynchronizationService(
            { status: PolicyStatus.PUBLISH, synchronizationTopicId: 'topic-1' },
            logger,
            null
        );
        try {
            assert.isTrue(service.start());
            assert.isTrue(service.start());
            assert.equal(logger.calls.filter((c) => c[0] === 'info').length, 1);
        } finally {
            service.stop();
        }
    });
});

describe('SynchronizationService.stop', () => {
    it('is a no-op when no job is scheduled', () => {
        const service = new SynchronizationService(
            { status: PolicyStatus.PUBLISH, synchronizationTopicId: 'topic-1' },
            makeLogger(),
            null
        );
        assert.doesNotThrow(() => service.stop());
    });

    it('stops a scheduled job and allows restart', () => {
        const service = new SynchronizationService(
            { status: PolicyStatus.PUBLISH, synchronizationTopicId: 'topic-1' },
            makeLogger(),
            null
        );
        service.start();
        service.stop();
        try {
            assert.isTrue(service.start());
        } finally {
            service.stop();
        }
    });

    it('can be called twice safely', () => {
        const service = new SynchronizationService(
            { status: PolicyStatus.PUBLISH, synchronizationTopicId: 'topic-1' },
            makeLogger(),
            null
        );
        service.start();
        service.stop();
        assert.doesNotThrow(() => service.stop());
    });
});

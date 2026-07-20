import { assert } from 'chai';
import { DataBaseNamingStrategy } from '../../../dist/helpers/db-naming-strategy.js';

describe('DataBaseNamingStrategy.classToTableName', () => {
    let strategy;
    before(() => {
        strategy = new DataBaseNamingStrategy();
    });

    it('snake-cases a CamelCase entity name', () => {
        assert.equal(strategy.classToTableName('Notification'), 'notification');
        assert.equal(strategy.classToTableName('PolicyMessage'), 'policy_message');
        assert.equal(strategy.classToTableName('VcDocument'), 'vc_document');
    });

    it('handles long multi-word names', () => {
        assert.equal(strategy.classToTableName('ManagedGuardianService'), 'managed_guardian_service');
        assert.equal(strategy.classToTableName('IpfsContentPriorityQueueItem'), 'ipfs_content_priority_queue_item');
    });

    it('lowercases an already-lowercase name', () => {
        assert.equal(strategy.classToTableName('user'), 'user');
    });

    it('lowercases an all-uppercase name', () => {
        assert.equal(strategy.classToTableName('ABC'), 'abc');
    });

    it('does not insert an underscore at the leading boundary', () => {
        // Pattern is `([a-z])([A-Z])` so the first cap of "Foo" has no preceding lowercase.
        assert.equal(strategy.classToTableName('FooBar'), 'foo_bar');
        assert.notMatch(strategy.classToTableName('FooBar'), /^_/);
    });

    it('does not insert a separator between a digit and a following capital (digits are not [a-z])', () => {
        // Documented quirk: the boundary regex only fires between lowercase letter and uppercase letter,
        // so "Topic1Listener" lower-cases to "topic1listener" — no underscore between "1" and "Listener".
        assert.equal(strategy.classToTableName('Topic1Listener'), 'topic1listener');
    });
});

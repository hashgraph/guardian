import { assert } from 'chai';
import { PolicyBackup } from '../../../dist/policy-engine/db-restore/index.js';
import { PolicyBackupService } from '../../../dist/policy-engine/restore-service.js';

const collection = (actions = []) => ({ hash: 'h', fullHash: 'fh', actions });

const diffWith = (overrides = {}) => ({
    uuid: 'diff-uuid',
    type: 'diff',
    index: 7,
    lastUpdate: new Date('2020-01-01T00:00:00.000Z'),
    vcCollection: collection(),
    vpCollection: collection(),
    didCollection: collection(),
    stateCollection: collection(),
    ...overrides,
});

describe('PolicyBackup.isEmptyDiff', () => {
    it('reports an incremental diff with no actions as empty', () => {
        assert.isTrue(PolicyBackup.isEmptyDiff(diffWith()));
    });

    it('reports a diff carrying an action as not empty', () => {
        const diff = diffWith({
            stateCollection: collection([{ type: 'update', id: 'b1', data: {} }]),
        });
        assert.isFalse(PolicyBackup.isEmptyDiff(diff));
    });

    it('detects an action in any collection, not just the first', () => {
        const diff = diffWith({
            policyCommentCollection: collection([{ type: 'create', id: 'c1', data: {} }]),
        });
        assert.isFalse(PolicyBackup.isEmptyDiff(diff));
    });

    it('treats a diff with metadata only as empty', () => {
        assert.isTrue(PolicyBackup.isEmptyDiff({
            uuid: 'u', type: 'diff', index: 1, lastUpdate: new Date(),
        }));
    });

    it('never reports a full backup as empty', () => {
        const backup = diffWith({ type: 'backup', index: 0 });
        assert.isFalse(PolicyBackup.isEmptyDiff(backup));
    });

    it('never reports a keys document as empty', () => {
        assert.isFalse(PolicyBackup.isEmptyDiff({
            uuid: 'u', type: 'keys', index: 3, discussionsKeys: collection(),
        }));
    });

    it('is safe on a missing diff', () => {
        assert.isFalse(PolicyBackup.isEmptyDiff(null));
        assert.isFalse(PolicyBackup.isEmptyDiff(undefined));
    });
});

describe('PolicyBackupService.task — publishing an empty diff', () => {
    const makeService = (diff) => {
        const svc = Object.create(PolicyBackupService.prototype);
        const calls = { sent: 0, saved: 0 };
        svc.controller = {
            async create() { return { backup: { uuid: 'b', type: 'backup', index: 8 }, diff }; },
            async save() { calls.saved++; },
        };
        svc.sendDiff = async () => { calls.sent++; };
        return { svc, calls };
    };

    it('does not publish or store anything when the diff is empty', async () => {
        const { svc, calls } = makeService(diffWith());
        await PolicyBackupService.prototype.task.call(svc);
        assert.equal(calls.sent, 0, 'sendDiff must not be called for an empty diff');
        assert.equal(calls.saved, 0, 'the backup must not be rewritten for an empty diff');
    });

    it('publishes and stores when the diff carries a change', async () => {
        const { svc, calls } = makeService(diffWith({
            vcCollection: collection([{ type: 'create', id: 'vc1', data: {} }]),
        }));
        await PolicyBackupService.prototype.task.call(svc);
        assert.equal(calls.sent, 1);
        assert.equal(calls.saved, 1);
    });
});

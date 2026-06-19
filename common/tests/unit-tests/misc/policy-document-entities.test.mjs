import { assert } from 'chai';
import { PolicyComment } from '../../../dist/entity/policy-comment.js';
import { PolicyDiscussion } from '../../../dist/entity/policy-discussion.js';
import { ApprovalDocument } from '../../../dist/entity/approval-document.js';
import { AggregateVC } from '../../../dist/entity/aggregate-documents.js';
import { SplitDocuments } from '../../../dist/entity/split-documents.js';
import { PolicyStatisticDocument } from '../../../dist/entity/policy-statistic-document.js';
import { PolicyLabelDocument } from '../../../dist/entity/policy-label-document.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('PolicyComment.setDefaults (no document)', () => {
    it('generates a uuid and sets doc/prop hashes from the uuid', async () => {
        const c = new PolicyComment();
        await c.setDefaults();
        assert.match(c.uuid, UUID_RE);
        assert.equal(c._docHash.length, 32);
        assert.equal(c._propHash.length, 32);
    });

    it('keeps an existing uuid', async () => {
        const c = new PolicyComment();
        c.uuid = 'fixed';
        await c.setDefaults();
        assert.equal(c.uuid, 'fixed');
    });
});

describe('PolicyDiscussion.setDefaults (no document)', () => {
    it('generates a uuid and computes hashes', async () => {
        const d = new PolicyDiscussion();
        await d.setDefaults();
        assert.match(d.uuid, UUID_RE);
        assert.equal(d._docHash.length, 32);
        assert.equal(d._propHash.length, 32);
    });
});

describe('ApprovalDocument.setDefaults (no document)', () => {
    it('defaults option.status to NEW and computes hashes', async () => {
        const a = new ApprovalDocument();
        await a.setDefaults();
        assert.isObject(a.option);
        assert.equal(a.option.status, 'NEW');
        assert.equal(a._docHash, '');
        assert.equal(a._propHash.length, 32);
    });

    it('keeps an existing option.status', async () => {
        const a = new ApprovalDocument();
        a.option = { status: 'Approved' };
        await a.setDefaults();
        assert.equal(a.option.status, 'Approved');
    });
});

describe('AggregateVC.setDefaults (no document)', () => {
    it('is a no-op when no document (does not throw)', async () => {
        const a = new AggregateVC();
        await a.setDefaults();
        assert.isUndefined(a.documentFileId);
    });

    it('extends BaseEntity (createDate present)', () => {
        const a = new AggregateVC();
        assert.instanceOf(a.createDate, Date);
    });
});

describe('SplitDocuments.setDefaults (no document)', () => {
    it('is a no-op when no document (does not throw)', async () => {
        const s = new SplitDocuments();
        await s.setDefaults();
        assert.isUndefined(s.documentFileId);
    });
});

describe('PolicyStatisticDocument.setDefaults (no document)', () => {
    it('generates a uuid', async () => {
        const s = new PolicyStatisticDocument();
        await s.setDefaults();
        assert.match(s.uuid, UUID_RE);
    });
});

describe('PolicyLabelDocument.setDefaults (no document)', () => {
    it('generates a uuid', async () => {
        const l = new PolicyLabelDocument();
        await l.setDefaults();
        assert.match(l.uuid, UUID_RE);
    });

    it('keeps an existing uuid', async () => {
        const l = new PolicyLabelDocument();
        l.uuid = 'keep';
        await l.setDefaults();
        assert.equal(l.uuid, 'keep');
    });
});

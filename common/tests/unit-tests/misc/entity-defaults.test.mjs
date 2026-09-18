import { assert } from 'chai';
import { TagCache } from '../../../dist/entity/tag-cache.js';
import { SchemaRule } from '../../../dist/entity/schema-rule.js';
import { PolicyStatistic } from '../../../dist/entity/policy-statistic.js';
import { PolicyDiff } from '../../../dist/entity/policy-diff.js';
import { Formula } from '../../../dist/entity/formula.js';
import { PolicyLabel } from '../../../dist/entity/policy-label.js';
import { Theme } from '../../../dist/entity/theme.js';
import { Tag } from '../../../dist/entity/tag.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('TagCache.setDefaults', () => {
    it('fills date with an ISO string when missing', () => {
        const t = new TagCache();
        t.setDefaults();
        assert.isString(t.date);
        assert.isFalse(isNaN(Date.parse(t.date)));
    });

    it('keeps an existing date', () => {
        const t = new TagCache();
        t.date = '2020-01-01T00:00:00.000Z';
        t.setDefaults();
        assert.equal(t.date, '2020-01-01T00:00:00.000Z');
    });
});

describe('SchemaRule.setDefaults', () => {
    it('generates a uuid and sets DRAFT status when missing', () => {
        const s = new SchemaRule();
        s.setDefaults();
        assert.match(s.uuid, UUID_RE);
        assert.equal(s.status, 'DRAFT');
    });

    it('preserves provided uuid and status', () => {
        const s = new SchemaRule();
        s.uuid = 'fixed-uuid';
        s.status = 'PUBLISHED';
        s.setDefaults();
        assert.equal(s.uuid, 'fixed-uuid');
        assert.equal(s.status, 'PUBLISHED');
    });
});

describe('PolicyStatistic.setDefaults', () => {
    it('generates uuid and DRAFT status', () => {
        const p = new PolicyStatistic();
        p.setDefaults();
        assert.match(p.uuid, UUID_RE);
        assert.equal(p.status, 'DRAFT');
    });
});

describe('PolicyDiff.setDefaults', () => {
    it('generates a uuid when missing', () => {
        const p = new PolicyDiff();
        p.setDefaults();
        assert.match(p.uuid, UUID_RE);
    });

    it('keeps an existing uuid', () => {
        const p = new PolicyDiff();
        p.uuid = 'keep-me';
        p.setDefaults();
        assert.equal(p.uuid, 'keep-me');
    });
});

describe('Formula.setDefaults', () => {
    it('generates uuid and DRAFT status', () => {
        const f = new Formula();
        f.setDefaults();
        assert.match(f.uuid, UUID_RE);
        assert.equal(f.status, 'DRAFT');
    });
});

describe('PolicyLabel.setDefaults', () => {
    it('generates uuid and DRAFT status', () => {
        const p = new PolicyLabel();
        p.setDefaults();
        assert.match(p.uuid, UUID_RE);
        assert.equal(p.status, 'DRAFT');
    });
});

describe('Theme.setDefaults', () => {
    it('generates a uuid when missing', () => {
        const t = new Theme();
        t.setDefaults();
        assert.match(t.uuid, UUID_RE);
    });

    it('keeps an existing uuid', () => {
        const t = new Theme();
        t.uuid = 'x';
        t.setDefaults();
        assert.equal(t.uuid, 'x');
    });
});

describe('Tag.createDocument', () => {
    it('fills uuid/status/operation/date defaults', async () => {
        const t = new Tag();
        await t.createDocument();
        assert.match(t.uuid, UUID_RE);
        assert.equal(t.status, 'Draft');
        assert.equal(t.operation, 'Create');
        assert.isString(t.date);
    });

    it('computes a 32-char md5 propHash', async () => {
        const t = new Tag();
        t.name = 'n';
        await t.createDocument();
        assert.isString(t._propHash);
        assert.equal(t._propHash.length, 32);
    });

    it('docHash is empty when no document, and set when present', async () => {
        const a = new Tag();
        await a.createDocument();
        assert.equal(a._docHash, '');

        const b = new Tag();
        b.document = { a: 1 };
        await b.createDocument();
        assert.isString(b._docHash);
        assert.equal(b._docHash.length, 32);
    });

    it('preserves provided status/operation', async () => {
        const t = new Tag();
        t.status = 'Published';
        t.operation = 'Delete';
        await t.createDocument();
        assert.equal(t.status, 'Published');
        assert.equal(t.operation, 'Delete');
    });

    it('propHash is stable across calls with same data', async () => {
        const t = new Tag();
        t.uuid = 'u';
        t.name = 'n';
        t.date = '2020-01-01T00:00:00.000Z';
        await t.createDocument();
        const first = t._propHash;
        await t.createDocument();
        assert.equal(t._propHash, first);
    });
});

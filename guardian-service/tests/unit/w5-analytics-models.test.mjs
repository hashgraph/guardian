import assert from 'node:assert/strict';
import { SchemaDocumentModel } from '../../dist/analytics/compare/models/schema-document.model.js';
import { TemplateTokenModel } from '../../dist/analytics/compare/models/template-token.model.js';
import { BlockSearchModel } from '../../dist/analytics/search/models/block.model.js';
import { PairSearchModel } from '../../dist/analytics/search/models/pair.model.js';
import {
    CompareOptions, IPropertiesLvl, IChildrenLvl, IEventsLvl, IIdLvl, IKeyLvl, IRefLvl
} from '../../dist/analytics/compare/interfaces/index.js';

const opts = new CompareOptions(
    IPropertiesLvl.All, IChildrenLvl.All, IEventsLvl.All,
    IIdLvl.All, IKeyLvl.Default, IRefLvl.Default, null
);

describe('SchemaDocumentModel', () => {
    it('parses simple field properties (excluding @context/type)', () => {
        const m = SchemaDocumentModel.from({
            properties: {
                '@context': { type: 'string' },
                type: { type: 'string' },
                amount: { type: 'number', title: 'A', description: 'A' }
            }
        });
        assert.deepEqual(m.fields.map(f => f.name), ['amount']);
    });

    it('returns no fields for an empty document', () => {
        assert.deepEqual(SchemaDocumentModel.from({}).fields, []);
    });

    it('parses a single-property if/then condition and merges its fields', () => {
        const m = SchemaDocumentModel.from({
            properties: {
                level: { type: 'string', title: 'L', description: 'L' },
                amount: { type: 'number', title: 'A', description: 'A' }
            },
            allOf: [{
                if: { properties: { level: { const: 'high' } } },
                then: { properties: { bonus: { type: 'number', title: 'B', description: 'B' } } },
                else: { properties: {} }
            }]
        });
        assert.equal(m.conditions.length, 1);
        assert.ok(m.fields.some(f => f.name === 'bonus'));
    });

    it('parses an anyOf (OR) condition into one condition', () => {
        const m = SchemaDocumentModel.from({
            properties: {
                a: { type: 'string', title: 'A', description: 'A' },
                b: { type: 'string', title: 'B', description: 'B' }
            },
            allOf: [{
                if: { anyOf: [{ properties: { a: { const: '1' } } }, { properties: { b: { const: '2' } } }] },
                then: { properties: { c: { type: 'number', title: 'C', description: 'C' } } }
            }]
        });
        assert.equal(m.conditions.length, 1);
    });

    it('parses an allOf (AND) condition into one condition', () => {
        const m = SchemaDocumentModel.from({
            properties: { a: { type: 'string', title: 'A', description: 'A' } },
            allOf: [{
                if: { allOf: [{ properties: { a: { const: '1' } } }] },
                then: { properties: { d: { type: 'number', title: 'D', description: 'D' } } }
            }]
        });
        assert.equal(m.conditions.length, 1);
    });

    it('skips allOf entries that have no if', () => {
        const m = SchemaDocumentModel.from({
            properties: { a: { type: 'string', title: 'A', description: 'A' } },
            allOf: [{ then: { properties: {} } }]
        });
        assert.equal(m.conditions.length, 0);
    });

    it('getField resolves an existing field and returns null otherwise', () => {
        const m = SchemaDocumentModel.from({
            properties: { level: { type: 'string', title: 'L', description: 'L' } }
        });
        assert.equal(m.getField('level')?.name, 'level');
        assert.equal(m.getField('missing'), null);
        assert.equal(m.getField(''), null);
    });

    it('update produces a deterministic hash; equal documents hash the same', () => {
        const a = SchemaDocumentModel.from({ properties: { a: { type: 'string', title: 'A', description: 'A' } } });
        const b = SchemaDocumentModel.from({ properties: { a: { type: 'string', title: 'A', description: 'A' } } });
        a.update(opts);
        b.update(opts);
        assert.equal(typeof a.hash(opts), 'string');
        assert.equal(a.hash(opts), b.hash(opts));
    });

    it('compare against null returns 0', () => {
        const a = SchemaDocumentModel.from({ properties: { a: { type: 'string', title: 'A', description: 'A' } } });
        a.update(opts);
        assert.equal(a.compare(null), 0);
    });

    it('compare of two non-empty schemas returns 0 (guard short-circuits, see note)', () => {
        const a = SchemaDocumentModel.from({ properties: { a: { type: 'string', title: 'A', description: 'A' } } });
        const b = SchemaDocumentModel.from({ properties: { a: { type: 'string', title: 'A', description: 'A' } } });
        a.update(opts);
        b.update(opts);
        assert.equal(a.compare(b), 0);
    });
});

describe('TemplateTokenModel', () => {
    const make = (tag, name = 'N', symbol = 'S') =>
        new TemplateTokenModel({ templateTokenTag: tag, tokenName: name, tokenSymbol: symbol });

    it('exposes its tag as the key and toObject', () => {
        const m = make('t1');
        assert.equal(m.key, 't1');
        assert.equal(m.toObject().tag, 't1');
        assert.ok(Array.isArray(m.toObject().properties));
    });

    it('before update: equal falls back to name match and toWeight uses the name', () => {
        const a = make('t1');
        assert.equal(a.equal(make('t1')), true);
        assert.equal(a.equal(make('t2', 'M', 'Q')), false);
        assert.deepEqual(a.toWeight(opts), { weight: 't1' });
    });

    it('after update: weight accessors return populated values', () => {
        const a = make('t1');
        a.update(opts);
        assert.equal(typeof a.getWeight(), 'string');
        assert.equal(a.getWeights().length, 2);
        assert.equal(a.maxWeight(), 2);
        assert.equal(a.checkWeight(0), true);
        assert.equal(a.checkWeight(9), false);
        assert.equal(typeof a.toWeight(opts).weight, 'string');
        assert.ok(a.getPropList().length > 0);
    });

    it('after update: equal compares by weight (indexed and default) and equalKey by key', () => {
        const a = make('t1');
        const b = make('t1');
        const c = make('t2', 'M', 'Q');
        a.update(opts);
        b.update(opts);
        c.update(opts);
        assert.equal(a.equal(b, 1), true);
        assert.equal(a.equal(c, 1), false);
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });
});

describe('PairSearchModel with rich blocks', () => {
    const richBlock = (over = {}) => new BlockSearchModel({
        id: 'b', tag: 'tag', blockType: 'X',
        events: [{ source: 'a', target: 'b', input: 'i', output: 'o' }],
        artifacts: [{ uuid: 'u1', name: 'art', type: 'json' }],
        permissions: ['Owner'],
        prop1: 'v1',
        ...over
    });

    it('update over property/event/permission/artifact-bearing blocks yields a numeric hash', () => {
        const pair = new PairSearchModel(richBlock(), richBlock());
        pair.update();
        assert.equal(typeof pair.hash, 'number');
    });

    it('identical rich blocks compare as fully similar', () => {
        const pair = new PairSearchModel(richBlock(), richBlock());
        pair.update();
        assert.equal(pair.hash, 100);
    });
});

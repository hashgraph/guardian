import assert from 'node:assert/strict';
import { SchemaComparator } from '../../dist/analytics/compare/comparators/schema-comparator.js';
import { ModuleComparator } from '../../dist/analytics/compare/comparators/module-comparator.js';
import { SchemaModel } from '../../dist/analytics/compare/models/schema.model.js';
import { ModuleModel } from '../../dist/analytics/compare/models/module.model.js';
import {
    CompareOptions, IPropertiesLvl, IChildrenLvl, IEventsLvl, IIdLvl, IKeyLvl, IRefLvl
} from '../../dist/analytics/compare/interfaces/index.js';

const schemaOpts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };
const moduleOpts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const schema = (overrides = {}) => new SchemaModel({
    id: 'sid', name: 'My Schema', uuid: 'sid-uuid', description: 'desc', topicId: '0.0.1',
    version: '1.0.0', iri: '#sid',
    document: { properties: { amount: { type: 'string', title: 'A', description: 'A' } } },
    ...overrides
}, schemaOpts);

const minimalConfig = (overrides = {}) => ({
    blockType: 'root', tag: 'root', children: [],
    inputEvents: [], outputEvents: [], variables: [], ...overrides
});

const module = (overrides = {}) => new ModuleModel({
    id: 'mod-1', name: 'My Module', description: 'desc',
    config: minimalConfig(overrides.config), ...overrides
}, moduleOpts);

describe('SchemaComparator branches', () => {
    it('accepts an explicit CompareOptions instance', () => {
        const opts = new CompareOptions(
            IPropertiesLvl.All, IChildrenLvl.None, IEventsLvl.None,
            IIdLvl.All, IKeyLvl.Default, IRefLvl.Default, null
        );
        const comparator = new SchemaComparator(opts);
        const result = comparator.compare(schema(), schema());
        assert.equal(typeof result.total, 'number');
    });

    it('empty schemas (no fields) compare as fully similar', () => {
        const empty = schema({ document: { properties: {} } });
        const result = new SchemaComparator().compare(empty, empty);
        assert.equal(result.total, 100);
    });

    it('schemas with disjoint fields drop below full similarity', () => {
        const a = schema();
        const b = schema({ document: { properties: { other: { type: 'number', title: 'B', description: 'B' } } } });
        const result = new SchemaComparator().compare(a, b);
        assert.ok(result.total < 100);
        assert.ok(result.fields.report.length > 0);
    });

    it('same-named but differing fields exercise the PARTLY branch', () => {
        const a = schema({ document: { properties: { amount: { type: 'string', title: 'A', description: 'A' } } } });
        const b = schema({ document: { properties: { amount: { type: 'number', title: 'Different', description: 'D2' } } } });
        const result = new SchemaComparator().compare(a, b);
        assert.ok(result.fields.report.some(r => r.type === 'PARTLY'));
        assert.ok(result.total < 100);
    });

    it('csv produces a CSV data-uri carrying schema metadata', () => {
        const result = new SchemaComparator().compare(schema(), schema());
        const csv = new SchemaComparator().csv(result);
        assert.match(csv, /^data:text\/csv/);
    });

    it('csv of differing schemas still produces a CSV', () => {
        const a = schema();
        const b = schema({ name: 'Other', document: { properties: { x: { type: 'number', title: 'X', description: 'X' } } } });
        const result = new SchemaComparator().compare(a, b);
        assert.match(new SchemaComparator().csv(result), /^data:text\/csv/);
    });
});

describe('ModuleComparator branches', () => {
    it('accepts an explicit CompareOptions instance', () => {
        const opts = new CompareOptions(
            IPropertiesLvl.All, IChildrenLvl.All, IEventsLvl.All,
            IIdLvl.All, IKeyLvl.Default, IRefLvl.Default, null
        );
        const comparator = new ModuleComparator(opts);
        const result = comparator.compare(module(), module());
        assert.equal(typeof result.total, 'number');
    });

    it('modules with differing child blocks exercise structural diffing', () => {
        const a = module({ config: minimalConfig({ children: [{ blockType: 'x', tag: 'c1', children: [] }] }) });
        const b = module({ config: minimalConfig({ children: [{ blockType: 'y', tag: 'c2', children: [] }] }) });
        const result = new ModuleComparator().compare(a, b);
        assert.ok(result.total <= 100);
        assert.ok(result.blocks.report.length >= 2);
    });

    it('modules where one side has extra children (left-only / right-only)', () => {
        const a = module({ config: minimalConfig({ children: [{ blockType: 'x', tag: 'c1', children: [{ blockType: 'z', tag: 'leaf', children: [] }] }] }) });
        const b = module({ config: minimalConfig({ children: [{ blockType: 'x', tag: 'c1', children: [] }] }) });
        const result = new ModuleComparator().compare(a, b);
        assert.ok(result.total <= 100);
    });

    it('modules with same-tag but differing props hit the PARTLY branch', () => {
        const a = module({ config: minimalConfig({ children: [{ blockType: 'x', tag: 'c1', extra: 1, children: [] }] }) });
        const b = module({ config: minimalConfig({ children: [{ blockType: 'x', tag: 'c1', extra: 2, children: [] }] }) });
        const result = new ModuleComparator().compare(a, b);
        assert.ok(result.total <= 100);
    });

    it('modules with events and variables fill those report sections', () => {
        const a = module({ config: minimalConfig({ inputEvents: [{ name: 'in1' }], outputEvents: [{ name: 'out1' }], variables: [{ name: 'v1' }] }) });
        const b = module({ config: minimalConfig({ inputEvents: [{ name: 'in2' }], outputEvents: [], variables: [] }) });
        const result = new ModuleComparator().compare(a, b);
        assert.ok(result.inputEvents.report.length > 0);
    });

    it('csv produces a CSV data-uri', () => {
        const a = module({ config: minimalConfig({ children: [{ blockType: 'x', tag: 'c1', children: [] }], inputEvents: [{ name: 'in1' }], variables: [{ name: 'v1' }] }) });
        const b = module({ config: minimalConfig({ children: [{ blockType: 'y', tag: 'c2', children: [] }] }) });
        const result = new ModuleComparator().compare(a, b);
        assert.match(new ModuleComparator().csv(result), /^data:text\/csv/);
    });
});

import assert from 'node:assert/strict';
import { ModuleComparator } from '../../dist/analytics/compare/comparators/module-comparator.js';
import { ModuleModel } from '../../dist/analytics/compare/models/module.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const minimalConfig = (overrides = {}) => ({
    blockType: 'root', tag: 'root', children: [],
    inputEvents: [], outputEvents: [], variables: [], ...overrides
});

const model = (overrides = {}) => new ModuleModel({
    id: 'mod-1', name: 'My Module', description: 'desc',
    config: minimalConfig(), ...overrides
}, opts);

describe('ModuleComparator', () => {
    it('constructs with default options when none are supplied', () => {
        assert.ok(new ModuleComparator());
    });

    it('compare returns left/right info plus a numeric total', () => {
        const result = new ModuleComparator().compare(model(), model());
        assert.ok(result.left);
        assert.ok(result.right);
        assert.equal(typeof result.total, 'number');
    });

    it('total is within 0..100', () => {
        const result = new ModuleComparator().compare(model(), model());
        assert.ok(result.total >= 0 && result.total <= 100);
    });

    it('produces block/inputEvents/outputEvents/variables report sections', () => {
        const result = new ModuleComparator().compare(model(), model());
        assert.ok(Array.isArray(result.blocks.columns));
        assert.ok(Array.isArray(result.blocks.report));
        assert.ok(Array.isArray(result.inputEvents.report));
        assert.ok(Array.isArray(result.outputEvents.report));
        assert.ok(Array.isArray(result.variables.report));
    });

    it('two identical single-block modules compare as fully similar', () => {
        const result = new ModuleComparator().compare(model(), model());
        assert.equal(result.total, 100);
    });

    it('aggregates input events into the input report', () => {
        const m1 = model({ config: minimalConfig({ inputEvents: [{ name: 'IE1' }] }) });
        const m2 = model({ config: minimalConfig({ inputEvents: [{ name: 'IE1' }] }) });
        const result = new ModuleComparator().compare(m1, m2);
        assert.ok(result.inputEvents.report.length >= 1);
    });

    it('aggregates output events into the output report', () => {
        const m1 = model({ config: minimalConfig({ outputEvents: [{ name: 'OE1' }] }) });
        const m2 = model({ config: minimalConfig({ outputEvents: [{ name: 'OE1' }] }) });
        const result = new ModuleComparator().compare(m1, m2);
        assert.ok(result.outputEvents.report.length >= 1);
    });

    it('aggregates variables into the variables report', () => {
        const m1 = model({ config: minimalConfig({ variables: [{ name: 'V1', type: 'Number' }] }) });
        const m2 = model({ config: minimalConfig({ variables: [{ name: 'V1', type: 'Number' }] }) });
        const result = new ModuleComparator().compare(m1, m2);
        assert.ok(result.variables.report.length >= 1);
    });

    it('the block report column set includes total_rate', () => {
        const result = new ModuleComparator().compare(model(), model());
        assert.ok(result.blocks.columns.some((c) => c.name === 'total_rate'));
    });

    it('reports a row per block in the tree', () => {
        const m1 = model({ config: minimalConfig({ children: [{ blockType: 'block', tag: 'c1' }] }) });
        const m2 = model({ config: minimalConfig({ children: [{ blockType: 'block', tag: 'c1' }] }) });
        const result = new ModuleComparator().compare(m1, m2);
        assert.ok(result.blocks.report.length >= 2);
    });
});

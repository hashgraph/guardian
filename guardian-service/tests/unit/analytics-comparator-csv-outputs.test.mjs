import assert from 'node:assert/strict';
import { ModuleComparator } from '../../dist/analytics/compare/comparators/module-comparator.js';
import { ToolComparator } from '../../dist/analytics/compare/comparators/tool-comparator.js';
import { PolicyComparator } from '../../dist/analytics/compare/comparators/policy-comparator.js';
import { ModuleModel } from '../../dist/analytics/compare/models/module.model.js';
import { ToolModel } from '../../dist/analytics/compare/models/tool.model.js';
import { PolicyModel } from '../../dist/analytics/compare/models/policy.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const moduleModel = (over = {}) => new ModuleModel({
    id: 'mod-1', name: 'My Module', description: 'desc',
    config: { blockType: 'root', tag: 'root', children: [], inputEvents: [], outputEvents: [], variables: [] },
    ...over
}, opts);

const toolModel = (over = {}) => new ToolModel({
    id: 't-1', name: 'Tool', description: 'desc', hash: 'h-1', messageId: 'm-1',
    config: { blockType: 'tool', tag: 'tool-root', children: [], inputEvents: [], outputEvents: [], variables: [] },
    ...over
}, opts);

const policyModel = (over = {}) => new PolicyModel({
    id: 'p-1', name: 'Policy', description: 'desc', version: '1.0.0',
    policyRoles: [], policyGroups: [], policyTopics: [], policyTokens: [], policyTools: [],
    config: { blockType: 'root', tag: 'root', children: [], permissions: [] },
    ...over
}, opts);

describe('ModuleComparator.csv', () => {
    it('produces a CSV data-uri from a compare result', () => {
        const result = new ModuleComparator().compare(moduleModel(), moduleModel());
        const csv = new ModuleComparator().csv(result);
        assert.match(csv, /^data:text\/csv/);
    });

    it('includes the Module 1 and Module 2 section headers', () => {
        const result = new ModuleComparator().compare(moduleModel(), moduleModel());
        const csv = new ModuleComparator().csv(result);
        assert.ok(csv.includes('Module 1'));
        assert.ok(csv.includes('Module 2'));
    });

    it('includes the Total row', () => {
        const result = new ModuleComparator().compare(moduleModel(), moduleModel());
        const csv = new ModuleComparator().csv(result);
        assert.ok(csv.includes('Total'));
    });

    it('includes the block and events sections', () => {
        const result = new ModuleComparator().compare(moduleModel(), moduleModel());
        const csv = new ModuleComparator().csv(result);
        assert.ok(csv.includes('Module Blocks'));
        assert.ok(csv.includes('Module Input Events'));
        assert.ok(csv.includes('Module Output Events'));
        assert.ok(csv.includes('Module Variables'));
    });
});

describe('ToolComparator.tableToCsv', () => {
    it('produces a CSV data-uri', () => {
        const results = new ToolComparator().compare([toolModel(), toolModel()]);
        assert.match(ToolComparator.tableToCsv(results), /^data:text\/csv/);
    });

    it('includes Tool section headers and Total', () => {
        const results = new ToolComparator().compare([toolModel(), toolModel()]);
        const csv = ToolComparator.tableToCsv(results);
        assert.ok(csv.includes('Tool 1'));
        assert.ok(csv.includes('Tool Blocks'));
        assert.ok(csv.includes('Total'));
    });

    it('renders the additional tool header for three tools', () => {
        const results = new ToolComparator().compare([toolModel(), toolModel(), toolModel()]);
        const csv = ToolComparator.tableToCsv(results);
        assert.ok(csv.includes('Tool 2'));
        assert.ok(csv.includes('Tool 3'));
    });
});

describe('ToolComparator.mergeCompareResults', () => {
    it('aggregates multiple compare results into a single object', () => {
        const results = new ToolComparator().compare([toolModel(), toolModel(), toolModel()]);
        const merged = ToolComparator.mergeCompareResults(results);
        assert.ok(merged);
        assert.ok(Array.isArray(merged.blocks.report));
    });
});

describe('PolicyComparator.to', () => {
    it('returns the single result object for csv=false and one result', () => {
        const comparator = new PolicyComparator();
        const results = comparator.compare([policyModel(), policyModel()]);
        const out = comparator.to(results, 'object');
        assert.equal(out, results[0]);
    });

    it('returns a CSV data-uri for type csv with one result', () => {
        const comparator = new PolicyComparator();
        const results = comparator.compare([policyModel(), policyModel()]);
        assert.match(comparator.to(results, 'csv'), /^data:text\/csv/);
    });

    it('returns a CSV data-uri for type csv with multiple results', () => {
        const comparator = new PolicyComparator();
        const results = comparator.compare([policyModel(), policyModel(), policyModel()]);
        assert.match(comparator.to(results, 'csv'), /^data:text\/csv/);
    });

    it('merges results for non-csv type with multiple results', () => {
        const comparator = new PolicyComparator();
        const results = comparator.compare([policyModel(), policyModel(), policyModel()]);
        const out = comparator.to(results, 'object');
        assert.ok(Array.isArray(out.blocks.report));
    });

    it('throws on an empty results array', () => {
        const comparator = new PolicyComparator();
        assert.throws(() => comparator.to([], 'csv'), /Invalid size/);
    });
});

import assert from 'node:assert/strict';
import { DocumentComparator } from '../../dist/analytics/compare/comparators/document-comparator.js';
import { PolicyComparator } from '../../dist/analytics/compare/comparators/policy-comparator.js';
import { ToolComparator } from '../../dist/analytics/compare/comparators/tool-comparator.js';
import { VcDocumentModel } from '../../dist/analytics/compare/models/document.model.js';
import { PolicyModel } from '../../dist/analytics/compare/models/policy.model.js';
import { ToolModel } from '../../dist/analytics/compare/models/tool.model.js';

const docOpts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All', childLvl: 'All' };
const polOpts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const vcDoc = (overrides = {}) => new VcDocumentModel({
    id: 'doc-1', schema: 'schema-A', messageId: 'm-1', topicId: '0.0.1',
    owner: 'did:owner', policyId: 'p-1',
    document: { '@context': ['https://x'], type: 'VerifiableCredential', credentialSubject: { type: 'Sub', amount: 5 } },
    option: { tag: 'submit' }, relationships: [], ...overrides
}, docOpts);

const richPolicy = (overrides = {}) => new PolicyModel({
    id: 'p-1', name: 'Policy', description: 'desc', instanceTopicId: '0.0.1', version: '1.0.0',
    config: { blockType: 'root', tag: 'root', children: [{ blockType: 'x', tag: 'c1', children: [] }] },
    policyRoles: ['Owner', 'User'],
    policyGroups: [{ name: 'g1' }],
    policyTopics: [{ name: 't1', description: 'x' }],
    policyTokens: [{ tokenId: '0.0.99' }],
    tools: [], ...overrides
}, polOpts);

const richTool = (overrides = {}) => new ToolModel({
    id: 't-1', name: 'Tool', description: 'desc', hash: 'h-1', messageId: 'm-1',
    config: {
        blockType: 'tool', tag: 'tool-root',
        children: [{ blockType: 'x', tag: 'c1', children: [] }],
        inputEvents: [{ name: 'in1' }], outputEvents: [{ name: 'out1' }], variables: [{ name: 'v1' }]
    }, ...overrides
}, polOpts);

describe('DocumentComparator merge', () => {
    it('mergeCompareResults aggregates multiple document comparisons', () => {
        const comparator = new DocumentComparator();
        const results = comparator.compare([vcDoc(), vcDoc(), vcDoc()]);
        const merged = comparator.mergeCompareResults(results);
        assert.equal(merged.size, 3);
        assert.equal(merged.rights.length, 2);
        assert.equal(merged.totals.length, 2);
        assert.ok(Array.isArray(merged.documents.columns));
        assert.ok(Array.isArray(merged.documents.report));
    });

    it('merged document rows carry merged documents/options sub-rates', () => {
        const comparator = new DocumentComparator();
        const merged = comparator.mergeCompareResults(comparator.compare([vcDoc(), vcDoc()]));
        const row = merged.documents.report[0];
        assert.ok('documents' in row);
        assert.ok('options' in row);
    });

    it('a relationship present on one side only yields a single-sided row', () => {
        const child = vcDoc({ id: 'child' });
        const left = vcDoc({ id: 'left' });
        left.setRelationships([child]);
        const right = vcDoc({ id: 'right' });
        const [result] = new DocumentComparator().compare([left, right]);
        const types = result.documents.report.map(r => r.type);
        assert.ok(result.documents.report.length >= 2);
        assert.ok(types.includes('LEFT') || types.includes('RIGHT'));
    });

    it('differing documents still compare and produce a numeric total', () => {
        const a = vcDoc({ document: { '@context': ['https://x'], type: 'VerifiableCredential', credentialSubject: { type: 'Sub', amount: 5, extra: 1 } } });
        const b = vcDoc({ document: { '@context': ['https://x'], type: 'VerifiableCredential', credentialSubject: { type: 'Sub', amount: 9 } } });
        const [result] = new DocumentComparator().compare([a, b]);
        assert.equal(typeof result.total, 'number');
        assert.ok(result.total <= 100);
    });
});

describe('PolicyComparator rich merge and csv', () => {
    it('rich policies produce non-empty role/group/topic/token reports', () => {
        const [result] = new PolicyComparator().compare([richPolicy(), richPolicy()]);
        assert.ok(result.roles.report.length > 0);
        assert.ok(result.groups.report.length > 0);
        assert.ok(result.topics.report.length > 0);
        assert.ok(result.tokens.report.length > 0);
    });

    it('mergeCompareResults of rich policies fills every section', () => {
        const comparator = new PolicyComparator();
        const a = richPolicy();
        const b = richPolicy({
            config: { blockType: 'root', tag: 'root', children: [{ blockType: 'y', tag: 'c2', children: [] }] },
            policyRoles: ['Admin']
        });
        const results = comparator.compare([a, b, richPolicy()]);
        const merged = comparator.mergeCompareResults(results);
        assert.equal(merged.size, 3);
        for (const key of ['blocks', 'roles', 'groups', 'topics', 'tokens', 'tools']) {
            assert.ok(merged[key], `missing ${key}`);
            assert.ok(Array.isArray(merged[key].report), `${key} report not array`);
        }
    });

    it('structurally different policies yield total <= 100', () => {
        const a = richPolicy();
        const b = richPolicy({
            config: { blockType: 'root', tag: 'root', children: [{ blockType: 'y', tag: 'c2', children: [] }] },
            policyRoles: ['Admin']
        });
        const [result] = new PolicyComparator().compare([a, b]);
        assert.ok(result.total <= 100);
    });

    it('tableToCsv of rich policies produces a CSV data-uri', () => {
        const comparator = new PolicyComparator();
        const results = comparator.compare([richPolicy(), richPolicy()]);
        assert.match(comparator.tableToCsv(results), /^data:text\/csv/);
    });
});

describe('ToolComparator rich merge and csv', () => {
    it('rich tools produce non-empty input/output/variable reports', () => {
        const [result] = new ToolComparator().compare([richTool(), richTool()]);
        assert.ok(result.inputEvents.report.length > 0);
        assert.ok(result.outputEvents.report.length > 0);
        assert.ok(result.variables.report.length > 0);
    });

    it('mergeCompareResults of rich tools fills every section', () => {
        const a = richTool();
        const b = richTool({
            config: {
                blockType: 'tool', tag: 'tool-root',
                children: [{ blockType: 'y', tag: 'c2', children: [] }],
                inputEvents: [{ name: 'in2' }], outputEvents: [], variables: []
            }
        });
        const results = new ToolComparator().compare([a, b, richTool()]);
        const merged = ToolComparator.mergeCompareResults(results);
        assert.equal(merged.size, 3);
        for (const key of ['blocks', 'inputEvents', 'outputEvents', 'variables']) {
            assert.ok(merged[key], `missing ${key}`);
            assert.ok(Array.isArray(merged[key].report), `${key} report not array`);
        }
    });

    it('tableToCsv of rich tools produces a CSV data-uri', () => {
        const results = new ToolComparator().compare([richTool(), richTool()]);
        assert.match(ToolComparator.tableToCsv(results), /^data:text\/csv/);
    });

    it('structurally different tools yield total <= 100', () => {
        const a = richTool();
        const b = richTool({
            config: {
                blockType: 'tool', tag: 'tool-root',
                children: [{ blockType: 'y', tag: 'c2', children: [] }],
                inputEvents: [], outputEvents: [], variables: []
            }
        });
        const [result] = new ToolComparator().compare([a, b]);
        assert.ok(result.total <= 100);
    });
});

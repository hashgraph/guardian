import assert from 'node:assert/strict';
import { DocumentComparator } from '../../dist/analytics/compare/comparators/document-comparator.js';
import { PolicyComparator } from '../../dist/analytics/compare/comparators/policy-comparator.js';
import { VcDocumentModel } from '../../dist/analytics/compare/models/document.model.js';
import { PolicyModel } from '../../dist/analytics/compare/models/policy.model.js';

const docOpts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All', childLvl: 'All' };
const polOpts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All' };

const vcDoc = (overrides = {}) => new VcDocumentModel({
    id: 'doc-1', schema: 'schema-A', messageId: 'm-1', topicId: '0.0.1',
    owner: 'did:owner', policyId: 'p-1',
    document: { '@context': ['https://x'], type: 'VerifiableCredential', credentialSubject: { type: 'Sub', amount: 5 } },
    option: { tag: 'submit' }, relationships: [], ...overrides
}, docOpts);

const policy = (overrides = {}) => new PolicyModel({
    id: 'p-1', name: 'Policy', description: 'desc', instanceTopicId: '0.0.1', version: '1.0.0',
    config: { blockType: 'root', tag: 'root', children: [] },
    policyRoles: [], policyGroups: [], policyTopics: [], policyTokens: [], tools: [], ...overrides
}, polOpts);

describe('DocumentComparator', () => {
    it('constructs with default options', () => {
        assert.ok(new DocumentComparator());
    });

    it('compare returns one result per right-hand document', () => {
        const results = new DocumentComparator().compare([vcDoc(), vcDoc(), vcDoc()]);
        assert.equal(results.length, 2);
    });

    it('compare of a single document yields no comparisons', () => {
        assert.deepEqual(new DocumentComparator().compare([vcDoc()]), []);
    });

    it('a comparison result exposes left/right info and a numeric total', () => {
        const [result] = new DocumentComparator().compare([vcDoc(), vcDoc()]);
        assert.ok(result.left);
        assert.ok(result.right);
        assert.equal(typeof result.total, 'number');
    });

    it('two identical documents compare as fully similar', () => {
        const [result] = new DocumentComparator().compare([vcDoc(), vcDoc()]);
        assert.equal(result.total, 100);
    });

    it('a comparison result carries a documents report', () => {
        const [result] = new DocumentComparator().compare([vcDoc(), vcDoc()]);
        assert.ok(result.documents);
    });

    it('tableToCsv produces a CSV data-uri', () => {
        const results = new DocumentComparator().compare([vcDoc(), vcDoc()]);
        const csv = DocumentComparator.tableToCsv(results);
        assert.match(csv, /^data:text\/csv/);
    });
});

describe('PolicyComparator', () => {
    it('constructs with default options', () => {
        assert.ok(new PolicyComparator());
    });

    it('compare returns one result per right-hand policy', () => {
        const results = new PolicyComparator().compare([policy(), policy(), policy()]);
        assert.equal(results.length, 2);
    });

    it('compare of a single policy yields no comparisons', () => {
        assert.deepEqual(new PolicyComparator().compare([policy()]), []);
    });

    it('a result exposes left/right info and a numeric total', () => {
        const [result] = new PolicyComparator().compare([policy(), policy()]);
        assert.ok(result.left);
        assert.ok(result.right);
        assert.equal(typeof result.total, 'number');
    });

    it('two identical policies compare as fully similar', () => {
        const [result] = new PolicyComparator().compare([policy(), policy()]);
        assert.equal(result.total, 100);
    });

    it('a result carries blocks/roles/groups/topics/tokens/tools sections', () => {
        const [result] = new PolicyComparator().compare([policy(), policy()]);
        for (const key of ['blocks', 'roles', 'groups', 'topics', 'tokens', 'tools']) {
            assert.ok(result[key], `missing ${key}`);
        }
    });

    it('mergeCompareResults aggregates multiple results', () => {
        const comparator = new PolicyComparator();
        const results = comparator.compare([policy(), policy(), policy()]);
        const merged = comparator.mergeCompareResults(results);
        assert.ok(merged);
    });

    it('tableToCsv produces a CSV data-uri', () => {
        const comparator = new PolicyComparator();
        const results = comparator.compare([policy(), policy()]);
        assert.match(comparator.tableToCsv(results), /^data:text\/csv/);
    });
});

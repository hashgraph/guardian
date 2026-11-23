import assert from 'node:assert/strict';
import { getPolicyDocumentationIssues, PolicyDocumentationIssueCode } from '../dist/helpers/policy-documentation-helper.js';

const config = {
    blockType: 'interfaceContainerBlock',
    tag: 'root',
    children: [
        { blockType: 'requestVcDocumentBlock', tag: 'create_report', children: [] },
        { blockType: 'interfaceContainerBlock', tag: 'nested', children: [{ blockType: 'interfaceDocumentsSourceBlock', tag: 'reports' }] },
    ],
};
const entry = (o = {}) => ({ name: 'n', description: '', target: 'create_report', method: 'POST', alias: 'create', url: '', dmrvUrl: '', ...o });

describe('getPolicyDocumentationIssues', () => {
    it('returns nothing for valid entries, including blocks nested deeper', () => {
        assert.deepEqual(getPolicyDocumentationIssues(config, [entry(), entry({ target: 'reports', alias: 'list', method: 'GET' })]), []);
    });

    it('returns nothing when entries are missing', () => {
        assert.deepEqual(getPolicyDocumentationIssues(config, undefined), []);
    });

    it('reports an alias whose block was removed', () => {
        const issues = getPolicyDocumentationIssues(config, [entry({ target: 'gone', alias: 'monitoring/create' })]);
        assert.equal(issues.length, 1);
        assert.equal(issues[0].code, PolicyDocumentationIssueCode.TARGET_NOT_FOUND);
        assert.equal(issues[0].index, 0);
        assert.match(issues[0].message, /monitoring\/create/);
    });

    it('reports a block whose type changed', () => {
        const issues = getPolicyDocumentationIssues(config, [entry({ blockType: 'interfaceDocumentsSourceBlock' })]);
        assert.deepEqual(issues.map((i) => i.code), [PolicyDocumentationIssueCode.BLOCK_TYPE_CHANGED]);
    });

    it('reports duplicate alias for overlapping methods only', () => {
        assert.deepEqual(
            getPolicyDocumentationIssues(config, [entry(), entry({ target: 'reports' })]).map((i) => i.code),
            [PolicyDocumentationIssueCode.DUPLICATE_ALIAS]
        );
        assert.deepEqual(
            getPolicyDocumentationIssues(config, [entry({ method: 'GET' }), entry({ method: 'POST' })]),
            []
        );
        assert.equal(getPolicyDocumentationIssues(config, [entry({ method: 'Both' }), entry({ method: 'GET' })]).length, 1);
    });

    it('reports an unsupported method', () => {
        assert.deepEqual(
            getPolicyDocumentationIssues(config, [entry({ method: 'PUT' })]).map((i) => i.code),
            [PolicyDocumentationIssueCode.INVALID_METHOD]
        );
    });
});

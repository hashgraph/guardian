import assert from 'node:assert/strict';
import { PolicyImportExport } from '../../dist/import-export/policy.js';

// API documentation is off-chain gateway metadata editable after publish, so it must not change the policy hash.
const components = (policyDocumentation) => ({
    policy: {
        id: 'p-1',
        name: 'Test Policy',
        uuid: 'uuid-1',
        policyTag: 'Tag_1',
        topicId: '0.0.1',
        version: '1.0.0',
        config: { blockType: 'interfaceContainerBlock', children: [] },
        policyDocumentation,
    },
    schemas: [],
    tokens: [],
    tools: [],
    artifacts: [],
    systemSchemas: [],
    tags: [],
    tests: [],
    formulas: [],
});

describe('policy hash and API documentation', () => {
    it('ignores policyDocumentation', () => {
        const entries = [{ name: 'n', target: 't', method: 'POST', alias: 'create', url: '/a', dmrvUrl: '/b' }];
        assert.equal(
            PolicyImportExport.getPolicyHash(components(entries)),
            PolicyImportExport.getPolicyHash(components(undefined))
        );
        assert.equal(
            PolicyImportExport.getPolicyHash(components(entries)),
            PolicyImportExport.getPolicyHash(components([]))
        );
    });
});

import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    CompareFileDTO,
    FilterPolicyDTO,
    FilterPoliciesDTO,
    FilterSchemaDTO,
    CompareSchemasByIdsRequestDTO,
    CompareSchemasByListRequestDTO,
    FilterModulesDTO,
    CompareDocumentsByIdsRequestDTO,
    CompareDocumentsByListRequestDTO,
    CompareToolsByListRequestDTO,
    FilterSearchPoliciesDTO,
    FilterSearchBlocksDTO,
    SearchPoliciesDTO,
} from '../../dist/middlewares/validation/schemas/analytics.dto.js';

describe('CompareFileDTO', () => {
    it('accepts a valid file', () => {
        assert.equal(isClean(errorsFor(CompareFileDTO, { id: 'a', name: 'File', value: 'base64' })), true);
    });

    it('requires value', () => {
        assert.equal(hasConstraint(errorsFor(CompareFileDTO, { id: 'a', name: 'File' }), 'value', 'isString'), true);
    });

    it('requires name', () => {
        assert.equal(hasError(errorsFor(CompareFileDTO, { id: 'a', value: 'v' }), 'name'), true);
    });
});

describe('FilterPolicyDTO', () => {
    it('accepts an id filter', () => {
        assert.equal(isClean(errorsFor(FilterPolicyDTO, { type: 'id', value: 'abc' })), true);
    });

    it('requires type', () => {
        assert.equal(hasConstraint(errorsFor(FilterPolicyDTO, { value: 'abc' }), 'type', 'isString'), true);
    });
});

describe('FilterPoliciesDTO', () => {
    it('accepts an empty filter', () => {
        assert.equal(isClean(errorsFor(FilterPoliciesDTO, {})), true);
    });

    it('accepts string level options', () => {
        assert.equal(isClean(errorsFor(FilterPoliciesDTO, { idLvl: '1', eventsLvl: 1, propLvl: '2', childrenLvl: 0 })), true);
    });

    it('rejects a boolean idLvl', () => {
        assert.equal(hasError(errorsFor(FilterPoliciesDTO, { idLvl: true }), 'idLvl'), true);
    });

    it('rejects a non-array policyIds', () => {
        assert.equal(hasConstraint(errorsFor(FilterPoliciesDTO, { policyIds: 'x' }), 'policyIds', 'isArray'), true);
    });

    it('rejects a non-string policyId1', () => {
        assert.equal(hasConstraint(errorsFor(FilterPoliciesDTO, { policyId1: 5 }), 'policyId1', 'isString'), true);
    });
});

describe('FilterSchemaDTO', () => {
    it('accepts a schema id filter', () => {
        assert.equal(isClean(errorsFor(FilterSchemaDTO, { type: 'id', value: 'abc' })), true);
    });

    it('accepts a policy as string', () => {
        assert.equal(isClean(errorsFor(FilterSchemaDTO, { type: 'policy-message', value: 'abc', policy: 'msg' })), true);
    });

    it('accepts a policy as object', () => {
        assert.equal(isClean(errorsFor(FilterSchemaDTO, { type: 'policy-file', value: 'abc', policy: { id: '1' } })), true);
    });

    it('rejects a numeric policy', () => {
        assert.equal(hasError(errorsFor(FilterSchemaDTO, { type: 'id', value: 'abc', policy: 5 }), 'policy'), true);
    });
});

describe('CompareSchemasByIdsRequestDTO', () => {
    it('accepts two schema ids', () => {
        assert.equal(isClean(errorsFor(CompareSchemasByIdsRequestDTO, { schemaId1: 'a', schemaId2: 'b' })), true);
    });

    it('accepts a numeric idLvl', () => {
        assert.equal(isClean(errorsFor(CompareSchemasByIdsRequestDTO, { schemaId1: 'a', schemaId2: 'b', idLvl: 0 })), true);
    });

    it('requires schemaId2', () => {
        assert.equal(hasConstraint(errorsFor(CompareSchemasByIdsRequestDTO, { schemaId1: 'a' }), 'schemaId2', 'isString'), true);
    });
});

describe('CompareSchemasByListRequestDTO', () => {
    it('accepts a schemas array', () => {
        assert.equal(isClean(errorsFor(CompareSchemasByListRequestDTO, { schemas: [] })), true);
    });

    it('rejects a non-array schemas', () => {
        assert.equal(hasConstraint(errorsFor(CompareSchemasByListRequestDTO, { schemas: 'x' }), 'schemas', 'isArray'), true);
    });
});

describe('FilterModulesDTO', () => {
    it('accepts two module ids', () => {
        assert.equal(isClean(errorsFor(FilterModulesDTO, { moduleId1: 'a', moduleId2: 'b' })), true);
    });

    it('requires moduleId1', () => {
        assert.equal(hasConstraint(errorsFor(FilterModulesDTO, { moduleId2: 'b' }), 'moduleId1', 'isString'), true);
    });
});

describe('CompareDocumentsByIdsRequestDTO', () => {
    it('accepts two document ids', () => {
        assert.equal(isClean(errorsFor(CompareDocumentsByIdsRequestDTO, { documentId1: 'a', documentId2: 'b' })), true);
    });

    it('requires documentId2', () => {
        assert.equal(hasConstraint(errorsFor(CompareDocumentsByIdsRequestDTO, { documentId1: 'a' }), 'documentId2', 'isString'), true);
    });
});

describe('CompareDocumentsByListRequestDTO', () => {
    it('accepts at least two document ids', () => {
        assert.equal(isClean(errorsFor(CompareDocumentsByListRequestDTO, { documentIds: ['a', 'b'] })), true);
    });

    it('rejects a single document id', () => {
        assert.equal(hasConstraint(errorsFor(CompareDocumentsByListRequestDTO, { documentIds: ['a'] }), 'documentIds', 'arrayMinSize'), true);
    });

    it('rejects a non-array documentIds', () => {
        assert.equal(hasConstraint(errorsFor(CompareDocumentsByListRequestDTO, { documentIds: 'a' }), 'documentIds', 'isArray'), true);
    });
});

describe('CompareToolsByListRequestDTO', () => {
    it('accepts at least two tool ids', () => {
        assert.equal(isClean(errorsFor(CompareToolsByListRequestDTO, { toolIds: ['a', 'b', 'c'] })), true);
    });

    it('rejects a single tool id', () => {
        assert.equal(hasConstraint(errorsFor(CompareToolsByListRequestDTO, { toolIds: ['a'] }), 'toolIds', 'arrayMinSize'), true);
    });
});

describe('FilterSearchPoliciesDTO', () => {
    it('accepts an empty filter', () => {
        assert.equal(isClean(errorsFor(FilterSearchPoliciesDTO, {})), true);
    });

    it('accepts numeric thresholds', () => {
        const errs = errorsFor(FilterSearchPoliciesDTO, { minVcCount: 1, minVpCount: 2, minTokensCount: 3, threshold: 50 });
        assert.equal(isClean(errs), true);
    });

    it('rejects a string minVcCount', () => {
        assert.equal(hasConstraint(errorsFor(FilterSearchPoliciesDTO, { minVcCount: '1' }), 'minVcCount', 'isNumber'), true);
    });

    it('rejects a non-string text', () => {
        assert.equal(hasConstraint(errorsFor(FilterSearchPoliciesDTO, { text: 5 }), 'text', 'isString'), true);
    });

    it('rejects a non-array toolMessageIds', () => {
        assert.equal(hasConstraint(errorsFor(FilterSearchPoliciesDTO, { toolMessageIds: 'x' }), 'toolMessageIds', 'isArray'), true);
    });
});

describe('FilterSearchBlocksDTO', () => {
    it('accepts a valid search', () => {
        assert.equal(isClean(errorsFor(FilterSearchBlocksDTO, { id: 'a', config: {} })), true);
    });

    it('rejects a non-object config', () => {
        assert.equal(hasConstraint(errorsFor(FilterSearchBlocksDTO, { id: 'a', config: 'x' }), 'config', 'isObject'), true);
    });

    it('requires id', () => {
        assert.equal(hasConstraint(errorsFor(FilterSearchBlocksDTO, { config: {} }), 'id', 'isString'), true);
    });
});

describe('SearchPoliciesDTO', () => {
    it('accepts a result array', () => {
        assert.equal(isClean(errorsFor(SearchPoliciesDTO, { result: [] })), true);
    });

    it('accepts a null-free target object', () => {
        assert.equal(isClean(errorsFor(SearchPoliciesDTO, { target: {}, result: [] })), true);
    });

    it('rejects a non-array result', () => {
        assert.equal(hasConstraint(errorsFor(SearchPoliciesDTO, { result: {} }), 'result', 'isArray'), true);
    });

    it('rejects a non-object target', () => {
        assert.equal(hasConstraint(errorsFor(SearchPoliciesDTO, { target: 'x', result: [] }), 'target', 'isObject'), true);
    });
});

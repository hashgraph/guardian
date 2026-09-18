import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    SchemaRuleDTO,
    SchemaRuleOptionsDTO,
    SchemaRuleRelationshipsDTO,
    SchemaRuleDataDTO,
} from '../../dist/middlewares/validation/schemas/schema-rules.dto.js';
import { TagDTO } from '../../dist/middlewares/validation/schemas/tag.dto.js';

describe('SchemaRuleDTO', () => {
    it('accepts a minimal valid rule (name only)', () => {
        assert.equal(isClean(errorsFor(SchemaRuleDTO, { name: 'rule' })), true);
    });

    it('accepts a fully populated rule', () => {
        const errs = errorsFor(SchemaRuleDTO, {
            id: 'id', uuid: 'u', name: 'rule', description: 'd', creator: 'did',
            owner: 'did', policyId: 'p', policyTopicId: '0.0.1', policyInstanceTopicId: '0.0.2',
            status: 'DRAFT', config: { a: 1 },
        });
        assert.equal(isClean(errs), true);
    });

    it('rejects a missing name', () => {
        assert.equal(hasError(errorsFor(SchemaRuleDTO, {}), 'name'), true);
    });

    it('rejects a non-string name', () => {
        assert.equal(hasConstraint(errorsFor(SchemaRuleDTO, { name: 5 }), 'name', 'isString'), true);
    });

    for (const field of ['uuid', 'description', 'creator', 'owner', 'policyId', 'policyTopicId', 'policyInstanceTopicId', 'status']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(SchemaRuleDTO, { name: 'n', [field]: 7 }), field, 'isString'), true);
        });
    }

    it('rejects a non-object config', () => {
        assert.equal(hasConstraint(errorsFor(SchemaRuleDTO, { name: 'n', config: 'x' }), 'config', 'isObject'), true);
    });

    it('accepts an omitted optional config', () => {
        assert.equal(isClean(errorsFor(SchemaRuleDTO, { name: 'n' })), true);
    });
});

describe('SchemaRuleOptionsDTO', () => {
    it('accepts an empty payload (all optional)', () => {
        assert.equal(isClean(errorsFor(SchemaRuleOptionsDTO, {})), true);
    });

    it('accepts valid string ids', () => {
        assert.equal(isClean(errorsFor(SchemaRuleOptionsDTO, { policyId: 'p', schemaId: 's', documentId: 'd', parentId: 'pa' })), true);
    });

    for (const field of ['policyId', 'schemaId', 'documentId', 'parentId']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(SchemaRuleOptionsDTO, { [field]: 9 }), field, 'isString'), true);
        });
    }
});

describe('SchemaRuleRelationshipsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(SchemaRuleRelationshipsDTO, {})), true);
    });

    it('rejects a non-object policy', () => {
        assert.equal(hasConstraint(errorsFor(SchemaRuleRelationshipsDTO, { policy: 'x' }), 'policy', 'isObject'), true);
    });

    it('rejects a non-array schemas', () => {
        assert.equal(hasConstraint(errorsFor(SchemaRuleRelationshipsDTO, { schemas: 'x' }), 'schemas', 'isArray'), true);
    });
});

describe('SchemaRuleDataDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(SchemaRuleDataDTO, {})), true);
    });

    it('rejects a non-object rules', () => {
        assert.equal(hasConstraint(errorsFor(SchemaRuleDataDTO, { rules: 'x' }), 'rules', 'isObject'), true);
    });

    it('rejects a non-object document', () => {
        assert.equal(hasConstraint(errorsFor(SchemaRuleDataDTO, { document: 5 }), 'document', 'isObject'), true);
    });

    it('rejects a non-array relationships', () => {
        assert.equal(hasConstraint(errorsFor(SchemaRuleDataDTO, { relationships: 'x' }), 'relationships', 'isArray'), true);
    });
});

describe('TagDTO', () => {
    it('accepts an empty instance (only inheritTags decorated)', () => {
        assert.equal(isClean(errorsFor(TagDTO, {})), true);
    });

    it('accepts a valid inheritTags', () => {
        assert.equal(isClean(errorsFor(TagDTO, { inheritTags: true })), true);
    });

    it('rejects a non-boolean inheritTags', () => {
        assert.equal(hasConstraint(errorsFor(TagDTO, { inheritTags: 'yes' }), 'inheritTags', 'isBoolean'), true);
    });
});

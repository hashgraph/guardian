import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    StatisticDefinitionDTO,
    StatisticAssessmentDTO,
    StatisticAssessmentRelationshipsDTO,
    StatisticDefinitionRelationshipsDTO,
} from '../../dist/middlewares/validation/schemas/policy-statistics.dto.js';

describe('StatisticDefinitionDTO', () => {
    it('accepts a minimal valid definition (name only)', () => {
        assert.equal(isClean(errorsFor(StatisticDefinitionDTO, { name: 'stat' })), true);
    });

    it('accepts a fully populated definition', () => {
        const errs = errorsFor(StatisticDefinitionDTO, {
            id: 'i', uuid: 'u', name: 'n', description: 'd', creator: 'c', owner: 'o',
            topicId: '0.0.1', messageId: 'm', policyId: 'p', policyTopicId: '0.0.2',
            policyInstanceTopicId: '0.0.3', status: 'DRAFT', config: {},
        });
        assert.equal(isClean(errs), true);
    });

    it('rejects a missing name', () => {
        assert.equal(hasError(errorsFor(StatisticDefinitionDTO, {}), 'name'), true);
    });

    it('rejects a non-string name', () => {
        assert.equal(hasConstraint(errorsFor(StatisticDefinitionDTO, { name: 1 }), 'name', 'isString'), true);
    });

    for (const field of ['uuid', 'description', 'creator', 'owner', 'topicId', 'messageId', 'policyId', 'policyTopicId', 'policyInstanceTopicId', 'status']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(StatisticDefinitionDTO, { name: 'n', [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-object config', () => {
        assert.equal(hasConstraint(errorsFor(StatisticDefinitionDTO, { name: 'n', config: 'x' }), 'config', 'isObject'), true);
    });
});

describe('StatisticAssessmentDTO', () => {
    it('accepts an empty payload (all optional)', () => {
        assert.equal(isClean(errorsFor(StatisticAssessmentDTO, {})), true);
    });

    it('accepts a populated assessment', () => {
        const errs = errorsFor(StatisticAssessmentDTO, {
            id: 'i', definitionId: 'd', policyId: 'p', policyTopicId: '0.0.1',
            policyInstanceTopicId: '0.0.2', topicId: '0.0.3', creator: 'c', owner: 'o',
            messageId: 'm', target: 't', relationships: ['r'], document: {},
        });
        assert.equal(isClean(errs), true);
    });

    for (const field of ['id', 'definitionId', 'policyId', 'policyTopicId', 'policyInstanceTopicId', 'topicId', 'creator', 'owner', 'messageId', 'target']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(StatisticAssessmentDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-array relationships', () => {
        assert.equal(hasConstraint(errorsFor(StatisticAssessmentDTO, { relationships: 'x' }), 'relationships', 'isArray'), true);
    });

    it('rejects a non-object document', () => {
        assert.equal(hasConstraint(errorsFor(StatisticAssessmentDTO, { document: 'x' }), 'document', 'isObject'), true);
    });
});

describe('StatisticAssessmentRelationshipsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(StatisticAssessmentRelationshipsDTO, {})), true);
    });

    it('rejects a non-object target', () => {
        assert.equal(hasConstraint(errorsFor(StatisticAssessmentRelationshipsDTO, { target: 'x' }), 'target', 'isObject'), true);
    });

    it('rejects a non-array relationships', () => {
        assert.equal(hasConstraint(errorsFor(StatisticAssessmentRelationshipsDTO, { relationships: 'x' }), 'relationships', 'isArray'), true);
    });
});

describe('StatisticDefinitionRelationshipsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(StatisticDefinitionRelationshipsDTO, {})), true);
    });

    it('rejects a non-object policy', () => {
        assert.equal(hasConstraint(errorsFor(StatisticDefinitionRelationshipsDTO, { policy: 'x' }), 'policy', 'isObject'), true);
    });

    it('rejects a non-array schemas', () => {
        assert.equal(hasConstraint(errorsFor(StatisticDefinitionRelationshipsDTO, { schemas: 'x' }), 'schemas', 'isArray'), true);
    });

    it('rejects a non-object schema', () => {
        assert.equal(hasConstraint(errorsFor(StatisticDefinitionRelationshipsDTO, { schema: 'x' }), 'schema', 'isObject'), true);
    });
});

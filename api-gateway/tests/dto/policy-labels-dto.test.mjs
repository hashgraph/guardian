import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    PolicyLabelDTO,
    PolicyLabelRelationshipsDTO,
    PolicyLabelDocumentDTO,
    PolicyLabelDocumentRelationshipsDTO,
    PolicyLabelComponentsDTO,
    PolicyLabelFiltersDTO,
} from '../../dist/middlewares/validation/schemas/policy-labels.dto.js';

describe('PolicyLabelDTO', () => {
    it('accepts a minimal valid label (name only)', () => {
        assert.equal(isClean(errorsFor(PolicyLabelDTO, { name: 'lbl' })), true);
    });

    it('accepts a fully populated label', () => {
        const errs = errorsFor(PolicyLabelDTO, {
            id: 'i', uuid: 'u', name: 'n', description: 'd', creator: 'c', owner: 'o',
            topicId: '0.0.1', messageId: 'm', policyId: 'p', policyTopicId: '0.0.2',
            policyInstanceTopicId: '0.0.3', status: 'DRAFT', config: {},
        });
        assert.equal(isClean(errs), true);
    });

    it('rejects a missing name', () => {
        assert.equal(hasError(errorsFor(PolicyLabelDTO, {}), 'name'), true);
    });

    it('rejects a non-string name', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelDTO, { name: 1 }), 'name', 'isString'), true);
    });

    for (const field of ['uuid', 'description', 'creator', 'owner', 'topicId', 'messageId', 'policyId', 'policyTopicId', 'policyInstanceTopicId', 'status']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyLabelDTO, { name: 'n', [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-object config', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelDTO, { name: 'n', config: 'x' }), 'config', 'isObject'), true);
    });
});

describe('PolicyLabelRelationshipsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyLabelRelationshipsDTO, {})), true);
    });

    it('rejects a non-object policy', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelRelationshipsDTO, { policy: 'x' }), 'policy', 'isObject'), true);
    });

    it('rejects a non-array policySchemas', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelRelationshipsDTO, { policySchemas: 'x' }), 'policySchemas', 'isArray'), true);
    });

    it('rejects a non-array documentsSchemas', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelRelationshipsDTO, { documentsSchemas: 'x' }), 'documentsSchemas', 'isArray'), true);
    });
});

describe('PolicyLabelDocumentDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyLabelDocumentDTO, {})), true);
    });

    for (const field of ['id', 'definitionId', 'policyId', 'policyTopicId', 'policyInstanceTopicId', 'topicId', 'creator', 'owner', 'messageId', 'target']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyLabelDocumentDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-array relationships', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelDocumentDTO, { relationships: 'x' }), 'relationships', 'isArray'), true);
    });

    it('rejects a non-object document', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelDocumentDTO, { document: 'x' }), 'document', 'isObject'), true);
    });
});

describe('PolicyLabelDocumentRelationshipsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyLabelDocumentRelationshipsDTO, {})), true);
    });

    it('rejects a non-object target', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelDocumentRelationshipsDTO, { target: 'x' }), 'target', 'isObject'), true);
    });

    it('rejects a non-array relationships', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelDocumentRelationshipsDTO, { relationships: 'x' }), 'relationships', 'isArray'), true);
    });
});

describe('PolicyLabelComponentsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyLabelComponentsDTO, {})), true);
    });

    it('rejects a non-array statistics', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelComponentsDTO, { statistics: 'x' }), 'statistics', 'isArray'), true);
    });

    it('rejects a non-array labels', () => {
        assert.equal(hasConstraint(errorsFor(PolicyLabelComponentsDTO, { labels: 'x' }), 'labels', 'isArray'), true);
    });
});

describe('PolicyLabelFiltersDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyLabelFiltersDTO, {})), true);
    });

    it('accepts valid filters', () => {
        assert.equal(isClean(errorsFor(PolicyLabelFiltersDTO, { text: 'n', owner: 'o', components: 'all' })), true);
    });

    for (const field of ['text', 'owner', 'components']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyLabelFiltersDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

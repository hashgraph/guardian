import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    FormulaDTO,
    FormulaRelationshipsDTO,
    FormulasOptionsDTO,
    FormulasDataDTO,
} from '../../dist/middlewares/validation/schemas/formulas.dto.js';

describe('FormulaDTO', () => {
    it('accepts a minimal valid formula (name only)', () => {
        assert.equal(isClean(errorsFor(FormulaDTO, { name: 'f' })), true);
    });

    it('accepts a fully populated formula', () => {
        const errs = errorsFor(FormulaDTO, {
            id: 'i', uuid: 'u', name: 'n', description: 'd', creator: 'c', owner: 'o',
            messageId: 'm', policyId: 'p', policyTopicId: '0.0.1', policyInstanceTopicId: '0.0.2',
            status: 'DRAFT', config: {},
        });
        assert.equal(isClean(errs), true);
    });

    it('rejects a missing name', () => {
        assert.equal(hasError(errorsFor(FormulaDTO, {}), 'name'), true);
    });

    it('rejects a non-string name', () => {
        assert.equal(hasConstraint(errorsFor(FormulaDTO, { name: 5 }), 'name', 'isString'), true);
    });

    for (const field of ['uuid', 'description', 'creator', 'owner', 'messageId', 'policyId', 'policyTopicId', 'policyInstanceTopicId', 'status']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(FormulaDTO, { name: 'n', [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-object config', () => {
        assert.equal(hasConstraint(errorsFor(FormulaDTO, { name: 'n', config: 'x' }), 'config', 'isObject'), true);
    });
});

describe('FormulaRelationshipsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(FormulaRelationshipsDTO, {})), true);
    });

    it('rejects a non-object policy', () => {
        assert.equal(hasConstraint(errorsFor(FormulaRelationshipsDTO, { policy: 'x' }), 'policy', 'isObject'), true);
    });

    it('rejects a non-array schemas', () => {
        assert.equal(hasConstraint(errorsFor(FormulaRelationshipsDTO, { schemas: 'x' }), 'schemas', 'isArray'), true);
    });

    it('rejects a non-object formulas', () => {
        assert.equal(hasConstraint(errorsFor(FormulaRelationshipsDTO, { formulas: 'x' }), 'formulas', 'isObject'), true);
    });
});

describe('FormulasOptionsDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(FormulasOptionsDTO, {})), true);
    });

    for (const field of ['policyId', 'schemaId', 'documentId', 'parentId']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(FormulasOptionsDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('FormulasDataDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(FormulasDataDTO, {})), true);
    });

    it('rejects a non-array formulas', () => {
        assert.equal(hasConstraint(errorsFor(FormulasDataDTO, { formulas: 'x' }), 'formulas', 'isArray'), true);
    });

    it('rejects a non-object document', () => {
        assert.equal(hasConstraint(errorsFor(FormulasDataDTO, { document: 'x' }), 'document', 'isObject'), true);
    });

    it('rejects a non-array relationships', () => {
        assert.equal(hasConstraint(errorsFor(FormulasDataDTO, { relationships: 'x' }), 'relationships', 'isArray'), true);
    });

    it('rejects a non-array schemas', () => {
        assert.equal(hasConstraint(errorsFor(FormulasDataDTO, { schemas: 'x' }), 'schemas', 'isArray'), true);
    });
});

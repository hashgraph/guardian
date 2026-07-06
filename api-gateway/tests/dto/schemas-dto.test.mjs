import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    SchemaDTO,
    SchemaParentDTO,
    SchemaListAllItemDTO,
    SchemaWithSubSchemasDTO,
    SchemaPushCopyRequestDTO,
    SchemaImportDuplicatesRequestDTO,
    SystemSchemaDTO,
    ExportSchemaDTO,
    VersionSchemaDTO,
    MessageSchemaDTO,
} from '../../dist/middlewares/validation/schemas/schemas.dto.js';

describe('SchemaDTO', () => {
    it('accepts an empty payload (all optional)', () => {
        assert.equal(isClean(errorsFor(SchemaDTO, {})), true);
    });

    it('accepts a populated schema', () => {
        const errs = errorsFor(SchemaDTO, {
            id: 'i', uuid: 'u', name: 'n', description: 'd', entity: 'POLICY', iri: '#x',
            status: 'DRAFT', topicId: '0.0.1', version: '1.0.0', creator: 'c', owner: 'o',
            messageId: 'm', category: 'POLICY', documentURL: 'ipfs://x', contextURL: 'ipfs://y',
            document: {}, context: {},
        });
        assert.equal(isClean(errs), true);
    });

    for (const field of ['id', 'uuid', 'name', 'description', 'entity', 'iri', 'status', 'topicId', 'version', 'creator', 'owner', 'messageId', 'category', 'documentURL', 'contextURL']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(SchemaDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-object document', () => {
        assert.equal(hasConstraint(errorsFor(SchemaDTO, { document: 'x' }), 'document', 'isObject'), true);
    });

    it('rejects a non-object context', () => {
        assert.equal(hasConstraint(errorsFor(SchemaDTO, { context: 'x' }), 'context', 'isObject'), true);
    });
});

describe('SchemaParentDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(SchemaParentDTO, {})), true);
    });

    for (const field of ['id', 'name', 'status', 'version', 'sourceVersion', 'category']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(SchemaParentDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('SchemaListAllItemDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(SchemaListAllItemDTO, {})), true);
    });

    for (const field of ['id', 'name', 'description', 'status', 'version', 'sourceVersion', 'topicId', 'category']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(SchemaListAllItemDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('SchemaWithSubSchemasDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(SchemaWithSubSchemasDTO, {})), true);
    });
});

describe('SchemaPushCopyRequestDTO', () => {
    it('accepts a valid request', () => {
        assert.equal(isClean(errorsFor(SchemaPushCopyRequestDTO, { topicId: '0.0.1', name: 'n', iri: '#x', copyNested: true })), true);
    });

    for (const field of ['topicId', 'name', 'iri']) {
        it(`rejects a missing ${field}`, () => {
            const base = { topicId: '0.0.1', name: 'n', iri: '#x', copyNested: true };
            delete base[field];
            assert.equal(hasError(errorsFor(SchemaPushCopyRequestDTO, base), field), true);
        });
        it(`rejects an empty ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(SchemaPushCopyRequestDTO, { topicId: '0.0.1', name: 'n', iri: '#x', copyNested: true, [field]: '' }), field, 'isNotEmpty'), true);
        });
    }

    it('rejects a non-boolean copyNested', () => {
        assert.equal(hasConstraint(errorsFor(SchemaPushCopyRequestDTO, { topicId: '0.0.1', name: 'n', iri: '#x', copyNested: 'x' }), 'copyNested', 'isBoolean'), true);
    });
});

describe('SchemaImportDuplicatesRequestDTO', () => {
    it('accepts a valid request', () => {
        assert.equal(isClean(errorsFor(SchemaImportDuplicatesRequestDTO, { policyId: 'p', schemaNames: ['a'] })), true);
    });

    it('rejects a missing policyId', () => {
        assert.equal(hasError(errorsFor(SchemaImportDuplicatesRequestDTO, { schemaNames: [] }), 'policyId'), true);
    });

    it('rejects an empty policyId', () => {
        assert.equal(hasConstraint(errorsFor(SchemaImportDuplicatesRequestDTO, { policyId: '', schemaNames: [] }), 'policyId', 'isNotEmpty'), true);
    });

    it('rejects a non-array schemaNames', () => {
        assert.equal(hasConstraint(errorsFor(SchemaImportDuplicatesRequestDTO, { policyId: 'p', schemaNames: 'x' }), 'schemaNames', 'isArray'), true);
    });
});

describe('SystemSchemaDTO', () => {
    it('accepts a valid STANDARD_REGISTRY schema', () => {
        assert.equal(isClean(errorsFor(SystemSchemaDTO, { name: 'n', entity: 'STANDARD_REGISTRY' })), true);
    });

    it('accepts a valid USER schema', () => {
        assert.equal(isClean(errorsFor(SystemSchemaDTO, { name: 'n', entity: 'USER' })), true);
    });

    it('rejects an out-of-enum entity', () => {
        assert.equal(hasConstraint(errorsFor(SystemSchemaDTO, { name: 'n', entity: 'AUDITOR' }), 'entity', 'isIn'), true);
    });

    it('rejects a missing name', () => {
        assert.equal(hasError(errorsFor(SystemSchemaDTO, { entity: 'USER' }), 'name'), true);
    });

    it('rejects an empty name', () => {
        assert.equal(hasConstraint(errorsFor(SystemSchemaDTO, { name: '', entity: 'USER' }), 'name', 'isNotEmpty'), true);
    });
});

describe('ExportSchemaDTO', () => {
    it('accepts a valid export', () => {
        assert.equal(isClean(errorsFor(ExportSchemaDTO, { id: 'i', name: 'n' })), true);
    });

    it('rejects a missing id', () => {
        assert.equal(hasError(errorsFor(ExportSchemaDTO, { name: 'n' }), 'id'), true);
    });

    it('rejects an empty name', () => {
        assert.equal(hasConstraint(errorsFor(ExportSchemaDTO, { id: 'i', name: '' }), 'name', 'isNotEmpty'), true);
    });

    for (const field of ['description', 'version', 'owner', 'messageId']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(ExportSchemaDTO, { id: 'i', name: 'n', [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('VersionSchemaDTO', () => {
    it('accepts a valid version', () => {
        assert.equal(isClean(errorsFor(VersionSchemaDTO, { version: '1.0.0' })), true);
    });

    it('rejects a missing version', () => {
        assert.equal(hasError(errorsFor(VersionSchemaDTO, {}), 'version'), true);
    });

    it('rejects an empty version', () => {
        assert.equal(hasConstraint(errorsFor(VersionSchemaDTO, { version: '' }), 'version', 'isNotEmpty'), true);
    });
});

describe('MessageSchemaDTO', () => {
    it('accepts a valid messageId', () => {
        assert.equal(isClean(errorsFor(MessageSchemaDTO, { messageId: 'm' })), true);
    });

    it('rejects a missing messageId', () => {
        assert.equal(hasError(errorsFor(MessageSchemaDTO, {}), 'messageId'), true);
    });

    it('rejects a non-string messageId', () => {
        assert.equal(hasConstraint(errorsFor(MessageSchemaDTO, { messageId: 5 }), 'messageId', 'isString'), true);
    });
});

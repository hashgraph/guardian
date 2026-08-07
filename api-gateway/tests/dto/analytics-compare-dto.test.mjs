import assert from 'node:assert/strict';
import { make, errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    ComparePoliciesItemDTO,
    ComparePoliciesColumnDTO,
    ComparePoliciesPropertyValueDTO,
    ComparePoliciesBlockSideDTO,
    ComparePoliciesRateEntryDTO,
    CompareModulesItemDTO,
    CompareModulesSectionDTO,
    CompareSchemasItemDTO,
    CompareSchemasSectionDTO,
    CompareSchemasDTO,
} from '../../dist/middlewares/validation/schemas/analytics.js';

const validColumn = () => make(ComparePoliciesColumnDTO, {
    name: 'left_name', label: 'Name', type: 'string',
});

const validSchemaItem = () => make(CompareSchemasItemDTO, {
    id: 'db-id', name: 'Schema', description: 'd', uuid: 'u', version: '1', iri: 'schema:iri',
});

const makeSection = () => make(CompareSchemasSectionDTO, { columns: [validColumn()], report: [] });

describe('ComparePoliciesItemDTO', () => {
    const base = () => ({ id: 'i', name: 'n', description: 'd', type: 'id' });

    it('accepts a minimal valid item', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesItemDTO, base())), true);
    });

    it('accepts optional instanceTopicId and version', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesItemDTO, {
            ...base(), instanceTopicId: '0.0.1', version: '2',
        })), true);
    });

    for (const field of ['id', 'name', 'description', 'type']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(ComparePoliciesItemDTO, { ...base(), [field]: 1 }), field, 'isString'), true);
        });
    }

    it('rejects a non-string instanceTopicId', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesItemDTO, { ...base(), instanceTopicId: 9 }), 'instanceTopicId', 'isString'), true);
    });

    it('rejects a non-string version', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesItemDTO, { ...base(), version: 9 }), 'version', 'isString'), true);
    });
});

describe('ComparePoliciesColumnDTO', () => {
    it('accepts a valid column without display', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesColumnDTO, { name: 'n', label: 'l', type: 't' })), true);
    });

    it('accepts a valid column with display', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesColumnDTO, { name: 'n', label: 'l', type: 't', display: 'Rate' })), true);
    });

    for (const field of ['name', 'label', 'type']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(ComparePoliciesColumnDTO, { name: 'n', label: 'l', type: 't', [field]: 0 }), field, 'isString'), true);
        });
    }

    it('rejects a non-string display', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesColumnDTO, { name: 'n', label: 'l', type: 't', display: 1 }), 'display', 'isString'), true);
    });
});

describe('ComparePoliciesPropertyValueDTO', () => {
    const base = () => ({ name: 'onErrorAction', lvl: 1, path: 'onErrorAction', type: 'property' });

    it('accepts a valid property value', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesPropertyValueDTO, base())), true);
    });

    it('accepts an arbitrary value payload', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesPropertyValueDTO, { ...base(), value: { nested: [1, 2] } })), true);
    });

    it('rejects a non-number lvl', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesPropertyValueDTO, { ...base(), lvl: 'one' }), 'lvl', 'isNumber'), true);
    });

    it('rejects a non-string path', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesPropertyValueDTO, { ...base(), path: 4 }), 'path', 'isString'), true);
    });

    it('rejects a missing name', () => {
        const props = base();
        delete props.name;
        assert.equal(hasError(errorsFor(ComparePoliciesPropertyValueDTO, props), 'name'), true);
    });
});

describe('ComparePoliciesBlockSideDTO', () => {
    const base = () => ({
        index: 1,
        blockType: 'interfaceContainerBlock',
        tag: 'Block_1',
        properties: [make(ComparePoliciesPropertyValueDTO, { name: 'p', lvl: 1, path: 'p', type: 'property' })],
        events: [],
    });

    it('accepts a valid block side', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesBlockSideDTO, base())), true);
    });

    it('rejects a non-number index', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesBlockSideDTO, { ...base(), index: 'x' }), 'index', 'isNumber'), true);
    });

    it('rejects a non-array properties', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesBlockSideDTO, { ...base(), properties: {} }), 'properties', 'isArray'), true);
    });

    it('rejects a non-array events', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesBlockSideDTO, { ...base(), events: 'x' }), 'events', 'isArray'), true);
    });

    it('flags an invalid nested property entry', () => {
        const bad = make(ComparePoliciesPropertyValueDTO, { name: 'p', lvl: 'NaN', path: 'p', type: 'property' });
        assert.equal(hasConstraint(errorsFor(ComparePoliciesBlockSideDTO, { ...base(), properties: [bad] }), 'properties.0.lvl', 'isNumber'), true);
    });
});

describe('ComparePoliciesRateEntryDTO', () => {
    const base = () => ({ type: 'FULL', totalRate: 100, items: [] });

    it('accepts a minimal valid entry', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesRateEntryDTO, base())), true);
    });

    it('accepts optional name, path and lvl', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesRateEntryDTO, { ...base(), name: 'type', path: 'uiMetaData.type', lvl: 2 })), true);
    });

    it('accepts null entries inside items', () => {
        assert.equal(isClean(errorsFor(ComparePoliciesRateEntryDTO, { ...base(), items: [null, { a: 1 }] })), true);
    });

    it('rejects a non-number totalRate', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesRateEntryDTO, { ...base(), totalRate: '100' }), 'totalRate', 'isNumber'), true);
    });

    it('rejects a non-array items', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesRateEntryDTO, { ...base(), items: 'x' }), 'items', 'isArray'), true);
    });

    it('rejects a non-number lvl', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesRateEntryDTO, { ...base(), lvl: 'two' }), 'lvl', 'isNumber'), true);
    });

    it('rejects a non-string name', () => {
        assert.equal(hasConstraint(errorsFor(ComparePoliciesRateEntryDTO, { ...base(), name: 7 }), 'name', 'isString'), true);
    });
});

describe('CompareModulesItemDTO', () => {
    it('accepts a valid item', () => {
        assert.equal(isClean(errorsFor(CompareModulesItemDTO, { id: 'i', name: 'Module_1', description: 'd' })), true);
    });

    for (const field of ['id', 'name', 'description']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(CompareModulesItemDTO, { id: 'i', name: 'n', description: 'd', [field]: 3 }), field, 'isString'), true);
        });
    }
});

describe('CompareModulesSectionDTO', () => {
    it('accepts a valid section', () => {
        assert.equal(isClean(errorsFor(CompareModulesSectionDTO, { columns: [validColumn()], report: [] })), true);
    });

    it('rejects a non-array columns', () => {
        assert.equal(hasConstraint(errorsFor(CompareModulesSectionDTO, { columns: {}, report: [] }), 'columns', 'isArray'), true);
    });

    it('rejects a non-array report', () => {
        assert.equal(hasConstraint(errorsFor(CompareModulesSectionDTO, { columns: [validColumn()], report: 'x' }), 'report', 'isArray'), true);
    });

    it('flags an invalid nested column', () => {
        const bad = make(ComparePoliciesColumnDTO, { name: 1, label: 'l', type: 't' });
        assert.equal(hasConstraint(errorsFor(CompareModulesSectionDTO, { columns: [bad], report: [] }), 'columns.0.name', 'isString'), true);
    });
});

describe('CompareSchemasItemDTO', () => {
    it('accepts a valid item without optionals', () => {
        assert.equal(isClean(errorsFor(CompareSchemasItemDTO, {
            id: 'i', name: 'n', description: 'd', uuid: 'u', version: '1', iri: 'schema:iri',
        })), true);
    });

    it('accepts optional topicId and policy', () => {
        assert.equal(isClean(errorsFor(CompareSchemasItemDTO, {
            id: 'i', name: 'n', description: 'd', uuid: 'u', version: '1', iri: 'iri',
            topicId: '0.0.1', policy: { id: 'p' },
        })), true);
    });

    for (const field of ['uuid', 'version', 'iri']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(CompareSchemasItemDTO, {
                id: 'i', name: 'n', description: 'd', uuid: 'u', version: '1', iri: 'iri', [field]: 0,
            }), field, 'isString'), true);
        });
    }

    it('rejects a non-object policy', () => {
        assert.equal(hasConstraint(errorsFor(CompareSchemasItemDTO, {
            id: 'i', name: 'n', description: 'd', uuid: 'u', version: '1', iri: 'iri', policy: 'x',
        }), 'policy', 'isObject'), true);
    });
});

describe('CompareSchemasDTO', () => {
    it('accepts a fully valid comparison', () => {
        const props = {
            left: validSchemaItem(),
            right: validSchemaItem(),
            total: 44,
            fields: makeSection(),
        };
        assert.equal(isClean(errorsFor(CompareSchemasDTO, props)), true);
    });

    it('rejects a non-number total', () => {
        const errs = errorsFor(CompareSchemasDTO, {
            left: validSchemaItem(), right: validSchemaItem(), total: 'x', fields: makeSection(),
        });
        assert.equal(hasConstraint(errs, 'total', 'isNumber'), true);
    });

    it('rejects a non-object left', () => {
        const errs = errorsFor(CompareSchemasDTO, {
            left: 'x', right: validSchemaItem(), total: 1, fields: makeSection(),
        });
        assert.equal(hasConstraint(errs, 'left', 'isObject'), true);
    });

    it('flags an invalid nested left item', () => {
        const bad = validSchemaItem();
        bad.uuid = 5;
        const errs = errorsFor(CompareSchemasDTO, {
            left: bad, right: validSchemaItem(), total: 1, fields: makeSection(),
        });
        assert.equal(hasConstraint(errs, 'left.uuid', 'isString'), true);
    });
});

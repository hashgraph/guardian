import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    PolicyDTO,
    PolicyTestDTO,
    PolicyToolDTO,
    PolicyPreviewDTO,
} from '../../dist/middlewares/validation/schemas/policies.dto.js';
import {
    StatisticDefinitionDTO,
    StatisticAssessmentDTO,
    StatisticAssessmentRelationshipsDTO,
    StatisticDefinitionRelationshipsDTO,
} from '../../dist/middlewares/validation/schemas/policy-statistics.dto.js';
import {
    SchemaDTO,
    SchemaWithSubSchemasDTO,
    SystemSchemaDTO,
    SchemaImportDuplicatesRequestDTO,
} from '../../dist/middlewares/validation/schemas/schemas.dto.js';
import {
    PolicyLabelDTO,
    PolicyLabelRelationshipsDTO,
    PolicyLabelDocumentDTO,
    PolicyLabelDocumentRelationshipsDTO,
    PolicyLabelComponentsDTO,
    PolicyLabelFiltersDTO,
} from '../../dist/middlewares/validation/schemas/policy-labels.dto.js';
import {
    SchemaRuleDTO,
    SchemaRuleRelationshipsDTO,
    SchemaRuleDataDTO,
} from '../../dist/middlewares/validation/schemas/schema-rules.dto.js';
import {
    MockTopicDataDTO,
    MockApiDataDTO,
    MockUserDataDTO,
} from '../../dist/middlewares/validation/schemas/mock.dto.js';

const run = (Dto, input) => validate(plainToInstance(Dto, input));

const keys = (errors, property) => {
    const found = errors.find((e) => e.property === property);
    return found && found.constraints ? Object.keys(found.constraints) : [];
};

const children = (errors, property) => {
    const found = errors.find((e) => e.property === property);
    return found && found.children ? found.children : [];
};

const childProps = (errors, property) => children(errors, property).map((c) => c.property);

describe('@unit DTO nested / enum / bound gap sweep', () => {
    describe('PolicyTestDTO swagger-only enum status', () => {
        it('accepts a valid payload', async () => {
            const errors = await run(PolicyTestDTO, { name: 'T', status: 'New', duration: 1, progress: 2 });
            assert.equal(errors.length, 0);
        });

        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(PolicyTestDTO, {})).length, 0);
        });

        it('LATENT: status enum (PolicyTestStatus) is not enforced, any string passes', async () => {
            assert.equal((await run(PolicyTestDTO, { status: 'NOT_A_STATUS' })).length, 0);
        });

        it('rejects a non-string status', async () => {
            assert.deepEqual(keys(await run(PolicyTestDTO, { status: 5 }), 'status'), ['isString']);
        });

        it('rejects a non-number duration', async () => {
            assert.deepEqual(keys(await run(PolicyTestDTO, { duration: 'x' }), 'duration'), ['isNumber']);
        });

        it('does not validate the untyped object result', async () => {
            assert.deepEqual(keys(await run(PolicyTestDTO, { result: { any: 1 } }), 'result'), []);
        });

        it('rejects non-object result', async () => {
            assert.deepEqual(keys(await run(PolicyTestDTO, { result: 'x' }), 'result'), ['isObject']);
        });
    });

    describe('PolicyToolDTO', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(PolicyToolDTO, { name: 'Tool', version: '1.0.0' })).length, 0);
        });

        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(PolicyToolDTO, {})).length, 0);
        });

        it('rejects a non-string version', async () => {
            assert.deepEqual(keys(await run(PolicyToolDTO, { version: 5 }), 'version'), ['isString']);
        });
    });

    describe('PolicyDTO enum and nested array gaps', () => {
        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(PolicyDTO, {})).length, 0);
        });

        it('LATENT: status enum (PolicyStatus) is not enforced, any string passes', async () => {
            assert.equal((await run(PolicyDTO, { status: 'NONSENSE_STATUS' })).length, 0);
        });

        it('rejects a non-string status', async () => {
            assert.deepEqual(keys(await run(PolicyDTO, { status: 9 }), 'status'), ['isString']);
        });

        it('LATENT: availability enum (PolicyAvailability) is not enforced, any string passes', async () => {
            assert.equal((await run(PolicyDTO, { availability: 'NOT_AVAILABLE' })).length, 0);
        });

        it('rejects a non-string availability', async () => {
            assert.deepEqual(keys(await run(PolicyDTO, { availability: 1 }), 'availability'), ['isString']);
        });

        it('CONTRAST: tools IS deep-validated (ValidateNested + Type), garbage tool element flags nested errors', async () => {
            const errors = await run(PolicyDTO, { tools: [{ version: 5 }] });
            assert.ok(childProps(errors, 'tools').includes('0'));
        });

        it('CONTRAST: a fully valid tools element passes', async () => {
            assert.equal((await run(PolicyDTO, { tools: [{ name: 'T', version: '1.0.0' }] })).length, 0);
        });

        it('rejects a non-array tools', async () => {
            assert.ok(keys(await run(PolicyDTO, { tools: {} }), 'tools').includes('isArray'));
        });

        it('LATENT: tests array is NOT deep-validated (no ValidateNested), garbage element passes', async () => {
            const errors = await run(PolicyDTO, { tests: [{ status: 5, duration: 'x' }] });
            assert.equal(errors.length, 0);
        });

        it('rejects a non-array tests', async () => {
            assert.ok(keys(await run(PolicyDTO, { tests: 'x' }), 'tests').includes('isArray'));
        });

        it('LATENT: policyRoles array is not deep-validated, numeric elements pass', async () => {
            assert.equal((await run(PolicyDTO, { policyRoles: [1, 2, 3] })).length, 0);
        });

        it('LATENT: userRoles array is not deep-validated, object elements pass', async () => {
            assert.equal((await run(PolicyDTO, { userRoles: [{}, {}] })).length, 0);
        });

        it('LATENT: policyTopics array of objects is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyDTO, { policyTopics: [{ x: 1 }, 'junk'] })).length, 0);
        });

        it('LATENT: policyTokens array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyDTO, { policyTokens: [42] })).length, 0);
        });

        it('LATENT: policyGroups array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyDTO, { policyGroups: [null] })).length, 0);
        });

        it('LATENT: policyNavigation array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyDTO, { policyNavigation: ['x'] })).length, 0);
        });

        it('LATENT: policyDocumentation array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyDTO, { policyDocumentation: [1, 2] })).length, 0);
        });

        it('rejects a non-array policyRoles', async () => {
            assert.ok(keys(await run(PolicyDTO, { policyRoles: 'x' }), 'policyRoles').includes('isArray'));
        });

        it('rejects a non-array categories', async () => {
            assert.ok(keys(await run(PolicyDTO, { categories: {} }), 'categories').includes('isArray'));
        });

        it('CONTRAST: editableParametersSettings IS deep-validated, garbage element flags nested errors', async () => {
            const errors = await run(PolicyDTO, { editableParametersSettings: [{}] });
            assert.ok(childProps(errors, 'editableParametersSettings').includes('0'));
        });

        it('CONTRAST: importantParameters IS deep-validated (ValidateNested + Type)', async () => {
            const errors = await run(PolicyDTO, { importantParameters: { atValidation: 5 } });
            const c = children(errors, 'importantParameters');
            assert.ok(c.length > 0);
        });

        it('rejects a non-object config', async () => {
            assert.deepEqual(keys(await run(PolicyDTO, { config: 'x' }), 'config'), ['isObject']);
        });

        it('accepts an object userGroup', async () => {
            assert.equal((await run(PolicyDTO, { userGroup: { active: true } })).length, 0);
        });

        it('rejects a non-object userGroup', async () => {
            assert.deepEqual(keys(await run(PolicyDTO, { userGroup: 'x' }), 'userGroup'), ['isObject']);
        });
    });

    describe('PolicyPreviewDTO', () => {
        it('accepts a valid payload', async () => {
            const errors = await run(PolicyPreviewDTO, { module: {}, messageId: 'm', schemas: [], tags: [] });
            assert.equal(errors.length, 0);
        });

        it('reports required module and messageId when empty', async () => {
            const errors = await run(PolicyPreviewDTO, {});
            assert.ok(keys(errors, 'module').includes('isObject'));
            assert.ok(keys(errors, 'messageId').includes('isString'));
        });

        it('LATENT: module is validated as a plain object only, no deep PolicyDTO validation', async () => {
            const errors = await run(PolicyPreviewDTO, { module: { status: 5 }, messageId: 'm' });
            assert.equal(errors.length, 0);
        });

        it('LATENT: schemas array of objects is not deep-validated', async () => {
            const errors = await run(PolicyPreviewDTO, { module: {}, messageId: 'm', schemas: ['junk'] });
            assert.equal(errors.length, 0);
        });
    });

    describe('StatisticDefinitionDTO swagger-only enum status', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(StatisticDefinitionDTO, { name: 'S', status: 'DRAFT', config: {} })).length, 0);
        });

        it('requires name', async () => {
            assert.deepEqual(keys(await run(StatisticDefinitionDTO, {}), 'name'), ['isString']);
        });

        it('LATENT: status enum (EntityStatus) is not enforced, any string passes', async () => {
            assert.equal((await run(StatisticDefinitionDTO, { name: 'S', status: 'WHATEVER' })).length, 0);
        });

        it('rejects a non-object config', async () => {
            assert.deepEqual(keys(await run(StatisticDefinitionDTO, { name: 'S', config: 'x' }), 'config'), ['isObject']);
        });
    });

    describe('StatisticAssessmentDTO', () => {
        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(StatisticAssessmentDTO, {})).length, 0);
        });

        it('rejects a non-array relationships', async () => {
            assert.ok(keys(await run(StatisticAssessmentDTO, { relationships: {} }), 'relationships').includes('isArray'));
        });

        it('LATENT: relationships array elements are not deep-validated, garbage passes', async () => {
            assert.equal((await run(StatisticAssessmentDTO, { relationships: [{}, 5] })).length, 0);
        });

        it('rejects a non-object document', async () => {
            assert.deepEqual(keys(await run(StatisticAssessmentDTO, { document: 'x' }), 'document'), ['isObject']);
        });
    });

    describe('StatisticAssessmentRelationshipsDTO nested gaps', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(StatisticAssessmentRelationshipsDTO, { target: {}, relationships: [] })).length, 0);
        });

        it('rejects a non-object target', async () => {
            assert.deepEqual(keys(await run(StatisticAssessmentRelationshipsDTO, { target: 'x' }), 'target'), ['isObject']);
        });

        it('LATENT: target (VcDocumentDTO) is validated as a plain object only, garbage passes', async () => {
            assert.equal((await run(StatisticAssessmentRelationshipsDTO, { target: { id: 5 } })).length, 0);
        });

        it('LATENT: relationships array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(StatisticAssessmentRelationshipsDTO, { relationships: [{}, 'x'] })).length, 0);
        });

        it('rejects a non-array relationships', async () => {
            assert.ok(keys(await run(StatisticAssessmentRelationshipsDTO, { relationships: {} }), 'relationships').includes('isArray'));
        });
    });

    describe('StatisticDefinitionRelationshipsDTO nested gaps', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(StatisticDefinitionRelationshipsDTO, { policy: {}, schemas: [], schema: {} })).length, 0);
        });

        it('LATENT: policy (PolicyDTO) is validated as a plain object only, garbage passes', async () => {
            assert.equal((await run(StatisticDefinitionRelationshipsDTO, { policy: { status: 5 } })).length, 0);
        });

        it('LATENT: schemas array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(StatisticDefinitionRelationshipsDTO, { schemas: ['junk'] })).length, 0);
        });

        it('rejects a non-object schema and non-array schemas', async () => {
            const errors = await run(StatisticDefinitionRelationshipsDTO, { schema: 'x', schemas: 'y' });
            assert.deepEqual(keys(errors, 'schema'), ['isObject']);
            assert.ok(keys(errors, 'schemas').includes('isArray'));
        });
    });

    describe('SchemaDTO swagger-only enums', () => {
        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(SchemaDTO, {})).length, 0);
        });

        it('LATENT: entity enum (SchemaEntity) is not enforced, any string passes', async () => {
            assert.equal((await run(SchemaDTO, { entity: 'NOT_AN_ENTITY' })).length, 0);
        });

        it('LATENT: status enum (SchemaStatus) is not enforced, any string passes', async () => {
            assert.equal((await run(SchemaDTO, { status: 'NOT_A_STATUS' })).length, 0);
        });

        it('LATENT: category enum (SchemaCategory) is not enforced, any string passes', async () => {
            assert.equal((await run(SchemaDTO, { category: 'NOT_A_CATEGORY' })).length, 0);
        });

        it('rejects a non-string entity', async () => {
            assert.deepEqual(keys(await run(SchemaDTO, { entity: 5 }), 'entity'), ['isString']);
        });

        it('accepts object or string document via IsObject', async () => {
            assert.equal((await run(SchemaDTO, { document: { a: 1 } })).length, 0);
        });

        it('rejects a non-object document (IsObject rejects a string despite oneOf swagger)', async () => {
            assert.deepEqual(keys(await run(SchemaDTO, { document: 'inText' }), 'document'), ['isObject']);
        });
    });

    describe('SchemaWithSubSchemasDTO bare nested fields', () => {
        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(SchemaWithSubSchemasDTO, {})).length, 0);
        });

        it('LATENT: schema has no IsObject constraint, any primitive passes', async () => {
            assert.equal((await run(SchemaWithSubSchemasDTO, { schema: 'not-an-object' })).length, 0);
        });

        it('LATENT: schema is not deep-validated, garbage object passes', async () => {
            assert.equal((await run(SchemaWithSubSchemasDTO, { schema: { entity: 5 } })).length, 0);
        });

        it('LATENT: subSchemas has no IsArray constraint, a string passes', async () => {
            assert.equal((await run(SchemaWithSubSchemasDTO, { subSchemas: 'not-an-array' })).length, 0);
        });

        it('LATENT: subSchemas elements are not deep-validated, garbage passes', async () => {
            assert.equal((await run(SchemaWithSubSchemasDTO, { subSchemas: [{ status: 5 }, 'junk'] })).length, 0);
        });
    });

    describe('SystemSchemaDTO enforced enum (positive contrast)', () => {
        it('accepts a valid entity', async () => {
            assert.equal((await run(SystemSchemaDTO, { name: 'N', entity: 'STANDARD_REGISTRY' })).length, 0);
        });

        it('CONTRAST: entity enum IS enforced via IsIn, an invalid value is rejected', async () => {
            assert.ok(keys(await run(SystemSchemaDTO, { name: 'N', entity: 'BOGUS' }), 'entity').includes('isIn'));
        });

        it('reports required name and entity when empty', async () => {
            const errors = await run(SystemSchemaDTO, {});
            assert.ok(keys(errors, 'name').includes('isString'));
            assert.ok(keys(errors, 'entity').includes('isString'));
        });
    });

    describe('SchemaImportDuplicatesRequestDTO', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(SchemaImportDuplicatesRequestDTO, { policyId: '0.0.1', schemaNames: ['A'] })).length, 0);
        });

        it('requires policyId and schemaNames when empty', async () => {
            const errors = await run(SchemaImportDuplicatesRequestDTO, {});
            assert.ok(keys(errors, 'policyId').includes('isString'));
            assert.ok(keys(errors, 'schemaNames').includes('isArray'));
        });

        it('LATENT: schemaNames is IsArray only, non-string elements pass', async () => {
            assert.equal((await run(SchemaImportDuplicatesRequestDTO, { policyId: 'p', schemaNames: [1, 2, {}] })).length, 0);
        });
    });

    describe('PolicyLabelDTO swagger-only enum status', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(PolicyLabelDTO, { name: 'L', status: 'DRAFT', config: {} })).length, 0);
        });

        it('requires name', async () => {
            assert.deepEqual(keys(await run(PolicyLabelDTO, {}), 'name'), ['isString']);
        });

        it('LATENT: status enum (EntityStatus) is not enforced, any string passes', async () => {
            assert.equal((await run(PolicyLabelDTO, { name: 'L', status: 'XX' })).length, 0);
        });

        it('rejects a non-object config', async () => {
            assert.deepEqual(keys(await run(PolicyLabelDTO, { name: 'L', config: 'x' }), 'config'), ['isObject']);
        });
    });

    describe('PolicyLabelRelationshipsDTO nested gaps', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(PolicyLabelRelationshipsDTO, { policy: {}, policySchemas: [], documentsSchemas: [] })).length, 0);
        });

        it('LATENT: policy (PolicyDTO) is validated as a plain object only, garbage passes', async () => {
            assert.equal((await run(PolicyLabelRelationshipsDTO, { policy: { status: 5 } })).length, 0);
        });

        it('LATENT: policySchemas array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyLabelRelationshipsDTO, { policySchemas: ['x', {}] })).length, 0);
        });

        it('rejects a non-object policy and non-array documentsSchemas', async () => {
            const errors = await run(PolicyLabelRelationshipsDTO, { policy: 'x', documentsSchemas: 'y' });
            assert.deepEqual(keys(errors, 'policy'), ['isObject']);
            assert.ok(keys(errors, 'documentsSchemas').includes('isArray'));
        });
    });

    describe('PolicyLabelDocumentDTO', () => {
        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(PolicyLabelDocumentDTO, {})).length, 0);
        });

        it('LATENT: relationships array of message ids is IsArray only, garbage passes', async () => {
            assert.equal((await run(PolicyLabelDocumentDTO, { relationships: [1, {}, null] })).length, 0);
        });

        it('rejects a non-array relationships', async () => {
            assert.ok(keys(await run(PolicyLabelDocumentDTO, { relationships: {} }), 'relationships').includes('isArray'));
        });

        it('rejects a non-object document', async () => {
            assert.deepEqual(keys(await run(PolicyLabelDocumentDTO, { document: 'x' }), 'document'), ['isObject']);
        });
    });

    describe('PolicyLabelDocumentRelationshipsDTO nested gaps', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(PolicyLabelDocumentRelationshipsDTO, { target: {}, relationships: [] })).length, 0);
        });

        it('LATENT: target (VpDocumentDTO) is validated as a plain object only, garbage passes', async () => {
            assert.equal((await run(PolicyLabelDocumentRelationshipsDTO, { target: { id: 5 } })).length, 0);
        });

        it('LATENT: relationships array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyLabelDocumentRelationshipsDTO, { relationships: ['x', 1] })).length, 0);
        });

        it('rejects a non-object target', async () => {
            assert.deepEqual(keys(await run(PolicyLabelDocumentRelationshipsDTO, { target: 'x' }), 'target'), ['isObject']);
        });
    });

    describe('PolicyLabelComponentsDTO nested gaps', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(PolicyLabelComponentsDTO, { statistics: [], labels: [] })).length, 0);
        });

        it('LATENT: statistics array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyLabelComponentsDTO, { statistics: [{}, 'x'] })).length, 0);
        });

        it('LATENT: labels array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(PolicyLabelComponentsDTO, { labels: [{ name: 5 }] })).length, 0);
        });

        it('rejects a non-array statistics', async () => {
            assert.ok(keys(await run(PolicyLabelComponentsDTO, { statistics: {} }), 'statistics').includes('isArray'));
        });
    });

    describe('PolicyLabelFiltersDTO swagger-only enum components', () => {
        it('accepts an empty payload (all optional)', async () => {
            assert.equal((await run(PolicyLabelFiltersDTO, {})).length, 0);
        });

        it('accepts a documented enum value', async () => {
            assert.equal((await run(PolicyLabelFiltersDTO, { components: 'label' })).length, 0);
        });

        it('LATENT: components enum [all|label|statistic] is not enforced, any string passes', async () => {
            assert.equal((await run(PolicyLabelFiltersDTO, { components: 'NOPE' })).length, 0);
        });

        it('rejects a non-string components', async () => {
            assert.deepEqual(keys(await run(PolicyLabelFiltersDTO, { components: 5 }), 'components'), ['isString']);
        });
    });

    describe('SchemaRuleDTO swagger-only enum status', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(SchemaRuleDTO, { name: 'R', status: 'DRAFT', config: {} })).length, 0);
        });

        it('requires name', async () => {
            assert.deepEqual(keys(await run(SchemaRuleDTO, {}), 'name'), ['isString']);
        });

        it('LATENT: status enum (EntityStatus) is not enforced, any string passes', async () => {
            assert.equal((await run(SchemaRuleDTO, { name: 'R', status: 'XX' })).length, 0);
        });

        it('rejects a non-object config', async () => {
            assert.deepEqual(keys(await run(SchemaRuleDTO, { name: 'R', config: 'x' }), 'config'), ['isObject']);
        });
    });

    describe('SchemaRuleRelationshipsDTO nested gaps', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(SchemaRuleRelationshipsDTO, { policy: {}, schemas: [] })).length, 0);
        });

        it('LATENT: policy (PolicyDTO) is validated as a plain object only, garbage passes', async () => {
            assert.equal((await run(SchemaRuleRelationshipsDTO, { policy: { status: 5 } })).length, 0);
        });

        it('LATENT: schemas array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(SchemaRuleRelationshipsDTO, { schemas: ['x', 1] })).length, 0);
        });

        it('rejects a non-object policy and non-array schemas', async () => {
            const errors = await run(SchemaRuleRelationshipsDTO, { policy: 'x', schemas: 'y' });
            assert.deepEqual(keys(errors, 'policy'), ['isObject']);
            assert.ok(keys(errors, 'schemas').includes('isArray'));
        });
    });

    describe('SchemaRuleDataDTO nested gaps', () => {
        it('accepts a valid payload', async () => {
            assert.equal((await run(SchemaRuleDataDTO, { rules: {}, document: {}, relationships: [] })).length, 0);
        });

        it('LATENT: rules (SchemaRuleDTO) is validated as a plain object only, garbage passes', async () => {
            assert.equal((await run(SchemaRuleDataDTO, { rules: { name: 5 } })).length, 0);
        });

        it('LATENT: relationships array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(SchemaRuleDataDTO, { relationships: [{}, 'x'] })).length, 0);
        });

        it('rejects a non-object rules and non-array relationships', async () => {
            const errors = await run(SchemaRuleDataDTO, { rules: 'x', relationships: 'y' });
            assert.deepEqual(keys(errors, 'rules'), ['isObject']);
            assert.ok(keys(errors, 'relationships').includes('isArray'));
        });
    });

    describe('Mock nested DTOs (typed but bare) gaps', () => {
        it('LATENT: MockTopicDataDTO.topic is plain-object only, garbage passes', async () => {
            assert.equal((await run(MockTopicDataDTO, { topic: { id: 5 } })).length, 0);
        });

        it('LATENT: MockTopicDataDTO.messages array is not deep-validated, garbage passes', async () => {
            assert.equal((await run(MockTopicDataDTO, { messages: [{ sequence_number: 'x' }, 1] })).length, 0);
        });

        it('LATENT: MockApiDataDTO.request is plain-object only, garbage passes', async () => {
            assert.equal((await run(MockApiDataDTO, { request: { method: 5 } })).length, 0);
        });

        it('LATENT: MockUserDataDTO.document is plain-object only, garbage passes', async () => {
            assert.equal((await run(MockUserDataDTO, { document: { id: 5 } })).length, 0);
        });
    });
});

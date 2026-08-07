import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    PolicyTestDTO,
    BasePolicyDTO,
    PolicyToolDTO,
    PolicyImportantParametersDTO,
    PolicyDTO,
    PolicyPreviewDTO,
    PolicyValidationDTO,
    PoliciesValidationDTO,
    PolicyCategoryDTO,
    PolicyVersionDTO,
    DebugBlockDataDTO,
    DebugBlockConfigDTO,
    DebugBlockResultDTO,
    DebugBlockHistoryDTO,
    IgnoreRuleDTO,
    DeleteSavepointsDTO,
    DeleteSavepointsResultDTO,
} from '../../dist/middlewares/validation/schemas/policies.dto.js';
import { PolicyParametersDTO } from '../../dist/middlewares/validation/schemas/policy-parameters.dto.js';
import {
    PolicyLabelDTO,
    PolicyLabelRelationshipsDTO,
    PolicyLabelDocumentDTO,
    PolicyLabelDocumentRelationshipsDTO,
    PolicyLabelComponentsDTO,
    PolicyLabelFiltersDTO,
} from '../../dist/middlewares/validation/schemas/policy-labels.dto.js';

const errorsFor = async (Dto, input) => validate(plainToInstance(Dto, input));

const props = (errs) => errs.map((e) => e.property).sort();

const constraintsFor = (errs, property) => {
    const found = errs.find((e) => e.property === property);
    return found ? Object.keys(found.constraints || {}) : [];
};

const childConstraints = (errs, property) => {
    const found = errs.find((e) => e.property === property);
    if (!found) {
        return [];
    }
    const out = [];
    const walk = (node) => {
        if (node.constraints) {
            out.push(...Object.keys(node.constraints));
        }
        (node.children || []).forEach(walk);
    };
    (found.children || []).forEach(walk);
    return out.sort();
};

describe('@unit api-gateway validation DTO policies', () => {
    describe('PolicyTestDTO', () => {
        it('accepts an empty payload (all optional)', async () => {
            const errs = await errorsFor(PolicyTestDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts a fully-populated valid payload', async () => {
            const errs = await errorsFor(PolicyTestDTO, {
                id: 'a',
                uuid: 'b',
                name: 'Test',
                policyId: 'p',
                owner: 'did',
                status: 'New',
                date: '2020-01-01',
                duration: 1,
                progress: 2,
                resultId: 'r',
                result: { ok: true },
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string id', async () => {
            const errs = await errorsFor(PolicyTestDTO, { id: 5 });
            assert.deepEqual(constraintsFor(errs, 'id'), ['isString']);
        });

        it('rejects non-number duration', async () => {
            const errs = await errorsFor(PolicyTestDTO, { duration: 'x' });
            assert.deepEqual(constraintsFor(errs, 'duration'), ['isNumber']);
        });

        it('rejects non-number progress', async () => {
            const errs = await errorsFor(PolicyTestDTO, { progress: 'x' });
            assert.deepEqual(constraintsFor(errs, 'progress'), ['isNumber']);
        });

        it('rejects non-object result', async () => {
            const errs = await errorsFor(PolicyTestDTO, { result: 'x' });
            assert.deepEqual(constraintsFor(errs, 'result'), ['isObject']);
        });
    });

    describe('BasePolicyDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(BasePolicyDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid id and name', async () => {
            const errs = await errorsFor(BasePolicyDTO, { id: 'a', name: 'b' });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string id and name', async () => {
            const errs = await errorsFor(BasePolicyDTO, { id: 1, name: 2 });
            assert.deepEqual(props(errs), ['id', 'name']);
            assert.deepEqual(constraintsFor(errs, 'name'), ['isString']);
        });
    });

    describe('PolicyToolDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(PolicyToolDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts a valid payload', async () => {
            const errs = await errorsFor(PolicyToolDTO, {
                name: 'Tool',
                version: '1.0.0',
                topicId: '0.0.1',
                messageId: 'm',
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string name', async () => {
            const errs = await errorsFor(PolicyToolDTO, { name: 5 });
            assert.deepEqual(constraintsFor(errs, 'name'), ['isString']);
        });

        it('rejects non-string topicId', async () => {
            const errs = await errorsFor(PolicyToolDTO, { topicId: 5 });
            assert.deepEqual(constraintsFor(errs, 'topicId'), ['isString']);
        });
    });

    describe('PolicyImportantParametersDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(PolicyImportantParametersDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid strings', async () => {
            const errs = await errorsFor(PolicyImportantParametersDTO, {
                atValidation: 'x',
                monitored: 'y',
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string fields', async () => {
            const errs = await errorsFor(PolicyImportantParametersDTO, {
                atValidation: 1,
                monitored: 2,
            });
            assert.deepEqual(props(errs), ['atValidation', 'monitored']);
        });
    });

    describe('PolicyDTO', () => {
        it('accepts an empty payload (every field optional)', async () => {
            const errs = await errorsFor(PolicyDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts a rich valid payload', async () => {
            const errs = await errorsFor(PolicyDTO, {
                id: 'a',
                uuid: 'b',
                name: 'Policy',
                description: 'd',
                status: 'DRAFT',
                originalChanged: false,
                config: { a: 1 },
                userRoles: ['Installer'],
                tools: [{ name: 't' }],
                ignoreRules: [{ severity: 'info' }],
                importantParameters: { atValidation: 'x' },
                tests: [{ name: 'one' }],
                categories: ['c'],
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string name', async () => {
            const errs = await errorsFor(PolicyDTO, { name: 5 });
            assert.deepEqual(constraintsFor(errs, 'name'), ['isString']);
        });

        it('rejects non-boolean originalChanged', async () => {
            const errs = await errorsFor(PolicyDTO, { originalChanged: 'x' });
            assert.deepEqual(constraintsFor(errs, 'originalChanged'), ['isBoolean']);
        });

        it('rejects non-object config', async () => {
            const errs = await errorsFor(PolicyDTO, { config: 'x' });
            assert.deepEqual(constraintsFor(errs, 'config'), ['isObject']);
        });

        it('rejects non-array userRoles', async () => {
            const errs = await errorsFor(PolicyDTO, { userRoles: 'x' });
            assert.deepEqual(constraintsFor(errs, 'userRoles'), ['isArray']);
        });

        it('rejects non-array tools', async () => {
            const errs = await errorsFor(PolicyDTO, { tools: 'x' });
            assert.ok(constraintsFor(errs, 'tools').includes('isArray'));
        });

        it('reports nested PolicyToolDTO constraint via ValidateNested each', async () => {
            const errs = await errorsFor(PolicyDTO, { tools: [{ name: 5 }] });
            assert.equal(errs.length, 1);
            assert.deepEqual(childConstraints(errs, 'tools'), ['isString']);
        });

        it('reports nested IgnoreRuleDTO severity constraint', async () => {
            const errs = await errorsFor(PolicyDTO, { ignoreRules: [{ severity: 'oops' }] });
            assert.equal(errs.length, 1);
            assert.deepEqual(childConstraints(errs, 'ignoreRules'), ['isIn']);
        });

        it('reports nested importantParameters constraint', async () => {
            const errs = await errorsFor(PolicyDTO, { importantParameters: { atValidation: 5 } });
            assert.deepEqual(childConstraints(errs, 'importantParameters'), ['isString']);
        });

        it('LATENT: editableParametersSettings ValidateNested only emits unknownValue (target DTO has no class-validator decorators)', async () => {
            const errs = await errorsFor(PolicyDTO, { editableParametersSettings: [{ junk: 1 }] });
            assert.equal(errs.length, 1);
            assert.deepEqual(childConstraints(errs, 'editableParametersSettings'), ['unknownValue']);
        });
    });

    describe('PolicyPreviewDTO', () => {
        it('accepts a valid payload', async () => {
            const errs = await errorsFor(PolicyPreviewDTO, { module: {}, messageId: 'm' });
            assert.equal(errs.length, 0);
        });

        it('rejects empty payload (module + messageId required)', async () => {
            const errs = await errorsFor(PolicyPreviewDTO, {});
            assert.deepEqual(props(errs), ['messageId', 'module']);
            assert.deepEqual(constraintsFor(errs, 'module'), ['isObject']);
            assert.deepEqual(constraintsFor(errs, 'messageId'), ['isString']);
        });

        it('rejects string module with isObject', async () => {
            const errs = await errorsFor(PolicyPreviewDTO, { module: 'x', messageId: 'm' });
            assert.deepEqual(constraintsFor(errs, 'module'), ['isObject']);
        });

        it('rejects non-array schemas', async () => {
            const errs = await errorsFor(PolicyPreviewDTO, { module: {}, messageId: 'm', schemas: 'x' });
            assert.deepEqual(constraintsFor(errs, 'schemas'), ['isArray']);
        });
    });

    describe('PolicyValidationDTO', () => {
        it('accepts a valid payload', async () => {
            const errs = await errorsFor(PolicyValidationDTO, { policy: {}, results: {} });
            assert.equal(errs.length, 0);
        });

        it('rejects empty payload (policy + results required objects)', async () => {
            const errs = await errorsFor(PolicyValidationDTO, {});
            assert.deepEqual(props(errs), ['policy', 'results']);
        });
    });

    describe('PoliciesValidationDTO', () => {
        it('accepts a valid payload', async () => {
            const errs = await errorsFor(PoliciesValidationDTO, { policies: [], isValid: true, errors: {} });
            assert.equal(errs.length, 0);
        });

        it('rejects empty payload (policies array, isValid bool, errors object)', async () => {
            const errs = await errorsFor(PoliciesValidationDTO, {});
            assert.deepEqual(props(errs), ['errors', 'isValid', 'policies']);
            assert.deepEqual(constraintsFor(errs, 'policies'), ['isArray']);
            assert.deepEqual(constraintsFor(errs, 'isValid'), ['isBoolean']);
            assert.deepEqual(constraintsFor(errs, 'errors'), ['isObject']);
        });

        it('rejects non-boolean isValid', async () => {
            const errs = await errorsFor(PoliciesValidationDTO, { policies: [], isValid: 'x', errors: {} });
            assert.deepEqual(constraintsFor(errs, 'isValid'), ['isBoolean']);
        });
    });

    describe('PolicyCategoryDTO', () => {
        it('accepts a valid payload', async () => {
            const errs = await errorsFor(PolicyCategoryDTO, { name: 'n', type: 't' });
            assert.equal(errs.length, 0);
        });

        it('rejects empty payload (name + type required)', async () => {
            const errs = await errorsFor(PolicyCategoryDTO, {});
            assert.deepEqual(props(errs), ['name', 'type']);
        });

        it('accepts optional id when valid', async () => {
            const errs = await errorsFor(PolicyCategoryDTO, { id: 'x', name: 'n', type: 't' });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string type', async () => {
            const errs = await errorsFor(PolicyCategoryDTO, { name: 'n', type: 5 });
            assert.deepEqual(constraintsFor(errs, 'type'), ['isString']);
        });
    });

    describe('PolicyVersionDTO', () => {
        it('accepts a minimal valid payload', async () => {
            const errs = await errorsFor(PolicyVersionDTO, { policyVersion: '1.0.0' });
            assert.equal(errs.length, 0);
        });

        it('accepts a full valid payload', async () => {
            const errs = await errorsFor(PolicyVersionDTO, {
                policyVersion: '1.0.0',
                policyAvailability: 'private',
                recordingEnabled: false,
            });
            assert.equal(errs.length, 0);
        });

        it('rejects missing policyVersion', async () => {
            const errs = await errorsFor(PolicyVersionDTO, {});
            assert.deepEqual(constraintsFor(errs, 'policyVersion'), ['isString']);
        });

        it('rejects non-boolean recordingEnabled', async () => {
            const errs = await errorsFor(PolicyVersionDTO, { policyVersion: '1.0.0', recordingEnabled: 'x' });
            assert.deepEqual(constraintsFor(errs, 'recordingEnabled'), ['isBoolean']);
        });
    });

    describe('DebugBlockDataDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(DebugBlockDataDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid strings', async () => {
            const errs = await errorsFor(DebugBlockDataDTO, { input: 'a', output: 'b', type: 'json' });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string type', async () => {
            const errs = await errorsFor(DebugBlockDataDTO, { type: 5 });
            assert.deepEqual(constraintsFor(errs, 'type'), ['isString']);
        });
    });

    describe('DebugBlockConfigDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(DebugBlockConfigDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid block and data objects', async () => {
            const errs = await errorsFor(DebugBlockConfigDTO, { block: {}, data: {} });
            assert.equal(errs.length, 0);
        });

        it('rejects non-object data', async () => {
            const errs = await errorsFor(DebugBlockConfigDTO, { data: 'x' });
            assert.deepEqual(constraintsFor(errs, 'data'), ['isObject']);
        });
    });

    describe('DebugBlockResultDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(DebugBlockResultDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid logs and errors arrays', async () => {
            const errs = await errorsFor(DebugBlockResultDTO, { logs: ['a'], errors: ['b'] });
            assert.equal(errs.length, 0);
        });

        it('rejects non-array logs', async () => {
            const errs = await errorsFor(DebugBlockResultDTO, { logs: 'x' });
            assert.deepEqual(constraintsFor(errs, 'logs'), ['isArray']);
        });
    });

    describe('DebugBlockHistoryDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(DebugBlockHistoryDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts a valid payload', async () => {
            const errs = await errorsFor(DebugBlockHistoryDTO, { id: 'x', createDate: 'd', document: {} });
            assert.equal(errs.length, 0);
        });

        it('rejects non-object document', async () => {
            const errs = await errorsFor(DebugBlockHistoryDTO, { document: 'x' });
            assert.deepEqual(constraintsFor(errs, 'document'), ['isObject']);
        });
    });

    describe('IgnoreRuleDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(IgnoreRuleDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts severity warning', async () => {
            const errs = await errorsFor(IgnoreRuleDTO, { severity: 'warning' });
            assert.equal(errs.length, 0);
        });

        it('accepts severity info', async () => {
            const errs = await errorsFor(IgnoreRuleDTO, { severity: 'info' });
            assert.equal(errs.length, 0);
        });

        it('rejects out-of-enum severity', async () => {
            const errs = await errorsFor(IgnoreRuleDTO, { severity: 'x' });
            assert.deepEqual(constraintsFor(errs, 'severity'), ['isIn']);
        });

        it('rejects non-string code', async () => {
            const errs = await errorsFor(IgnoreRuleDTO, { code: 5 });
            assert.deepEqual(constraintsFor(errs, 'code'), ['isString']);
        });
    });

    describe('DeleteSavepointsDTO', () => {
        it('accepts a valid payload', async () => {
            const errs = await errorsFor(DeleteSavepointsDTO, { savepointIds: ['a'] });
            assert.equal(errs.length, 0);
        });

        it('accepts optional skipCurrentSavepointGuard', async () => {
            const errs = await errorsFor(DeleteSavepointsDTO, { savepointIds: ['a'], skipCurrentSavepointGuard: true });
            assert.equal(errs.length, 0);
        });

        it('rejects missing savepointIds (isArray, arrayNotEmpty, isString each)', async () => {
            const errs = await errorsFor(DeleteSavepointsDTO, {});
            assert.deepEqual(constraintsFor(errs, 'savepointIds').sort(), ['arrayNotEmpty', 'isArray', 'isString']);
        });

        it('rejects empty savepointIds array with arrayNotEmpty', async () => {
            const errs = await errorsFor(DeleteSavepointsDTO, { savepointIds: [] });
            assert.deepEqual(constraintsFor(errs, 'savepointIds'), ['arrayNotEmpty']);
        });

        it('rejects non-string array element', async () => {
            const errs = await errorsFor(DeleteSavepointsDTO, { savepointIds: [1] });
            assert.deepEqual(constraintsFor(errs, 'savepointIds'), ['isString']);
        });

        it('rejects non-boolean skipCurrentSavepointGuard', async () => {
            const errs = await errorsFor(DeleteSavepointsDTO, { savepointIds: ['a'], skipCurrentSavepointGuard: 'x' });
            assert.deepEqual(constraintsFor(errs, 'skipCurrentSavepointGuard'), ['isBoolean']);
        });
    });

    describe('DeleteSavepointsResultDTO', () => {
        it('accepts a valid payload', async () => {
            const errs = await errorsFor(DeleteSavepointsResultDTO, { hardDeletedIds: [] });
            assert.equal(errs.length, 0);
        });

        it('rejects missing hardDeletedIds (isArray, isString each)', async () => {
            const errs = await errorsFor(DeleteSavepointsResultDTO, {});
            assert.deepEqual(constraintsFor(errs, 'hardDeletedIds').sort(), ['isArray', 'isString']);
        });

        it('rejects non-string element', async () => {
            const errs = await errorsFor(DeleteSavepointsResultDTO, { hardDeletedIds: [1] });
            assert.deepEqual(constraintsFor(errs, 'hardDeletedIds'), ['isString']);
        });
    });

    describe('PolicyParametersDTO', () => {
        it('accepts a minimal valid payload', async () => {
            const errs = await errorsFor(PolicyParametersDTO, { policyId: 'p' });
            assert.equal(errs.length, 0);
        });

        it('accepts optional updated flag', async () => {
            const errs = await errorsFor(PolicyParametersDTO, { policyId: 'p', updated: true });
            assert.equal(errs.length, 0);
        });

        it('rejects missing policyId', async () => {
            const errs = await errorsFor(PolicyParametersDTO, {});
            assert.deepEqual(constraintsFor(errs, 'policyId'), ['isString']);
        });

        it('rejects non-array config with isArray + nestedValidation', async () => {
            const errs = await errorsFor(PolicyParametersDTO, { policyId: 'p', config: 'x' });
            assert.deepEqual(constraintsFor(errs, 'config').sort(), ['isArray', 'nestedValidation']);
        });

        it('rejects non-boolean updated', async () => {
            const errs = await errorsFor(PolicyParametersDTO, { policyId: 'p', updated: 'x' });
            assert.deepEqual(constraintsFor(errs, 'updated'), ['isBoolean']);
        });

        it('LATENT: config array of PolicyEditableFieldDTO only emits unknownValue (target DTO has no decorators)', async () => {
            const errs = await errorsFor(PolicyParametersDTO, { policyId: 'p', config: [{ junk: 1 }] });
            assert.equal(errs.length, 1);
            assert.deepEqual(childConstraints(errs, 'config'), ['unknownValue']);
        });
    });

    describe('PolicyLabelDTO', () => {
        it('accepts a minimal valid payload', async () => {
            const errs = await errorsFor(PolicyLabelDTO, { name: 'n' });
            assert.equal(errs.length, 0);
        });

        it('accepts a full valid payload', async () => {
            const errs = await errorsFor(PolicyLabelDTO, {
                id: 'a',
                uuid: 'b',
                name: 'n',
                description: 'd',
                creator: 'did',
                owner: 'did',
                topicId: '0.0.1',
                status: 'DRAFT',
                config: {},
            });
            assert.equal(errs.length, 0);
        });

        it('rejects missing name', async () => {
            const errs = await errorsFor(PolicyLabelDTO, {});
            assert.deepEqual(constraintsFor(errs, 'name'), ['isString']);
        });

        it('rejects non-string name', async () => {
            const errs = await errorsFor(PolicyLabelDTO, { name: 5 });
            assert.deepEqual(constraintsFor(errs, 'name'), ['isString']);
        });

        it('rejects non-object config', async () => {
            const errs = await errorsFor(PolicyLabelDTO, { name: 'n', config: 'x' });
            assert.deepEqual(constraintsFor(errs, 'config'), ['isObject']);
        });
    });

    describe('PolicyLabelRelationshipsDTO', () => {
        it('accepts an empty payload (all optional)', async () => {
            const errs = await errorsFor(PolicyLabelRelationshipsDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid payload', async () => {
            const errs = await errorsFor(PolicyLabelRelationshipsDTO, { policy: {}, policySchemas: [] });
            assert.equal(errs.length, 0);
        });

        it('rejects non-object policy', async () => {
            const errs = await errorsFor(PolicyLabelRelationshipsDTO, { policy: 'x' });
            assert.deepEqual(constraintsFor(errs, 'policy'), ['isObject']);
        });

        it('rejects non-array policySchemas', async () => {
            const errs = await errorsFor(PolicyLabelRelationshipsDTO, { policySchemas: 'x' });
            assert.deepEqual(constraintsFor(errs, 'policySchemas'), ['isArray']);
        });
    });

    describe('PolicyLabelDocumentDTO', () => {
        it('accepts an empty payload (all fields optional)', async () => {
            const errs = await errorsFor(PolicyLabelDocumentDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts a valid payload', async () => {
            const errs = await errorsFor(PolicyLabelDocumentDTO, {
                id: 'a',
                definitionId: 'b',
                relationships: ['m'],
                document: {},
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string topicId', async () => {
            const errs = await errorsFor(PolicyLabelDocumentDTO, { topicId: 5 });
            assert.deepEqual(constraintsFor(errs, 'topicId'), ['isString']);
        });

        it('rejects non-array relationships', async () => {
            const errs = await errorsFor(PolicyLabelDocumentDTO, { relationships: 'x' });
            assert.deepEqual(constraintsFor(errs, 'relationships'), ['isArray']);
        });

        it('rejects non-object document', async () => {
            const errs = await errorsFor(PolicyLabelDocumentDTO, { document: 'x' });
            assert.deepEqual(constraintsFor(errs, 'document'), ['isObject']);
        });
    });

    describe('PolicyLabelDocumentRelationshipsDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(PolicyLabelDocumentRelationshipsDTO, {});
            assert.equal(errs.length, 0);
        });

        it('rejects non-object target', async () => {
            const errs = await errorsFor(PolicyLabelDocumentRelationshipsDTO, { target: 'x' });
            assert.deepEqual(constraintsFor(errs, 'target'), ['isObject']);
        });

        it('rejects non-array relationships', async () => {
            const errs = await errorsFor(PolicyLabelDocumentRelationshipsDTO, { relationships: 'x' });
            assert.deepEqual(constraintsFor(errs, 'relationships'), ['isArray']);
        });
    });

    describe('PolicyLabelComponentsDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(PolicyLabelComponentsDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid arrays', async () => {
            const errs = await errorsFor(PolicyLabelComponentsDTO, { statistics: [], labels: [] });
            assert.equal(errs.length, 0);
        });

        it('rejects non-array statistics', async () => {
            const errs = await errorsFor(PolicyLabelComponentsDTO, { statistics: 'x' });
            assert.deepEqual(constraintsFor(errs, 'statistics'), ['isArray']);
        });

        it('rejects non-array labels', async () => {
            const errs = await errorsFor(PolicyLabelComponentsDTO, { labels: 'x' });
            assert.deepEqual(constraintsFor(errs, 'labels'), ['isArray']);
        });
    });

    describe('PolicyLabelFiltersDTO', () => {
        it('accepts an empty payload', async () => {
            const errs = await errorsFor(PolicyLabelFiltersDTO, {});
            assert.equal(errs.length, 0);
        });

        it('accepts valid filters', async () => {
            const errs = await errorsFor(PolicyLabelFiltersDTO, { text: 't', owner: 'o', components: 'all' });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string text', async () => {
            const errs = await errorsFor(PolicyLabelFiltersDTO, { text: 5 });
            assert.deepEqual(constraintsFor(errs, 'text'), ['isString']);
        });

        it('LATENT: components accepts any string (only @IsString, enum not enforced)', async () => {
            const errs = await errorsFor(PolicyLabelFiltersDTO, { components: 'not-a-valid-enum' });
            assert.equal(errs.length, 0);
        });
    });
});

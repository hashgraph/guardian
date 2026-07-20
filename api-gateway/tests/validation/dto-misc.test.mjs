import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    StatisticDefinitionDTO,
    StatisticAssessmentDTO,
    StatisticAssessmentRelationshipsDTO,
    StatisticDefinitionRelationshipsDTO,
} from '../../dist/middlewares/validation/schemas/policy-statistics.dto.js';
import {
    NotificationDTO,
    ProgressDTO,
} from '../../dist/middlewares/validation/schemas/notifications.js';
import {
    AboutResponseDTO,
    SettingsDTO,
} from '../../dist/middlewares/validation/schemas/settings.js';
import {
    SuggestionsInputDTO,
    SuggestionsOutputDTO,
    SuggestionsConfigItemDTO,
    SuggestionsConfigDTO,
} from '../../dist/middlewares/validation/schemas/suggestions.js';
import { WorkersTasksDTO } from '../../dist/middlewares/validation/schemas/worker-tasks.dto.js';
import { AssignPolicyDTO } from '../../dist/middlewares/validation/schemas/permissions.dto.js';

const errorsFor = async (Dto, input) => validate(plainToInstance(Dto, input));

const props = (errs) => errs.map((e) => e.property).sort();

const constraintsFor = (errs, property) => {
    const found = errs.find((e) => e.property === property);
    return found ? Object.keys(found.constraints || {}) : [];
};

describe('policy-statistics.dto @unit', () => {
    describe('StatisticDefinitionDTO', () => {
        it('passes with all valid fields', async () => {
            const errs = await errorsFor(StatisticDefinitionDTO, {
                id: 'abc',
                uuid: 'u-1',
                name: 'Tool name',
                description: 'desc',
                creator: 'did:hedera',
                owner: 'did:hedera',
                topicId: '0.0.1',
                messageId: 'm-1',
                policyId: 'p-1',
                policyTopicId: '0.0.2',
                policyInstanceTopicId: '0.0.3',
                status: 'DRAFT',
                config: { a: 1 },
            });
            assert.equal(errs.length, 0);
        });

        it('passes with only required name', async () => {
            const errs = await errorsFor(StatisticDefinitionDTO, { name: 'X' });
            assert.equal(errs.length, 0);
        });

        it('fails when name is missing', async () => {
            const errs = await errorsFor(StatisticDefinitionDTO, {});
            assert.ok(constraintsFor(errs, 'name').includes('isString'));
        });

        it('fails when name is not a string', async () => {
            const errs = await errorsFor(StatisticDefinitionDTO, { name: 123 });
            assert.ok(constraintsFor(errs, 'name').includes('isString'));
        });

        it('fails when uuid is not a string', async () => {
            const errs = await errorsFor(StatisticDefinitionDTO, { name: 'X', uuid: 5 });
            assert.ok(constraintsFor(errs, 'uuid').includes('isString'));
        });

        it('fails when config is not an object', async () => {
            const errs = await errorsFor(StatisticDefinitionDTO, { name: 'X', config: 'nope' });
            assert.ok(constraintsFor(errs, 'config').includes('isObject'));
        });

        it('omitting optionals yields no errors for them', async () => {
            const errs = await errorsFor(StatisticDefinitionDTO, { name: 'X' });
            assert.equal(errs.length, 0);
        });
    });

    describe('StatisticAssessmentDTO', () => {
        it('passes with valid fields', async () => {
            const errs = await errorsFor(StatisticAssessmentDTO, {
                id: 'i',
                definitionId: 'd',
                policyId: 'p',
                policyTopicId: '0.0.1',
                policyInstanceTopicId: '0.0.2',
                topicId: '0.0.3',
                creator: 'did',
                owner: 'did',
                messageId: 'm',
                target: 'm2',
                relationships: ['m3'],
                document: { x: 1 },
            });
            assert.equal(errs.length, 0);
        });

        it('passes with empty object since all are optional', async () => {
            const errs = await errorsFor(StatisticAssessmentDTO, {});
            assert.equal(errs.length, 0);
        });

        it('fails when relationships is not an array', async () => {
            const errs = await errorsFor(StatisticAssessmentDTO, { relationships: 'no' });
            assert.ok(constraintsFor(errs, 'relationships').includes('isArray'));
        });

        it('fails when document is not an object', async () => {
            const errs = await errorsFor(StatisticAssessmentDTO, { document: 7 });
            assert.ok(constraintsFor(errs, 'document').includes('isObject'));
        });

        it('fails when topicId is not a string', async () => {
            const errs = await errorsFor(StatisticAssessmentDTO, { topicId: 9 });
            assert.ok(constraintsFor(errs, 'topicId').includes('isString'));
        });
    });

    describe('StatisticAssessmentRelationshipsDTO', () => {
        it('passes with valid object and array', async () => {
            const errs = await errorsFor(StatisticAssessmentRelationshipsDTO, {
                target: { id: 1 },
                relationships: [{ id: 2 }],
            });
            assert.equal(errs.length, 0);
        });

        it('passes when empty (all optional)', async () => {
            const errs = await errorsFor(StatisticAssessmentRelationshipsDTO, {});
            assert.equal(errs.length, 0);
        });

        it('fails when target is not an object', async () => {
            const errs = await errorsFor(StatisticAssessmentRelationshipsDTO, { target: 'x' });
            assert.ok(constraintsFor(errs, 'target').includes('isObject'));
        });

        it('fails when relationships is not an array', async () => {
            const errs = await errorsFor(StatisticAssessmentRelationshipsDTO, { relationships: 1 });
            assert.ok(constraintsFor(errs, 'relationships').includes('isArray'));
        });
    });

    describe('StatisticDefinitionRelationshipsDTO', () => {
        it('passes with valid policy, schemas and schema', async () => {
            const errs = await errorsFor(StatisticDefinitionRelationshipsDTO, {
                policy: { id: 1 },
                schemas: [{ id: 2 }],
                schema: { id: 3 },
            });
            assert.equal(errs.length, 0);
        });

        it('passes when empty (all optional)', async () => {
            const errs = await errorsFor(StatisticDefinitionRelationshipsDTO, {});
            assert.equal(errs.length, 0);
        });

        it('fails when policy is not an object', async () => {
            const errs = await errorsFor(StatisticDefinitionRelationshipsDTO, { policy: 'x' });
            assert.ok(constraintsFor(errs, 'policy').includes('isObject'));
        });

        it('fails when schemas is not an array', async () => {
            const errs = await errorsFor(StatisticDefinitionRelationshipsDTO, { schemas: 5 });
            assert.ok(constraintsFor(errs, 'schemas').includes('isArray'));
        });
    });
});

describe('notifications @unit', () => {
    describe('NotificationDTO', () => {
        it('passes with valid type and optionals', async () => {
            const errs = await errorsFor(NotificationDTO, {
                id: 'i',
                createDate: '2020-01-01',
                updateDate: '2020-01-02',
                userId: 'u',
                title: 't',
                message: 'm',
                type: 'SUCCESS',
                action: 'POLICY_CONFIGURATION',
                result: { a: 1 },
                read: false,
                old: true,
            });
            assert.equal(errs.length, 0);
        });

        it('passes with only required type', async () => {
            const errs = await errorsFor(NotificationDTO, { type: 'INFO' });
            assert.equal(errs.length, 0);
        });

        it('fails when type is missing', async () => {
            const errs = await errorsFor(NotificationDTO, {});
            assert.ok(constraintsFor(errs, 'type').includes('isEnum'));
        });

        it('fails when type is not in enum', async () => {
            const errs = await errorsFor(NotificationDTO, { type: 'NOPE' });
            assert.ok(constraintsFor(errs, 'type').includes('isEnum'));
        });

        it('fails when action is not in enum', async () => {
            const errs = await errorsFor(NotificationDTO, { type: 'INFO', action: 'BAD' });
            assert.ok(constraintsFor(errs, 'action').includes('isEnum'));
        });

        it('fails when read is not a boolean', async () => {
            const errs = await errorsFor(NotificationDTO, { type: 'INFO', read: 'yes' });
            assert.ok(constraintsFor(errs, 'read').includes('isBoolean'));
        });

        it('fails when title is not a string', async () => {
            const errs = await errorsFor(NotificationDTO, { type: 'INFO', title: 9 });
            assert.ok(constraintsFor(errs, 'title').includes('isString'));
        });
    });

    describe('ProgressDTO', () => {
        it('passes with valid required fields', async () => {
            const errs = await errorsFor(ProgressDTO, {
                action: 'Publish policy',
                progress: 50,
                type: 'INFO',
            });
            assert.equal(errs.length, 0);
        });

        it('fails when required fields are missing', async () => {
            const errs = await errorsFor(ProgressDTO, {});
            assert.deepEqual(props(errs), ['action', 'progress', 'type']);
        });

        it('fails when action is not a string', async () => {
            const errs = await errorsFor(ProgressDTO, { action: 1, progress: 0, type: 'INFO' });
            assert.ok(constraintsFor(errs, 'action').includes('isString'));
        });

        it('fails when progress is not a number', async () => {
            const errs = await errorsFor(ProgressDTO, { action: 'a', progress: 'x', type: 'INFO' });
            assert.ok(constraintsFor(errs, 'progress').includes('isNumber'));
        });

        it('fails when type is not in enum', async () => {
            const errs = await errorsFor(ProgressDTO, { action: 'a', progress: 0, type: 'X' });
            assert.ok(constraintsFor(errs, 'type').includes('isEnum'));
        });

        it('passes with optional taskId and message', async () => {
            const errs = await errorsFor(ProgressDTO, {
                action: 'a',
                progress: 100,
                type: 'WARN',
                message: 'msg',
                taskId: 'task-1',
            });
            assert.equal(errs.length, 0);
        });
    });
});

describe('settings @unit', () => {
    describe('AboutResponseDTO', () => {
        it('passes with a version string', async () => {
            const errs = await errorsFor(AboutResponseDTO, { version: '2.8.1' });
            assert.equal(errs.length, 0);
        });

        it('fails when version is missing', async () => {
            const errs = await errorsFor(AboutResponseDTO, {});
            assert.ok(constraintsFor(errs, 'version').includes('isString'));
        });

        it('fails when version is not a string', async () => {
            const errs = await errorsFor(AboutResponseDTO, { version: 281 });
            assert.ok(constraintsFor(errs, 'version').includes('isString'));
        });
    });

    describe('SettingsDTO', () => {
        it('passes with all three non-empty strings', async () => {
            const errs = await errorsFor(SettingsDTO, {
                ipfsStorageApiKey: 'key',
                operatorId: '0.0.1',
                operatorKey: 'secret',
            });
            assert.equal(errs.length, 0);
        });

        it('fails when all are missing', async () => {
            const errs = await errorsFor(SettingsDTO, {});
            assert.deepEqual(props(errs), ['ipfsStorageApiKey', 'operatorId', 'operatorKey']);
        });

        it('fails isNotEmpty when ipfsStorageApiKey is empty string', async () => {
            const errs = await errorsFor(SettingsDTO, {
                ipfsStorageApiKey: '',
                operatorId: 'o',
                operatorKey: 'k',
            });
            assert.ok(constraintsFor(errs, 'ipfsStorageApiKey').includes('isNotEmpty'));
        });

        it('fails isString when operatorId is a number', async () => {
            const errs = await errorsFor(SettingsDTO, {
                ipfsStorageApiKey: 'k',
                operatorId: 1,
                operatorKey: 'k',
            });
            assert.ok(constraintsFor(errs, 'operatorId').includes('isString'));
        });
    });
});

describe('suggestions @unit', () => {
    describe('SuggestionsInputDTO', () => {
        it('passes with valid blockType', async () => {
            const errs = await errorsFor(SuggestionsInputDTO, { blockType: 'block' });
            assert.equal(errs.length, 0);
        });

        it('fails when blockType is missing', async () => {
            const errs = await errorsFor(SuggestionsInputDTO, {});
            assert.ok(constraintsFor(errs, 'blockType').includes('isNotEmpty'));
        });

        it('fails when blockType is empty string', async () => {
            const errs = await errorsFor(SuggestionsInputDTO, { blockType: '' });
            assert.ok(constraintsFor(errs, 'blockType').includes('isNotEmpty'));
        });

        it('children are not validated (no decorators)', async () => {
            const errs = await errorsFor(SuggestionsInputDTO, {
                blockType: 'b',
                children: 'not-an-array',
            });
            assert.equal(errs.length, 0);
        });
    });

    describe('SuggestionsOutputDTO', () => {
        it('passes with valid strings', async () => {
            const errs = await errorsFor(SuggestionsOutputDTO, { next: 'a', nested: 'b' });
            assert.equal(errs.length, 0);
        });

        it('fails when next and nested are missing', async () => {
            const errs = await errorsFor(SuggestionsOutputDTO, {});
            assert.deepEqual(props(errs), ['nested', 'next']);
        });

        it('fails when next is not a string', async () => {
            const errs = await errorsFor(SuggestionsOutputDTO, { next: 1, nested: 'b' });
            assert.ok(constraintsFor(errs, 'next').includes('isString'));
        });
    });

    describe('SuggestionsConfigItemDTO', () => {
        it('passes with valid id, enum type and int index', async () => {
            const errs = await errorsFor(SuggestionsConfigItemDTO, {
                id: 'x',
                type: 'Policy',
                index: 0,
            });
            assert.equal(errs.length, 0);
        });

        it('fails when id is empty', async () => {
            const errs = await errorsFor(SuggestionsConfigItemDTO, {
                id: '',
                type: 'Module',
                index: 1,
            });
            assert.ok(constraintsFor(errs, 'id').includes('isNotEmpty'));
        });

        it('fails when type is not in enum', async () => {
            const errs = await errorsFor(SuggestionsConfigItemDTO, {
                id: 'x',
                type: 'Bad',
                index: 1,
            });
            assert.ok(constraintsFor(errs, 'type').includes('isEnum'));
        });

        it('fails when index is not an int', async () => {
            const errs = await errorsFor(SuggestionsConfigItemDTO, {
                id: 'x',
                type: 'Policy',
                index: 1.5,
            });
            assert.ok(constraintsFor(errs, 'index').includes('isInt'));
        });

        it('fails when index is a string', async () => {
            const errs = await errorsFor(SuggestionsConfigItemDTO, {
                id: 'x',
                type: 'Policy',
                index: 'no',
            });
            assert.ok(constraintsFor(errs, 'index').includes('isInt'));
        });
    });

    describe('SuggestionsConfigDTO', () => {
        it('passes with an array of items', async () => {
            const errs = await errorsFor(SuggestionsConfigDTO, {
                items: [{ id: 'x', type: 'Policy', index: 0 }],
            });
            assert.equal(errs.length, 0);
        });

        it('passes with empty array', async () => {
            const errs = await errorsFor(SuggestionsConfigDTO, { items: [] });
            assert.equal(errs.length, 0);
        });

        it('fails when items is not an array', async () => {
            const errs = await errorsFor(SuggestionsConfigDTO, { items: 'no' });
            assert.ok(constraintsFor(errs, 'items').includes('isArray'));
        });

        it('does not deep-validate nested items (no ValidateNested)', async () => {
            const errs = await errorsFor(SuggestionsConfigDTO, {
                items: [{ id: '', type: 'Bad', index: 1.5 }],
            });
            assert.equal(errs.length, 0);
        });
    });
});

describe('worker-tasks.dto @unit', () => {
    describe('WorkersTasksDTO', () => {
        it('passes with all valid fields', async () => {
            const errs = await errorsFor(WorkersTasksDTO, {
                createDate: '2020-01-01',
                done: true,
                id: 'id',
                isRetryableTask: false,
                processedTime: '2020-01-02',
                sent: true,
                taskId: 'uuid',
                type: 'send-hedera',
                updateDate: '2020-01-03',
            });
            assert.equal(errs.length, 0);
        });

        it('fails when all required fields are missing', async () => {
            const errs = await errorsFor(WorkersTasksDTO, {});
            assert.deepEqual(props(errs), [
                'createDate',
                'done',
                'id',
                'isRetryableTask',
                'processedTime',
                'sent',
                'taskId',
                'type',
                'updateDate',
            ]);
        });

        it('fails when done is not a boolean', async () => {
            const errs = await errorsFor(WorkersTasksDTO, {
                createDate: 'd',
                done: 'yes',
                id: 'i',
                isRetryableTask: true,
                processedTime: 'p',
                sent: true,
                taskId: 't',
                type: 'send-hedera',
                updateDate: 'u',
            });
            assert.ok(constraintsFor(errs, 'done').includes('isBoolean'));
        });

        it('fails when id is not a string', async () => {
            const errs = await errorsFor(WorkersTasksDTO, {
                createDate: 'd',
                done: true,
                id: 5,
                isRetryableTask: true,
                processedTime: 'p',
                sent: true,
                taskId: 't',
                type: 'send-hedera',
                updateDate: 'u',
            });
            assert.ok(constraintsFor(errs, 'id').includes('isString'));
        });

        it('fails when sent is not a boolean', async () => {
            const errs = await errorsFor(WorkersTasksDTO, {
                createDate: 'd',
                done: true,
                id: 'i',
                isRetryableTask: true,
                processedTime: 'p',
                sent: 1,
                taskId: 't',
                type: 'send-hedera',
                updateDate: 'u',
            });
            assert.ok(constraintsFor(errs, 'sent').includes('isBoolean'));
        });
    });
});

describe('permissions.dto @unit', () => {
    describe('AssignPolicyDTO', () => {
        it('passes with array and boolean', async () => {
            const errs = await errorsFor(AssignPolicyDTO, { policyIds: ['a', 'b'], assign: true });
            assert.equal(errs.length, 0);
        });

        it('fails when policyIds and assign are missing', async () => {
            const errs = await errorsFor(AssignPolicyDTO, {});
            assert.deepEqual(props(errs), ['assign', 'policyIds']);
        });

        it('fails when policyIds is not an array', async () => {
            const errs = await errorsFor(AssignPolicyDTO, { policyIds: 'x', assign: true });
            assert.ok(constraintsFor(errs, 'policyIds').includes('isArray'));
        });

        it('fails when assign is not a boolean', async () => {
            const errs = await errorsFor(AssignPolicyDTO, { policyIds: [], assign: 'yes' });
            assert.ok(constraintsFor(errs, 'assign').includes('isBoolean'));
        });

        it('passes with empty array', async () => {
            const errs = await errorsFor(AssignPolicyDTO, { policyIds: [], assign: false });
            assert.equal(errs.length, 0);
        });
    });
});

import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
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
import {
    UserDTO,
    ProfileDidDocumentRecordDTO,
    ProfileVcDocumentDTO,
    ProfileDTO,
    PolicyKeyDTO,
    PolicyKeyConfigDTO,
} from '../../dist/middlewares/validation/schemas/profiles.dto.js';
import {
    RecordStatusDTO,
    RecordActionDTO,
    ResultDocumentDTO,
    ResultInfoDTO,
    RunningResultDTO,
    RunningDetailsDTO,
} from '../../dist/middlewares/validation/schemas/record.js';

const errorsFor = async (Dto, input) => validate(plainToInstance(Dto, input));

const props = (errs) => errs.map((e) => e.property).sort();

const constraintsFor = (errs, property) => {
    const found = errs.find((e) => e.property === property);
    return found ? Object.keys(found.constraints || {}) : [];
};

describe('@unit api-gateway validation DTO schemas/profiles/record', () => {
    describe('SchemaDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(SchemaDTO, {
                id: '000000000000000000000001',
                uuid: 'a-uuid',
                name: 'Schema name',
                description: 'desc',
                entity: 'POLICY',
                iri: '#iri',
                status: 'DRAFT',
                topicId: '0.0.1',
                version: '1.0.0',
                creator: 'did:hedera:x',
                owner: 'did:hedera:x',
                category: 'POLICY',
                document: {},
                context: {},
            });
            assert.equal(errs.length, 0);
        });

        it('accepts an empty payload (all fields optional)', async () => {
            const errs = await errorsFor(SchemaDTO, {});
            assert.equal(errs.length, 0);
        });

        it('rejects non-string name', async () => {
            const errs = await errorsFor(SchemaDTO, { name: 123 });
            assert.deepEqual(constraintsFor(errs, 'name'), ['isString']);
        });

        it('rejects non-object document', async () => {
            const errs = await errorsFor(SchemaDTO, { document: 'not-an-object' });
            assert.deepEqual(constraintsFor(errs, 'document'), ['isObject']);
        });

        it('accepts object context but rejects string context', async () => {
            const ok = await errorsFor(SchemaDTO, { context: { a: 1 } });
            assert.equal(ok.length, 0);
            const bad = await errorsFor(SchemaDTO, { context: 'string-context' });
            assert.deepEqual(constraintsFor(bad, 'context'), ['isObject']);
        });

        it('does not validate undecorated boolean/number fields', async () => {
            const errs = await errorsFor(SchemaDTO, {
                readonly: 'yes',
                system: 'no',
                active: 'maybe',
                topicCount: 'lots',
                createDate: 12345,
            });
            assert.equal(errs.length, 0);
        });
    });

    describe('SchemaParentDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(SchemaParentDTO, {
                id: '1',
                name: 'n',
                status: 'PUBLISHED',
                version: '1.0.0',
                sourceVersion: '',
                category: 'POLICY',
            });
            assert.equal(errs.length, 0);
        });

        it('accepts empty payload', async () => {
            const errs = await errorsFor(SchemaParentDTO, {});
            assert.equal(errs.length, 0);
        });

        it('rejects non-string version', async () => {
            const errs = await errorsFor(SchemaParentDTO, { version: 100 });
            assert.deepEqual(constraintsFor(errs, 'version'), ['isString']);
        });
    });

    describe('SchemaListAllItemDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(SchemaListAllItemDTO, {
                id: '1',
                name: 'n',
                description: 'd',
                status: 'PUBLISHED',
                version: '1.0.0',
                sourceVersion: '',
                topicId: '0.0.1',
                category: 'POLICY',
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string topicId', async () => {
            const errs = await errorsFor(SchemaListAllItemDTO, { topicId: 1 });
            assert.deepEqual(constraintsFor(errs, 'topicId'), ['isString']);
        });
    });

    describe('SchemaWithSubSchemasDTO', () => {
        it('accepts empty payload', async () => {
            const errs = await errorsFor(SchemaWithSubSchemasDTO, {});
            assert.equal(errs.length, 0);
        });

        it('does not deep-validate nested schema/subSchemas (only @IsOptional)', async () => {
            const errs = await errorsFor(SchemaWithSubSchemasDTO, {
                schema: { name: 123 },
                subSchemas: 'not-an-array',
            });
            assert.equal(errs.length, 0);
        });
    });

    describe('SchemaPushCopyRequestDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(SchemaPushCopyRequestDTO, {
                topicId: '0.0.1',
                name: 'copy',
                iri: '#uuid&1.0.0',
                copyNested: true,
            });
            assert.equal(errs.length, 0);
        });

        it('rejects empty topicId', async () => {
            const errs = await errorsFor(SchemaPushCopyRequestDTO, {
                topicId: '',
                name: 'copy',
                iri: '#x',
                copyNested: false,
            });
            assert.deepEqual(constraintsFor(errs, 'topicId'), ['isNotEmpty']);
        });

        it('rejects missing/non-boolean copyNested', async () => {
            const errs = await errorsFor(SchemaPushCopyRequestDTO, {
                topicId: '0.0.1',
                name: 'copy',
                iri: '#x',
                copyNested: 'true',
            });
            assert.deepEqual(constraintsFor(errs, 'copyNested'), ['isBoolean']);
        });

        it('rejects missing required string fields', async () => {
            const errs = await errorsFor(SchemaPushCopyRequestDTO, { copyNested: true });
            assert.deepEqual(props(errs), ['iri', 'name', 'topicId']);
            assert.deepEqual(constraintsFor(errs, 'name'), ['isNotEmpty', 'isString']);
        });
    });

    describe('SchemaImportDuplicatesRequestDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(SchemaImportDuplicatesRequestDTO, {
                policyId: '0.0.1',
                schemaNames: ['A', 'B'],
            });
            assert.equal(errs.length, 0);
        });

        it('accepts empty schemaNames array', async () => {
            const errs = await errorsFor(SchemaImportDuplicatesRequestDTO, {
                policyId: '0.0.1',
                schemaNames: [],
            });
            assert.equal(errs.length, 0);
        });

        it('rejects empty policyId', async () => {
            const errs = await errorsFor(SchemaImportDuplicatesRequestDTO, {
                policyId: '',
                schemaNames: [],
            });
            assert.deepEqual(constraintsFor(errs, 'policyId'), ['isNotEmpty']);
        });

        it('rejects non-array schemaNames', async () => {
            const errs = await errorsFor(SchemaImportDuplicatesRequestDTO, {
                policyId: '0.0.1',
                schemaNames: 'A',
            });
            assert.deepEqual(constraintsFor(errs, 'schemaNames'), ['isArray']);
        });
    });

    describe('SystemSchemaDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(SystemSchemaDTO, {
                name: 'n',
                entity: 'STANDARD_REGISTRY',
            });
            assert.equal(errs.length, 0);
        });

        it('accepts entity USER', async () => {
            const errs = await errorsFor(SystemSchemaDTO, { name: 'n', entity: 'USER' });
            assert.equal(errs.length, 0);
        });

        it('rejects entity not in allowed list', async () => {
            const errs = await errorsFor(SystemSchemaDTO, { name: 'n', entity: 'OTHER' });
            assert.deepEqual(constraintsFor(errs, 'entity'), ['isIn']);
        });

        it('rejects missing name and entity', async () => {
            const errs = await errorsFor(SystemSchemaDTO, {});
            assert.deepEqual(props(errs), ['entity', 'name']);
        });
    });

    describe('ExportSchemaDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(ExportSchemaDTO, {
                id: '1',
                name: 'n',
                description: 'd',
                version: '1.0.0',
                owner: 'did:x',
                messageId: 'm',
            });
            assert.equal(errs.length, 0);
        });

        it('accepts minimal required payload', async () => {
            const errs = await errorsFor(ExportSchemaDTO, { id: '1', name: 'n' });
            assert.equal(errs.length, 0);
        });

        it('rejects missing required id and name', async () => {
            const errs = await errorsFor(ExportSchemaDTO, {});
            assert.deepEqual(props(errs), ['id', 'name']);
            assert.deepEqual(constraintsFor(errs, 'id'), ['isNotEmpty', 'isString']);
        });

        it('rejects empty name', async () => {
            const errs = await errorsFor(ExportSchemaDTO, { id: '1', name: '' });
            assert.deepEqual(constraintsFor(errs, 'name'), ['isNotEmpty']);
        });
    });

    describe('VersionSchemaDTO', () => {
        it('accepts a valid version', async () => {
            const errs = await errorsFor(VersionSchemaDTO, { version: '1.0.0' });
            assert.equal(errs.length, 0);
        });

        it('rejects empty version', async () => {
            const errs = await errorsFor(VersionSchemaDTO, { version: '' });
            assert.deepEqual(constraintsFor(errs, 'version'), ['isNotEmpty']);
        });

        it('rejects missing version', async () => {
            const errs = await errorsFor(VersionSchemaDTO, {});
            assert.deepEqual(props(errs), ['version']);
        });
    });

    describe('MessageSchemaDTO', () => {
        it('accepts a valid messageId', async () => {
            const errs = await errorsFor(MessageSchemaDTO, { messageId: '1234.5' });
            assert.equal(errs.length, 0);
        });

        it('rejects empty messageId', async () => {
            const errs = await errorsFor(MessageSchemaDTO, { messageId: '' });
            assert.deepEqual(constraintsFor(errs, 'messageId'), ['isNotEmpty']);
        });

        it('rejects non-string messageId', async () => {
            const errs = await errorsFor(MessageSchemaDTO, { messageId: 99 });
            assert.deepEqual(constraintsFor(errs, 'messageId'), ['isString']);
        });
    });

    describe('UserDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(UserDTO, {
                username: 'user',
                role: 'USER',
                permissionsGroup: [{}],
                permissions: ['POLICIES_POLICY_READ'],
                did: 'did:x',
                parent: 'did:y',
                hederaAccountId: '0.0.1',
            });
            assert.equal(errs.length, 0);
        });

        it('accepts minimal required payload (optionals omitted)', async () => {
            const errs = await errorsFor(UserDTO, {
                username: 'user',
                role: 'USER',
                permissionsGroup: [],
                permissions: [],
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string username and role', async () => {
            const errs = await errorsFor(UserDTO, {
                username: 1,
                role: 2,
                permissionsGroup: [],
                permissions: [],
            });
            assert.deepEqual(constraintsFor(errs, 'username'), ['isString']);
            assert.deepEqual(constraintsFor(errs, 'role'), ['isString']);
        });

        it('rejects non-array permissions and permissionsGroup', async () => {
            const errs = await errorsFor(UserDTO, {
                username: 'u',
                role: 'USER',
                permissionsGroup: 'x',
                permissions: 'y',
            });
            assert.deepEqual(constraintsFor(errs, 'permissions'), ['isArray']);
            assert.deepEqual(constraintsFor(errs, 'permissionsGroup'), ['isArray']);
        });

        it('rejects optional did when non-string', async () => {
            const errs = await errorsFor(UserDTO, {
                username: 'u',
                role: 'USER',
                permissionsGroup: [],
                permissions: [],
                did: 123,
            });
            assert.deepEqual(constraintsFor(errs, 'did'), ['isString']);
        });
    });

    describe('ProfileDidDocumentRecordDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(ProfileDidDocumentRecordDTO, {
                createDate: 'd',
                updateDate: 'd',
                did: 'did:x',
                status: 'CREATE',
                messageId: 'm',
                topicId: '0.0.1',
                id: '1',
            });
            assert.equal(errs.length, 0);
        });

        it('accepts empty payload', async () => {
            const errs = await errorsFor(ProfileDidDocumentRecordDTO, {});
            assert.equal(errs.length, 0);
        });

        it('rejects non-string did', async () => {
            const errs = await errorsFor(ProfileDidDocumentRecordDTO, { did: 5 });
            assert.deepEqual(constraintsFor(errs, 'did'), ['isString']);
        });

        it('does not validate undecorated document/verificationMethods', async () => {
            const errs = await errorsFor(ProfileDidDocumentRecordDTO, {
                document: 'x',
                verificationMethods: 'x',
            });
            assert.equal(errs.length, 0);
        });
    });

    describe('ProfileVcDocumentDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(ProfileVcDocumentDTO, {
                documentFileId: 'f',
                tableFileIds: ['a', 'b'],
            });
            assert.equal(errs.length, 0);
        });

        it('accepts empty payload', async () => {
            const errs = await errorsFor(ProfileVcDocumentDTO, {});
            assert.equal(errs.length, 0);
        });

        it('rejects non-string documentFileId', async () => {
            const errs = await errorsFor(ProfileVcDocumentDTO, { documentFileId: 1 });
            assert.deepEqual(constraintsFor(errs, 'documentFileId'), ['isString']);
        });

        it('rejects non-array tableFileIds', async () => {
            const errs = await errorsFor(ProfileVcDocumentDTO, { tableFileIds: 'x' });
            assert.deepEqual(constraintsFor(errs, 'tableFileIds'), ['isArray']);
        });

        it('rejects non-string element inside tableFileIds (each)', async () => {
            const errs = await errorsFor(ProfileVcDocumentDTO, { tableFileIds: ['a', 2] });
            assert.deepEqual(constraintsFor(errs, 'tableFileIds'), ['isString']);
        });
    });

    describe('ProfileDTO', () => {
        it('accepts a fully-valid payload (inherits UserDTO)', async () => {
            const errs = await errorsFor(ProfileDTO, {
                username: 'u',
                role: 'USER',
                permissionsGroup: [],
                permissions: [],
                confirmed: true,
                failed: false,
                topicId: '0.0.1',
                parentTopicId: '0.0.2',
                location: 'local',
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-boolean confirmed', async () => {
            const errs = await errorsFor(ProfileDTO, {
                username: 'u',
                role: 'USER',
                permissionsGroup: [],
                permissions: [],
                confirmed: 'yes',
            });
            assert.deepEqual(constraintsFor(errs, 'confirmed'), ['isBoolean']);
        });

        it('rejects location not in LocationType enum', async () => {
            const errs = await errorsFor(ProfileDTO, {
                username: 'u',
                role: 'USER',
                permissionsGroup: [],
                permissions: [],
                location: 'galaxy',
            });
            assert.deepEqual(constraintsFor(errs, 'location'), ['isEnum']);
        });

        it('inherits parent required-field validation', async () => {
            const errs = await errorsFor(ProfileDTO, {
                permissionsGroup: [],
                permissions: [],
            });
            assert.deepEqual(props(errs), ['role', 'username']);
        });
    });

    describe('PolicyKeyDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(PolicyKeyDTO, {
                id: '1',
                createDate: 'd',
                updateDate: 'd',
                messageId: 'm',
                owner: 'did:x',
                policyName: 'p',
                key: 'k',
            });
            assert.equal(errs.length, 0);
        });

        it('accepts empty payload', async () => {
            const errs = await errorsFor(PolicyKeyDTO, {});
            assert.equal(errs.length, 0);
        });

        it('rejects non-string key', async () => {
            const errs = await errorsFor(PolicyKeyDTO, { key: 7 });
            assert.deepEqual(constraintsFor(errs, 'key'), ['isString']);
        });
    });

    describe('PolicyKeyConfigDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(PolicyKeyConfigDTO, { messageId: 'm', key: 'k' });
            assert.equal(errs.length, 0);
        });

        it('accepts payload without optional key', async () => {
            const errs = await errorsFor(PolicyKeyConfigDTO, { messageId: 'm' });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string messageId', async () => {
            const errs = await errorsFor(PolicyKeyConfigDTO, { messageId: 1 });
            assert.deepEqual(constraintsFor(errs, 'messageId'), ['isString']);
        });

        it('rejects missing messageId (required @IsString)', async () => {
            const errs = await errorsFor(PolicyKeyConfigDTO, {});
            assert.deepEqual(constraintsFor(errs, 'messageId'), ['isString']);
        });
    });

    describe('RecordStatusDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(RecordStatusDTO, {
                type: 'Recording',
                policyId: '1',
                uuid: 'u',
                status: 'New',
            });
            assert.equal(errs.length, 0);
        });

        it('rejects all-empty required fields', async () => {
            const errs = await errorsFor(RecordStatusDTO, {
                type: '',
                policyId: '',
                uuid: '',
                status: '',
            });
            assert.deepEqual(props(errs), ['policyId', 'status', 'type', 'uuid']);
            assert.deepEqual(constraintsFor(errs, 'type'), ['isNotEmpty']);
        });

        it('rejects missing required fields', async () => {
            const errs = await errorsFor(RecordStatusDTO, {});
            assert.deepEqual(props(errs), ['policyId', 'status', 'type', 'uuid']);
        });
    });

    describe('RecordActionDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(RecordActionDTO, {
                uuid: 'u',
                policyId: '1',
                method: 'POST',
                action: 'CreateDID',
                time: 'd',
                user: 'did:x',
                target: 'tag',
            });
            assert.equal(errs.length, 0);
        });

        it('rejects empty uuid/policyId/method (IsNotEmpty) but allows empty action/time/user/target', async () => {
            const errs = await errorsFor(RecordActionDTO, {
                uuid: '',
                policyId: '',
                method: '',
                action: '',
                time: '',
                user: '',
                target: '',
            });
            assert.deepEqual(props(errs), ['method', 'policyId', 'uuid']);
        });

        it('rejects non-string action', async () => {
            const errs = await errorsFor(RecordActionDTO, {
                uuid: 'u',
                policyId: '1',
                method: 'POST',
                action: 5,
                time: 'd',
                user: 'did:x',
                target: 'tag',
            });
            assert.deepEqual(constraintsFor(errs, 'action'), ['isString']);
        });
    });

    describe('ResultDocumentDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(ResultDocumentDTO, {
                type: 'VC',
                schema: 'u',
                rate: '100%',
                documents: { a: 1 },
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-object documents', async () => {
            const errs = await errorsFor(ResultDocumentDTO, {
                type: 'VC',
                schema: 'u',
                rate: '100%',
                documents: 'x',
            });
            assert.deepEqual(constraintsFor(errs, 'documents'), ['isObject']);
        });

        it('rejects missing required fields', async () => {
            const errs = await errorsFor(ResultDocumentDTO, {});
            assert.deepEqual(props(errs), ['documents', 'rate', 'schema', 'type']);
        });
    });

    describe('ResultInfoDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(ResultInfoDTO, { tokens: 1, documents: 5 });
            assert.equal(errs.length, 0);
        });

        it('rejects non-number tokens', async () => {
            const errs = await errorsFor(ResultInfoDTO, { tokens: 'one', documents: 5 });
            assert.deepEqual(constraintsFor(errs, 'tokens'), ['isNumber']);
        });

        it('accepts zero documents (0 is not empty for IsNotEmpty)', async () => {
            const errs = await errorsFor(ResultInfoDTO, { tokens: 1, documents: 0 });
            assert.equal(errs.length, 0);
        });
    });

    describe('RunningResultDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(RunningResultDTO, {
                info: { tokens: 1, documents: 5 },
                total: 5,
                documents: [{ type: 'VC', schema: 'u', rate: '100%', documents: {} }],
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-object info and non-array documents', async () => {
            const errs = await errorsFor(RunningResultDTO, {
                info: 'x',
                total: 5,
                documents: 'y',
            });
            assert.deepEqual(constraintsFor(errs, 'info'), ['isObject']);
            assert.deepEqual(constraintsFor(errs, 'documents'), ['isArray']);
        });

        it('rejects non-number total', async () => {
            const errs = await errorsFor(RunningResultDTO, {
                info: { tokens: 1, documents: 5 },
                total: 'lots',
                documents: [],
            });
            assert.deepEqual(constraintsFor(errs, 'total'), ['isNumber']);
        });
    });

    describe('RunningDetailsDTO', () => {
        it('accepts a fully-valid payload', async () => {
            const errs = await errorsFor(RunningDetailsDTO, {
                left: { a: 1 },
                right: { b: 2 },
                total: 10,
                documents: { c: 3 },
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-object left/right/documents', async () => {
            const errs = await errorsFor(RunningDetailsDTO, {
                left: 'x',
                right: 'y',
                total: 10,
                documents: 'z',
            });
            assert.deepEqual(constraintsFor(errs, 'left'), ['isObject']);
            assert.deepEqual(constraintsFor(errs, 'right'), ['isObject']);
            assert.deepEqual(constraintsFor(errs, 'documents'), ['isObject']);
        });

        it('rejects non-number total', async () => {
            const errs = await errorsFor(RunningDetailsDTO, {
                left: {},
                right: {},
                total: 'x',
                documents: {},
            });
            assert.deepEqual(constraintsFor(errs, 'total'), ['isNumber']);
        });
    });
});

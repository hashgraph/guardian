import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    MockBlockConfigDTO,
    MockConfigDTO,
    MockIpfsDataDTO,
    MockTopicTransactionDTO,
    MockMessageTransactionDTO,
    MockTopicDataDTO,
    MockTokenDataDTO,
    MockRequestConfigDTO,
    MockApiDataDTO,
    MockUserDataDTO,
    MockDataDTO,
    MockApiRequestDTO,
    MockIpfsRequestDTO,
} from '../../dist/middlewares/validation/schemas/mock.dto.js';
import {
    ExternalPolicyDTO,
    PolicyRequestDTO,
    PolicyRequestCountDTO,
} from '../../dist/middlewares/validation/schemas/external-policies.dto.js';
import {
    FormulaDTO,
    FormulaRelationshipsDTO,
    FormulasOptionsDTO,
    FormulasDataDTO,
} from '../../dist/middlewares/validation/schemas/formulas.dto.js';

const errsFor = (Dto, input) => validate(plainToInstance(Dto, input));

const keysFor = (errors, property) => {
    const out = [];
    const walk = (list, prefix) => {
        for (const e of list) {
            const path = prefix ? `${prefix}.${e.property}` : e.property;
            if (e.constraints) {
                for (const k of Object.keys(e.constraints)) {
                    out.push({ property: path, key: k });
                }
            }
            if (e.children && e.children.length) {
                walk(e.children, path);
            }
        }
    };
    walk(errors, '');
    return property ? out.filter((o) => o.property === property).map((o) => o.key) : out;
};

const hasConstraint = (errors, property, key) => keysFor(errors, property).includes(key);

describe('@unit P7 validation DTOs: mock / external-policies / formulas', () => {
    describe('MockBlockConfigDTO', () => {
        it('is fully valid with all optional fields', async () => {
            assert.equal((await errsFor(MockBlockConfigDTO, { uuid: 'u', enabled: true })).length, 0);
        });

        it('is valid when all optional fields omitted', async () => {
            assert.equal((await errsFor(MockBlockConfigDTO, {})).length, 0);
        });

        it('rejects non-string uuid', async () => {
            assert.equal(hasConstraint(await errsFor(MockBlockConfigDTO, { uuid: 5 }), 'uuid', 'isString'), true);
        });

        it('rejects non-boolean enabled', async () => {
            assert.equal(hasConstraint(await errsFor(MockBlockConfigDTO, { enabled: 'yes' }), 'enabled', 'isBoolean'), true);
        });
    });

    describe('MockConfigDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(MockConfigDTO, { enabled: false, blocks: [{ uuid: 'a' }] })).length, 0);
        });

        it('is valid when optional fields omitted', async () => {
            assert.equal((await errsFor(MockConfigDTO, {})).length, 0);
        });

        it('rejects non-array blocks', async () => {
            assert.equal(hasConstraint(await errsFor(MockConfigDTO, { blocks: {} }), 'blocks', 'isArray'), true);
        });

        it('does not deep-validate block array items (no ValidateNested)', async () => {
            assert.equal((await errsFor(MockConfigDTO, { blocks: [{ uuid: 5, enabled: 'no' }] })).length, 0);
        });
    });

    describe('MockIpfsDataDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(MockIpfsDataDTO, { cid: 'c', content: 'x' })).length, 0);
        });

        it('rejects non-string cid', async () => {
            assert.equal(hasConstraint(await errsFor(MockIpfsDataDTO, { cid: 5 }), 'cid', 'isString'), true);
        });

        it('rejects non-string content', async () => {
            assert.equal(hasConstraint(await errsFor(MockIpfsDataDTO, { content: {} }), 'content', 'isString'), true);
        });
    });

    describe('MockTopicTransactionDTO', () => {
        it('is fully valid', async () => {
            const errs = await errsFor(MockTopicTransactionDTO, { id: '0.0.1', memo: 'm', payer_account_id: '0.0.2', topic_id: '0.0.3' });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string payer_account_id', async () => {
            assert.equal(hasConstraint(await errsFor(MockTopicTransactionDTO, { payer_account_id: 5 }), 'payer_account_id', 'isString'), true);
        });

        it('rejects non-string memo', async () => {
            assert.equal(hasConstraint(await errsFor(MockTopicTransactionDTO, { memo: 1 }), 'memo', 'isString'), true);
        });
    });

    describe('MockMessageTransactionDTO', () => {
        it('is fully valid', async () => {
            const errs = await errsFor(MockMessageTransactionDTO, {
                consensus_timestamp: '1',
                id: '2',
                message: 'base64',
                payer_account_id: '0.0.1',
                sequence_number: 3,
                topicId: '0.0.2',
                topic_id: '0.0.2',
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-number sequence_number', async () => {
            assert.equal(hasConstraint(await errsFor(MockMessageTransactionDTO, { sequence_number: 'x' }), 'sequence_number', 'isNumber'), true);
        });

        it('rejects non-string message', async () => {
            assert.equal(hasConstraint(await errsFor(MockMessageTransactionDTO, { message: 1 }), 'message', 'isString'), true);
        });

        it('accepts numeric sequence_number', async () => {
            assert.equal((await errsFor(MockMessageTransactionDTO, { sequence_number: 42 })).length, 0);
        });
    });

    describe('MockTopicDataDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(MockTopicDataDTO, { topicId: '0.0.1', topic: {}, messages: [] })).length, 0);
        });

        it('rejects non-object topic', async () => {
            assert.equal(hasConstraint(await errsFor(MockTopicDataDTO, { topic: 'x' }), 'topic', 'isObject'), true);
        });

        it('rejects non-array messages', async () => {
            assert.equal(hasConstraint(await errsFor(MockTopicDataDTO, { messages: {} }), 'messages', 'isArray'), true);
        });
    });

    describe('MockTokenDataDTO', () => {
        it('is fully valid with string fields', async () => {
            const errs = await errsFor(MockTokenDataDTO, {
                id: '0.0.1',
                token_id: '0.0.2',
                treasury_account_id: '0.0.3',
                name: 'Name',
                symbol: 'S',
                decimals: '2',
                type: 'FUNGIBLE_COMMON',
                admin_key: true,
                freeze_key: false,
                kyc_key: true,
                supply_key: false,
                wipe_key: true,
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-boolean admin_key', async () => {
            assert.equal(hasConstraint(await errsFor(MockTokenDataDTO, { admin_key: 'x' }), 'admin_key', 'isBoolean'), true);
        });

        it('rejects non-string type', async () => {
            assert.equal(hasConstraint(await errsFor(MockTokenDataDTO, { type: 1 }), 'type', 'isString'), true);
        });

        it('treats decimals as a string field, rejecting a numeric value', async () => {
            assert.equal(hasConstraint(await errsFor(MockTokenDataDTO, { decimals: 2 }), 'decimals', 'isString'), true);
        });
    });

    describe('MockRequestConfigDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(MockRequestConfigDTO, { method: 'GET', responseType: 'JSON', url: 'http://localhost/' })).length, 0);
        });

        it('rejects non-string method', async () => {
            assert.equal(hasConstraint(await errsFor(MockRequestConfigDTO, { method: 1 }), 'method', 'isString'), true);
        });

        it('rejects non-string url', async () => {
            assert.equal(hasConstraint(await errsFor(MockRequestConfigDTO, { url: {} }), 'url', 'isString'), true);
        });
    });

    describe('MockApiDataDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(MockApiDataDTO, { request: {}, response: 'JSON' })).length, 0);
        });

        it('rejects non-object request', async () => {
            assert.equal(hasConstraint(await errsFor(MockApiDataDTO, { request: 'x' }), 'request', 'isObject'), true);
        });

        it('rejects non-string response', async () => {
            assert.equal(hasConstraint(await errsFor(MockApiDataDTO, { response: 1 }), 'response', 'isString'), true);
        });
    });

    describe('MockUserDataDTO', () => {
        it('is fully valid', async () => {
            const errs = await errsFor(MockUserDataDTO, {
                username: 'u',
                did: 'did:hedera:x',
                hederaAccountId: '0.0.1',
                hederaAccountKey: 'key',
                document: {},
            });
            assert.equal(errs.length, 0);
        });

        it('rejects non-string username', async () => {
            assert.equal(hasConstraint(await errsFor(MockUserDataDTO, { username: 5 }), 'username', 'isString'), true);
        });

        it('rejects non-object document', async () => {
            assert.equal(hasConstraint(await errsFor(MockUserDataDTO, { document: 'x' }), 'document', 'isObject'), true);
        });
    });

    describe('MockDataDTO', () => {
        it('is valid when empty', async () => {
            assert.equal((await errsFor(MockDataDTO, {})).length, 0);
        });

        it('is valid with arrays for all sections', async () => {
            assert.equal((await errsFor(MockDataDTO, { ipfs: [], topics: [], tokens: [], api: [], users: [] })).length, 0);
        });

        it('rejects non-array ipfs', async () => {
            assert.equal(hasConstraint(await errsFor(MockDataDTO, { ipfs: {} }), 'ipfs', 'isArray'), true);
        });

        it('rejects non-array users', async () => {
            assert.equal(hasConstraint(await errsFor(MockDataDTO, { users: 'x' }), 'users', 'isArray'), true);
        });

        it('does not deep-validate array items (no ValidateNested)', async () => {
            assert.equal((await errsFor(MockDataDTO, { tokens: [{ admin_key: 'not-bool' }] })).length, 0);
        });
    });

    describe('MockApiRequestDTO', () => {
        it('is valid for any shape (body/headers carry no decorators)', async () => {
            assert.equal((await errsFor(MockApiRequestDTO, { type: 'GET', url: 'http://localhost/', body: { a: 1 }, headers: { h: 'v' } })).length, 0);
        });

        it('rejects non-string type', async () => {
            assert.equal(hasConstraint(await errsFor(MockApiRequestDTO, { type: 1 }), 'type', 'isString'), true);
        });

        it('does not validate body even when a primitive', async () => {
            const errs = await errsFor(MockApiRequestDTO, { body: 5, headers: 'string-headers' });
            assert.equal(keysFor(errs, 'body').length, 0);
            assert.equal(keysFor(errs, 'headers').length, 0);
        });
    });

    describe('MockIpfsRequestDTO', () => {
        it('is valid when empty', async () => {
            assert.equal((await errsFor(MockIpfsRequestDTO, {})).length, 0);
        });

        it('rejects non-string cid', async () => {
            assert.equal(hasConstraint(await errsFor(MockIpfsRequestDTO, { cid: 1 }), 'cid', 'isString'), true);
        });
    });

    describe('ExternalPolicyDTO', () => {
        it('is fully valid', async () => {
            const errs = await errsFor(ExternalPolicyDTO, {
                uuid: 'u',
                name: 'Policy',
                description: 'desc',
                version: '1.0.0',
                topicId: '0.0.1',
                instanceTopicId: '0.0.2',
                messageId: 'm',
                policyTag: 'tag',
                owner: 'did:x',
                status: 'NEW',
                username: 'user',
            });
            assert.equal(errs.length, 0);
        });

        it('is valid when all optional fields omitted', async () => {
            assert.equal((await errsFor(ExternalPolicyDTO, {})).length, 0);
        });

        it('rejects non-string name', async () => {
            assert.equal(hasConstraint(await errsFor(ExternalPolicyDTO, { name: 5 }), 'name', 'isString'), true);
        });

        it('rejects non-string status (enum not enforced, only IsString)', async () => {
            assert.equal(hasConstraint(await errsFor(ExternalPolicyDTO, { status: 5 }), 'status', 'isString'), true);
        });

        it('accepts an arbitrary string status (no enum constraint)', async () => {
            assert.equal((await errsFor(ExternalPolicyDTO, { status: 'NOT_A_REAL_STATUS' })).length, 0);
        });
    });

    describe('PolicyRequestDTO', () => {
        it('is fully valid', async () => {
            const errs = await errsFor(PolicyRequestDTO, {
                uuid: 'u',
                type: 'ACTION',
                messageId: 'm',
                startMessageId: 'sm',
                status: 'NEW',
                lastStatus: 'NEW',
                accountId: '0.0.1',
                sender: '0.0.2',
                owner: 'did:x',
                topicId: '0.0.3',
                document: { a: 1 },
                policyId: 'p',
                blockTag: 'tag',
                policyMessageId: 'pm',
                loaded: true,
            });
            assert.equal(errs.length, 0);
        });

        it('is valid when empty', async () => {
            assert.equal((await errsFor(PolicyRequestDTO, {})).length, 0);
        });

        it('rejects non-object document', async () => {
            assert.equal(hasConstraint(await errsFor(PolicyRequestDTO, { document: 'x' }), 'document', 'isObject'), true);
        });

        it('rejects non-boolean loaded', async () => {
            assert.equal(hasConstraint(await errsFor(PolicyRequestDTO, { loaded: 'yes' }), 'loaded', 'isBoolean'), true);
        });

        it('rejects non-string accountId', async () => {
            assert.equal(hasConstraint(await errsFor(PolicyRequestDTO, { accountId: 5 }), 'accountId', 'isString'), true);
        });
    });

    describe('PolicyRequestCountDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(PolicyRequestCountDTO, { requestsCount: 1, actionsCount: 2, delayCount: 3, total: 6 })).length, 0);
        });

        it('is valid when empty', async () => {
            assert.equal((await errsFor(PolicyRequestCountDTO, {})).length, 0);
        });

        it('rejects non-number requestsCount', async () => {
            assert.equal(hasConstraint(await errsFor(PolicyRequestCountDTO, { requestsCount: 'x' }), 'requestsCount', 'isNumber'), true);
        });

        it('rejects non-number total', async () => {
            assert.equal(hasConstraint(await errsFor(PolicyRequestCountDTO, { total: 'x' }), 'total', 'isNumber'), true);
        });
    });

    describe('FormulaDTO', () => {
        it('is fully valid', async () => {
            const errs = await errsFor(FormulaDTO, {
                id: 'db-id',
                uuid: 'u',
                name: 'Formula',
                description: 'desc',
                creator: 'did:x',
                owner: 'did:y',
                messageId: 'm',
                policyId: 'p',
                policyTopicId: '0.0.1',
                policyInstanceTopicId: '0.0.2',
                status: 'DRAFT',
                config: { a: 1 },
            });
            assert.equal(errs.length, 0);
        });

        it('requires name (missing name fails isString)', async () => {
            assert.equal(hasConstraint(await errsFor(FormulaDTO, {}), 'name', 'isString'), true);
        });

        it('is valid with only the required name present', async () => {
            assert.equal((await errsFor(FormulaDTO, { name: 'Formula' })).length, 0);
        });

        it('rejects non-string name', async () => {
            assert.equal(hasConstraint(await errsFor(FormulaDTO, { name: 5 }), 'name', 'isString'), true);
        });

        it('rejects non-object config', async () => {
            assert.equal(hasConstraint(await errsFor(FormulaDTO, { name: 'F', config: 'x' }), 'config', 'isObject'), true);
        });

        it('does not validate id (no decorators)', async () => {
            const errs = await errsFor(FormulaDTO, { name: 'F', id: 12345 });
            assert.equal(keysFor(errs, 'id').length, 0);
        });
    });

    describe('FormulaRelationshipsDTO', () => {
        it('is fully valid (formulas validated as object, not array)', async () => {
            assert.equal((await errsFor(FormulaRelationshipsDTO, { policy: {}, schemas: [], formulas: {} })).length, 0);
        });

        it('is valid when empty', async () => {
            assert.equal((await errsFor(FormulaRelationshipsDTO, {})).length, 0);
        });

        it('rejects an array for formulas (decorated IsObject not IsArray)', async () => {
            assert.equal(hasConstraint(await errsFor(FormulaRelationshipsDTO, { formulas: [] }), 'formulas', 'isObject'), true);
        });

        it('rejects non-object policy', async () => {
            assert.equal(hasConstraint(await errsFor(FormulaRelationshipsDTO, { policy: 'x' }), 'policy', 'isObject'), true);
        });

        it('rejects non-array schemas', async () => {
            assert.equal(hasConstraint(await errsFor(FormulaRelationshipsDTO, { schemas: {} }), 'schemas', 'isArray'), true);
        });

        it('validates formulas as an object, not an array (accepts a plain object)', async () => {
            assert.equal((await errsFor(FormulaRelationshipsDTO, { formulas: {} })).length, 0);
        });
    });

    describe('FormulasOptionsDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(FormulasOptionsDTO, { policyId: 'p', schemaId: 's', documentId: 'd', parentId: 'pa' })).length, 0);
        });

        it('is valid when empty', async () => {
            assert.equal((await errsFor(FormulasOptionsDTO, {})).length, 0);
        });

        it('rejects non-string policyId', async () => {
            assert.equal(hasConstraint(await errsFor(FormulasOptionsDTO, { policyId: 5 }), 'policyId', 'isString'), true);
        });

        it('rejects non-string parentId', async () => {
            assert.equal(hasConstraint(await errsFor(FormulasOptionsDTO, { parentId: {} }), 'parentId', 'isString'), true);
        });
    });

    describe('FormulasDataDTO', () => {
        it('is fully valid', async () => {
            assert.equal((await errsFor(FormulasDataDTO, { formulas: [], document: {}, relationships: [], schemas: [] })).length, 0);
        });

        it('is valid when empty', async () => {
            assert.equal((await errsFor(FormulasDataDTO, {})).length, 0);
        });

        it('rejects non-array formulas', async () => {
            assert.equal(hasConstraint(await errsFor(FormulasDataDTO, { formulas: {} }), 'formulas', 'isArray'), true);
        });

        it('rejects non-object document', async () => {
            assert.equal(hasConstraint(await errsFor(FormulasDataDTO, { document: 'x' }), 'document', 'isObject'), true);
        });

        it('rejects non-array relationships', async () => {
            assert.equal(hasConstraint(await errsFor(FormulasDataDTO, { relationships: {} }), 'relationships', 'isArray'), true);
        });
    });
});

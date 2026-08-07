import assert from 'node:assert/strict';
import { MessageAPI, ExternalMessageEvents } from '../dist/type/messages/message-api.type.js';

describe('MessageAPI enum', () => {
    it('maps a kebab-case sample of subjects', () => {
        assert.equal(MessageAPI.GET_TEMPLATE, 'get-template');
        assert.equal(MessageAPI.PUBLISH_TASK, 'publish-task');
        assert.equal(MessageAPI.GET_DID_DOCUMENTS, 'get-did-documents');
        assert.equal(MessageAPI.GET_VC_DOCUMENTS, 'get-vc-documents');
        assert.equal(MessageAPI.GET_SCHEMAS, 'get-schemas');
        assert.equal(MessageAPI.GET_SCHEMAS_V2, 'get-schemas-v2');
        assert.equal(MessageAPI.GET_TOKENS, 'get-tokens');
        assert.equal(MessageAPI.GET_CHAIN, 'get-chain');
        assert.equal(MessageAPI.IMPORT_SCHEMA, 'import-schema');
        assert.equal(MessageAPI.EXPORT_SCHEMAS, 'export-schema');
    });

    it('maps SCREAMING_SNAKE identity-style subjects', () => {
        assert.equal(MessageAPI.SET_ACCESS_TOKEN, 'SET_ACCESS_TOKEN');
        assert.equal(MessageAPI.GENERATE_DEMO_KEY, 'GENERATE_DEMO_KEY');
        assert.equal(MessageAPI.WRITE_LOG, 'WRITE_LOG');
        assert.equal(MessageAPI.GET_LOGS, 'GET_LOGS');
        assert.equal(MessageAPI.FREEZE_TOKEN, 'FREEZE_TOKEN');
        assert.equal(MessageAPI.CREATE_STANDARD_REGISTRY, 'CREATE_STANDARD_REGISTRY');
        assert.equal(MessageAPI.CREATE_USER_PROFILE, 'CREATE_USER_PROFILE');
    });

    it('maps statistic / rule / label / formula subjects', () => {
        assert.equal(MessageAPI.GET_STATISTIC_DEFINITIONS, 'GET_STATISTIC_DEFINITIONS');
        assert.equal(MessageAPI.CREATE_STATISTIC_ASSESSMENT, 'CREATE_STATISTIC_ASSESSMENT');
        assert.equal(MessageAPI.GET_SCHEMA_RULES, 'GET_SCHEMA_RULES');
        assert.equal(MessageAPI.CREATE_POLICY_LABEL, 'CREATE_POLICY_LABEL');
        assert.equal(MessageAPI.CREATE_FORMULA, 'CREATE_FORMULA');
        assert.equal(MessageAPI.PUBLISH_FORMULA, 'PUBLISH_FORMULA');
    });

    it('maps suggestion subjects with policy-engine prefix', () => {
        assert.equal(MessageAPI.SUGGESTIONS, 'policy-engine-event-suggestions');
        assert.equal(MessageAPI.GET_SUGGESTIONS_CONFIG, 'policy-engine-event-get-suggestions-config');
        assert.equal(MessageAPI.SET_SUGGESTIONS_CONFIG, 'policy-engine-event-set-suggestions-config');
    });

    it('maps credential CRUD subjects', () => {
        assert.equal(MessageAPI.SET_CREDENTIAL, 'SET_CREDENTIAL');
        assert.equal(MessageAPI.GET_CREDENTIALS, 'GET_CREDENTIALS');
        assert.equal(MessageAPI.DELETE_CREDENTIAL, 'DELETE_CREDENTIAL');
        assert.equal(MessageAPI.TRANSFER_TOKEN, 'TRANSFER_TOKEN');
        assert.equal(MessageAPI.TRANSFER_TOKEN_ASYNC, 'TRANSFER_TOKEN_ASYNC');
    });

    it('aliases role VC subjects distinct from their key names', () => {
        assert.equal(MessageAPI.CREATE_ROLE, 'CREATE_ROLE_VC');
        assert.equal(MessageAPI.UPDATE_ROLE, 'UPDATE_ROLE_VC');
        assert.equal(MessageAPI.DELETE_ROLE, 'DELETE_ROLE_VC');
        assert.equal(MessageAPI.SET_ROLE, 'SET_ROLE_VC');
    });

    it('every value is a non-empty string', () => {
        for (const v of Object.values(MessageAPI)) {
            assert.equal(typeof v, 'string');
            assert.ok(v.length > 0);
        }
    });

    it('has unique values across all members', () => {
        const values = Object.values(MessageAPI);
        assert.equal(new Set(values).size, values.length);
    });

    it('is a string enum (no numeric reverse mapping)', () => {
        for (const k of Object.keys(MessageAPI)) {
            assert.equal(typeof k, 'string');
            assert.ok(Number.isNaN(Number(k)));
        }
    });

    it('contains a large surface of message subjects', () => {
        assert.ok(Object.keys(MessageAPI).length > 200);
    });
});

describe('ExternalMessageEvents enum', () => {
    it('namespaces every event under external-events.', () => {
        for (const v of Object.values(ExternalMessageEvents)) {
            assert.ok(v.startsWith('external-events.'));
        }
    });

    it('maps each external event member', () => {
        assert.equal(ExternalMessageEvents.TOKEN_MINTED, 'external-events.token_minted');
        assert.equal(ExternalMessageEvents.TOKEN_MINT_COMPLETE, 'external-events.token_mint_complete');
        assert.equal(ExternalMessageEvents.TOKEN_MINT_FAILED, 'external-events.token_mint_failed');
        assert.equal(ExternalMessageEvents.ERROR_LOG, 'external-events.error_logs');
        assert.equal(ExternalMessageEvents.BLOCK_EVENTS, 'external-events.block_event');
        assert.equal(ExternalMessageEvents.BLOCK_COMPLETE, 'external-events.block_complete');
        assert.equal(ExternalMessageEvents.IPFS_ADDED_FILE, 'external-events.ipfs_added_file');
        assert.equal(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, 'external-events.ipfs_before_upload_content');
        assert.equal(ExternalMessageEvents.IPFS_AFTER_READ_CONTENT, 'external-events.ipfs_after_read_content');
        assert.equal(ExternalMessageEvents.IPFS_LOADED_FILE, 'external-events.ipfs_loaded_file');
    });

    it('has exactly ten members with unique values', () => {
        const values = Object.values(ExternalMessageEvents);
        assert.equal(values.length, 10);
        assert.equal(new Set(values).size, 10);
    });
});

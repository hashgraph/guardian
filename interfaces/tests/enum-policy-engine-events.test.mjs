import assert from 'node:assert/strict';
import { PolicyEngineEvents } from '../dist/type/messages/policy-engine-events.js';

describe('PolicyEngineEvents enum', () => {
    it('maps import-related subjects', () => {
        assert.equal(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, 'policy-engine-event-receive-external-data');
        assert.equal(PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM, 'policy-engine-event-recieve-external-data-custom');
        assert.equal(PolicyEngineEvents.POLICY_IMPORT_FILE, 'policy-engine-event-policy-import-file');
        assert.equal(PolicyEngineEvents.POLICY_IMPORT_FILE_ASYNC, 'policy-engine-event-policy-import-file-async');
        assert.equal(PolicyEngineEvents.POLICY_IMPORT_MESSAGE, 'policy-engine-event-policy-import-message');
        assert.equal(PolicyEngineEvents.POLICY_IMPORT_XLSX, 'policy-engine-event-policy-import-xlsx');
    });

    it('maps export subjects', () => {
        assert.equal(PolicyEngineEvents.POLICY_EXPORT_FILE, 'policy-engine-event-policy-export-file');
        assert.equal(PolicyEngineEvents.POLICY_EXPORT_MESSAGE, 'policy-engine-event-policy-export-message');
        assert.equal(PolicyEngineEvents.POLICY_EXPORT_XLSX, 'policy-engine-event-policy-export-xlsx');
    });

    it('maps lifecycle subjects', () => {
        assert.equal(PolicyEngineEvents.CREATE_POLICIES, 'policy-engine-event-create-policies');
        assert.equal(PolicyEngineEvents.PUBLISH_POLICIES, 'policy-engine-event-publish-policies');
        assert.equal(PolicyEngineEvents.DRY_RUN_POLICIES, 'policy-engine-event-dry-run-policies');
        assert.equal(PolicyEngineEvents.DRAFT_POLICIES, 'policy-engine-event-draft-policies');
        assert.equal(PolicyEngineEvents.VALIDATE_POLICIES, 'policy-engine-event-validate-policies');
        assert.equal(PolicyEngineEvents.DISCONTINUE_POLICY, 'policy-engine-event-discontinue-policy');
    });

    it('maps block-data subjects', () => {
        assert.equal(PolicyEngineEvents.GET_BLOCK_DATA, 'policy-engine-event-get-block-data');
        assert.equal(PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, 'policy-engine-event-get-block-data-by-tag');
        assert.equal(PolicyEngineEvents.SET_BLOCK_DATA, 'policy-engine-event-set-block-data');
        assert.equal(PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, 'policy-engine-event-set-block-data-by-tag');
        assert.equal(PolicyEngineEvents.BLOCK_BY_TAG, 'policy-engine-event-get-block-by-tag');
    });

    it('maps savepoint subjects', () => {
        assert.equal(PolicyEngineEvents.GET_SAVEPOINTS, 'policy-engine-event-get-savepoints');
        assert.equal(PolicyEngineEvents.CREATE_SAVEPOINT, 'policy-engine-event-create-savepoint');
        assert.equal(PolicyEngineEvents.DELETE_SAVEPOINTS, 'policy-engine-event-delete-savepoints');
        assert.equal(PolicyEngineEvents.SELECT_SAVEPOINT, 'policy-engine-event-select-savepoint');
    });

    it('maps remote-request subjects (prefix without -event-)', () => {
        assert.equal(PolicyEngineEvents.APPROVE_REMOTE_REQUEST, 'policy-engine-approve-remote-request');
        assert.equal(PolicyEngineEvents.REJECT_REMOTE_REQUEST, 'policy-engine-reject-remote-request');
        assert.equal(PolicyEngineEvents.CANCEL_REMOTE_ACTION, 'policy-engine-cancel-remote-action');
        assert.equal(PolicyEngineEvents.GET_REMOTE_REQUESTS, 'policy-engine-get-remote-requests');
    });

    it('starts every subject with the policy-engine prefix', () => {
        for (const v of Object.values(PolicyEngineEvents)) {
            assert.ok(v.startsWith('policy-engine'));
        }
    });

    it('has unique non-empty string values', () => {
        const values = Object.values(PolicyEngineEvents);
        assert.equal(new Set(values).size, values.length);
        for (const v of values) {
            assert.equal(typeof v, 'string');
            assert.ok(v.length > 0);
        }
    });

    it('exposes a broad surface of events', () => {
        assert.ok(Object.keys(PolicyEngineEvents).length > 100);
    });
});

import assert from 'node:assert/strict';
import { PolicyEvents } from '../dist/type/messages/policy-events.js';

describe('PolicyEvents enum', () => {
    it('maps service-management subjects', () => {
        assert.equal(PolicyEvents.CHECK_POLICY_SERVICES, 'check-policy-services');
        assert.equal(PolicyEvents.NEW_POLICY_SERVICE_NODE_STARTED, 'new-policy-service-node-started');
        assert.equal(PolicyEvents.GET_FREE_POLICY_SERVICES, 'get-free-policy-services');
        assert.equal(PolicyEvents.POLICY_SERVICE_FREE_STATUS, 'policy-service-free-status');
        assert.equal(PolicyEvents.CHECK_IF_ALIVE, 'check-if-alive');
    });

    it('maps generation / readiness subjects', () => {
        assert.equal(PolicyEvents.GENERATE_POLICY, 'policy-event-generate-policy');
        assert.equal(PolicyEvents.POLICY_READY, 'policy-event-policy-ready');
        assert.equal(PolicyEvents.POLICY_START_ERROR, 'policy-start-error');
        assert.equal(PolicyEvents.DELETE_POLICY, 'policy-event-delete-policy');
    });

    it('maps block-data subjects', () => {
        assert.equal(PolicyEvents.GET_BLOCK_DATA, 'policy-event-get-block-data');
        assert.equal(PolicyEvents.GET_BLOCK_DATA_BY_TAG, 'policy-event-get-block-data-by-tag');
        assert.equal(PolicyEvents.SET_BLOCK_DATA, 'policy-event-set-block-data');
        assert.equal(PolicyEvents.GET_ROOT_BLOCK_DATA, 'policy-event-get-root-block-data');
        assert.equal(PolicyEvents.BLOCK_BY_TAG, 'policy-event-block-by-tag');
    });

    it('maps recording / running subjects', () => {
        assert.equal(PolicyEvents.START_RECORDING, 'policy-event-start-recording');
        assert.equal(PolicyEvents.STOP_RECORDING, 'policy-event-stop-recording');
        assert.equal(PolicyEvents.RUN_RECORD, 'policy-event-run-record');
        assert.equal(PolicyEvents.STOP_RUNNING, 'policy-event-stop-running');
        assert.equal(PolicyEvents.FAST_FORWARD, 'policy-event-fast-forward');
    });

    it('maps remote-action subjects without -event- segment', () => {
        assert.equal(PolicyEvents.APPROVE_REMOTE_REQUEST, 'approve-remote-request');
        assert.equal(PolicyEvents.REJECT_REMOTE_REQUEST, 'reject-remote-request');
        assert.equal(PolicyEvents.CANCEL_REMOTE_ACTION, 'cancel-remote-action');
        assert.equal(PolicyEvents.RELOAD_REMOTE_ACTION, 'reload-remote-action');
        assert.equal(PolicyEvents.APPLY_SAVEPOINT, 'apply-savepoint');
    });

    it('keeps identity-style member for RECORD_PERSIST_STEP', () => {
        assert.equal(PolicyEvents.RECORD_PERSIST_STEP, 'RECORD_PERSIST_STEP');
    });

    it('uses the policy-engine prefix for RECONNECT_POLICY', () => {
        assert.equal(PolicyEvents.RECONNECT_POLICY, 'policy-engine-reconnect-policy');
        assert.equal(PolicyEvents.DISCONNECT_POLICY, 'policy-event-disconnect-policy');
    });

    it('has unique non-empty string values', () => {
        const values = Object.values(PolicyEvents);
        assert.equal(new Set(values).size, values.length);
        for (const v of values) {
            assert.equal(typeof v, 'string');
            assert.ok(v.length > 0);
        }
    });
});

import { assert } from 'chai';
import { TaskAction, NotificationAction } from '@guardian/interfaces';
import {
    notificationActionMap,
    taskResultTitleMap,
    getNotificationResultMessage,
    getNotificationResultTitle,
    getNotificationResult,
    getTaskResult
} from '../../../dist/notification/notification-events.js';

describe('notificationActionMap', () => {
    it('maps CREATE_POLICY to POLICY_CONFIGURATION', () => {
        assert.equal(notificationActionMap.get(TaskAction.CREATE_POLICY), NotificationAction.POLICY_CONFIGURATION);
    });

    it('maps PUBLISH_SCHEMA to SCHEMAS_PAGE', () => {
        assert.equal(notificationActionMap.get(TaskAction.PUBLISH_SCHEMA), NotificationAction.SCHEMAS_PAGE);
    });

    it('maps CREATE_TOKEN to TOKENS_PAGE', () => {
        assert.equal(notificationActionMap.get(TaskAction.CREATE_TOKEN), NotificationAction.TOKENS_PAGE);
    });

    it('maps DELETE_POLICY to POLICIES_PAGE', () => {
        assert.equal(notificationActionMap.get(TaskAction.DELETE_POLICY), NotificationAction.POLICIES_PAGE);
    });

    it('maps PUBLISH_POLICY_LABEL to POLICY_LABEL_PAGE', () => {
        assert.equal(notificationActionMap.get(TaskAction.PUBLISH_POLICY_LABEL), NotificationAction.POLICY_LABEL_PAGE);
    });

    it('has no entry for CONNECT_USER', () => {
        assert.isUndefined(notificationActionMap.get(TaskAction.CONNECT_USER));
    });

    it('contains 19 entries', () => {
        assert.equal(notificationActionMap.size, 19);
    });
});

describe('taskResultTitleMap', () => {
    it('titles CREATE_POLICY as Policy created', () => {
        assert.equal(taskResultTitleMap.get(TaskAction.CREATE_POLICY), 'Policy created');
    });

    it('titles DELETE_TOKEN as Token deleted', () => {
        assert.equal(taskResultTitleMap.get(TaskAction.DELETE_TOKEN), 'Token deleted');
    });

    it('titles PUBLISH_POLICY_LABEL as Label published', () => {
        assert.equal(taskResultTitleMap.get(TaskAction.PUBLISH_POLICY_LABEL), 'Label published');
    });

    it('contains 28 entries', () => {
        assert.equal(taskResultTitleMap.size, 28);
    });
});

describe('getNotificationResultMessage', () => {
    it('builds message for CREATE_POLICY from the raw result', () => {
        assert.equal(getNotificationResultMessage(TaskAction.CREATE_POLICY, 'p1'), 'Policy p1 created');
    });

    it('builds message for PUBLISH_POLICY from policyId', () => {
        assert.equal(getNotificationResultMessage(TaskAction.PUBLISH_POLICY, { policyId: 'p2' }), 'Policy p2 published');
    });

    it('builds the same message for both policy import variants', () => {
        assert.equal(getNotificationResultMessage(TaskAction.IMPORT_POLICY_FILE, { policyId: 'p3' }), 'Policy p3 imported');
        assert.equal(getNotificationResultMessage(TaskAction.IMPORT_POLICY_MESSAGE, { policyId: 'p3' }), 'Policy p3 imported');
    });

    it('builds message for IMPORT_TOOL_MESSAGE from toolId', () => {
        assert.equal(getNotificationResultMessage(TaskAction.IMPORT_TOOL_MESSAGE, { toolId: 't1' }), 'Tool t1 imported');
    });

    it('builds token messages from tokenName', () => {
        assert.equal(getNotificationResultMessage(TaskAction.ASSOCIATE_TOKEN, { tokenName: 'TKN' }), 'TKN associated');
        assert.equal(getNotificationResultMessage(TaskAction.FREEZE_TOKEN, { tokenName: 'TKN' }), 'TKN frozen');
    });

    it('builds KYC messages from tokenName', () => {
        assert.equal(getNotificationResultMessage(TaskAction.GRANT_KYC, { tokenName: 'TKN' }), 'KYC granted for TKN');
        assert.equal(getNotificationResultMessage(TaskAction.REVOKE_KYC, { tokenName: 'TKN' }), 'KYC revoked for TKN');
    });

    it('uses fixed texts for user actions', () => {
        assert.equal(getNotificationResultMessage(TaskAction.CONNECT_USER, null), 'You are connected');
        assert.equal(getNotificationResultMessage(TaskAction.RESTORE_USER_PROFILE, null), 'Your profile restored');
    });

    it('falls back to Operation completed for unmapped actions', () => {
        assert.equal(getNotificationResultMessage(TaskAction.DELETE_POLICY, true), 'Operation completed');
    });
});

describe('getNotificationResultTitle', () => {
    it('returns undefined for PUBLISH_POLICY when result is invalid', () => {
        assert.isUndefined(getNotificationResultTitle(TaskAction.PUBLISH_POLICY, { isValid: false }));
    });

    it('returns the publish title for PUBLISH_POLICY when result is valid', () => {
        assert.equal(getNotificationResultTitle(TaskAction.PUBLISH_POLICY, { isValid: true }), 'Policy published');
    });

    it('returns the mapped title for CREATE_SCHEMA', () => {
        assert.equal(getNotificationResultTitle(TaskAction.CREATE_SCHEMA, 'id'), 'Schema created');
    });

    it('returns undefined for actions without a title', () => {
        assert.isUndefined(getNotificationResultTitle(TaskAction.GET_USER_TOPICS, {}));
    });
});

describe('getNotificationResult', () => {
    it('returns undefined for a falsy result', () => {
        assert.isUndefined(getNotificationResult(TaskAction.CREATE_POLICY, null));
        assert.isUndefined(getNotificationResult(TaskAction.CREATE_POLICY, undefined));
    });

    it('returns the raw result for CREATE_POLICY', () => {
        assert.equal(getNotificationResult(TaskAction.CREATE_POLICY, 'pid'), 'pid');
    });

    it('extracts policyId for WIZARD_CREATE_POLICY and PUBLISH_POLICY', () => {
        assert.equal(getNotificationResult(TaskAction.WIZARD_CREATE_POLICY, { policyId: 'a' }), 'a');
        assert.equal(getNotificationResult(TaskAction.PUBLISH_POLICY, { policyId: 'b' }), 'b');
    });

    it('extracts errors for PUBLISH_TOOL', () => {
        const errors = [{ text: 'x' }];
        assert.deepEqual(getNotificationResult(TaskAction.PUBLISH_TOOL, { errors }), errors);
    });

    it('extracts status for token association actions', () => {
        assert.equal(getNotificationResult(TaskAction.ASSOCIATE_TOKEN, { status: true }), true);
        assert.equal(getNotificationResult(TaskAction.DISSOCIATE_TOKEN, { status: false }), false);
    });

    it('returns undefined for schema file imports', () => {
        assert.isUndefined(getNotificationResult(TaskAction.IMPORT_SCHEMA_FILE, { ok: 1 }));
        assert.isUndefined(getNotificationResult(TaskAction.IMPORT_SCHEMA_MESSAGE, { ok: 1 }));
    });

    it('passes through results for unmapped actions', () => {
        const result = { any: 'thing' };
        assert.equal(getNotificationResult(TaskAction.DELETE_TOKEN, true), true);
        assert.deepEqual(getNotificationResult('SOMETHING_ELSE', result), result);
    });
});

describe('getTaskResult', () => {
    it('extracts status for ASSOCIATE_TOKEN', () => {
        assert.equal(getTaskResult(TaskAction.ASSOCIATE_TOKEN, { status: true }), true);
    });

    it('extracts status for DISSOCIATE_TOKEN', () => {
        assert.equal(getTaskResult(TaskAction.DISSOCIATE_TOKEN, { status: false }), false);
    });

    it('passes through results for other actions', () => {
        const result = { policyId: 'p' };
        assert.deepEqual(getTaskResult(TaskAction.PUBLISH_POLICY, result), result);
        assert.equal(getTaskResult(TaskAction.CREATE_POLICY, 'id'), 'id');
    });
});

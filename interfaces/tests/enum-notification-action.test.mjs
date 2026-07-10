import assert from 'node:assert/strict';
import { NotificationAction } from '../dist/type/notification-action.type.js';

describe('NotificationAction enum', () => {
    it('exposes the seven page-route action ids', () => {
        for (const k of ['POLICY_CONFIGURATION', 'POLICY_VIEW', 'POLICIES_PAGE', 'SCHEMAS_PAGE', 'TOKENS_PAGE', 'PROFILE_PAGE', 'POLICY_LABEL_PAGE']) {
            assert.equal(NotificationAction[k], k);
        }
        assert.equal(Object.keys(NotificationAction).length, 7);
    });
});

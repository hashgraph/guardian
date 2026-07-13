import assert from 'node:assert/strict';
import { UserPermissions } from '../dist/helpers/permissions-helper.js';
import { Permissions } from '../dist/type/index.js';

const getters = [
    'ARTIFACTS_FILE_DELETE',
    'CONTRACTS_CONTRACT_EXECUTE',
    'CONTRACTS_CONTRACT_MANAGE',
    'CONTRACTS_CONTRACT_CREATE',
    'CONTRACTS_CONTRACT_DELETE',
    'CONTRACTS_WIPE_REQUEST_READ',
    'CONTRACTS_WIPE_REQUEST_UPDATE',
    'CONTRACTS_WIPE_REQUEST_REVIEW',
    'CONTRACTS_WIPE_REQUEST_DELETE',
    'CONTRACTS_WIPE_ADMIN_CREATE',
    'CONTRACTS_WIPE_ADMIN_DELETE',
    'CONTRACTS_WIPE_MANAGER_CREATE',
    'CONTRACTS_WIPE_MANAGER_DELETE',
    'CONTRACTS_WIPER_CREATE',
    'CONTRACTS_WIPER_DELETE',
    'CONTRACTS_POOL_READ',
    'CONTRACTS_POOL_UPDATE',
    'CONTRACTS_POOL_DELETE',
    'CONTRACTS_RETIRE_REQUEST_READ',
    'CONTRACTS_RETIRE_REQUEST_CREATE',
    'CONTRACTS_RETIRE_REQUEST_DELETE',
    'CONTRACTS_RETIRE_REQUEST_REVIEW',
    'CONTRACTS_RETIRE_ADMIN_CREATE',
    'CONTRACTS_RETIRE_ADMIN_DELETE',
    'CONTRACTS_PERMISSIONS_READ',
    'CONTRACTS_DOCUMENT_READ',
    'IPFS_FILE_CREATE',
    'MODULES_MODULE_CREATE',
    'MODULES_MODULE_UPDATE',
    'MODULES_MODULE_DELETE',
    'MODULES_MODULE_REVIEW',
    'POLICIES_POLICY_UPDATE',
    'POLICIES_POLICY_DELETE',
    'POLICIES_POLICY_REVIEW',
    'POLICIES_POLICY_EXECUTE',
    'POLICIES_MIGRATION_CREATE',
    'POLICIES_RECORD_ALL',
    'POLICIES_POLICY_MANAGE',
    'POLICIES_POLICY_AUDIT',
    'POLICIES_POLICY_TAG',
    'SCHEMAS_SCHEMA_CREATE',
    'SCHEMAS_SCHEMA_UPDATE',
    'SCHEMAS_SCHEMA_DELETE',
    'SCHEMAS_SCHEMA_REVIEW',
    'SCHEMAS_SYSTEM_SCHEMA_CREATE',
    'SCHEMAS_SYSTEM_SCHEMA_UPDATE',
    'SCHEMAS_SYSTEM_SCHEMA_DELETE',
    'SCHEMAS_SYSTEM_SCHEMA_REVIEW',
    'TOOLS_TOOL_CREATE',
    'TOOLS_TOOL_UPDATE',
    'TOOLS_TOOL_DELETE',
    'TOOLS_TOOL_REVIEW',
    'TOOL_MIGRATION_CREATE',
    'TOKENS_TOKEN_UPDATE',
    'TOKENS_TOKEN_DELETE',
    'TOKENS_TOKEN_EXECUTE',
    'TOKENS_TOKEN_MANAGE',
    'TAGS_TAG_CREATE',
    'PROFILES_USER_UPDATE',
    'PROFILES_BALANCE_READ',
    'PROFILES_RESTORE_ALL',
    'SUGGESTIONS_SUGGESTIONS_UPDATE',
    'SETTINGS_SETTINGS_UPDATE',
    'SETTINGS_THEME_CREATE',
    'SETTINGS_THEME_UPDATE',
    'SETTINGS_THEME_DELETE',
    'PERMISSIONS_ROLE_CREATE',
    'PERMISSIONS_ROLE_UPDATE',
    'PERMISSIONS_ROLE_DELETE',
    'PERMISSIONS_ROLE_MANAGE',
    'STATISTICS_STATISTIC_CREATE',
    'SCHEMAS_RULE_CREATE',
    'SCHEMAS_RULE_EXECUTE',
    'STATISTICS_LABEL_CREATE',
    'FORMULAS_FORMULA_CREATE',
    'POLICIES_EXTERNAL_POLICY_CREATE',
    'POLICIES_EXTERNAL_POLICY_DELETE',
    'POLICIES_EXTERNAL_POLICY_UPDATE',
    'WORKER_TASKS_EXECUTE',
    'WORKER_TASKS_DELETE',
];

describe('UserPermissions getter matrix', () => {
    it('every getter under test maps to a declared permission constant', () => {
        for (const name of getters) {
            assert.equal(typeof Permissions[name], 'string', name);
        }
    });

    for (const name of getters) {
        it(`${name} reflects the granted permission`, () => {
            const granted = new UserPermissions({ role: 'USER', permissions: [Permissions[name]] });
            const denied = new UserPermissions({ role: 'USER', permissions: [] });
            assert.equal(granted[name], true);
            assert.equal(denied[name], false);
        });
    }

    it('an unrelated permission does not satisfy a getter', () => {
        const user = new UserPermissions({ role: 'USER', permissions: [Permissions.TAGS_TAG_CREATE] });
        assert.equal(user.TOOLS_TOOL_DELETE, false);
        assert.equal(user.TAGS_TAG_CREATE, true);
    });
});

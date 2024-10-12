import { PolicyRoles } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Roles loader
 */
export class RolesLoader extends PolicyDataLoader<PolicyRoles> {
    async get() {
        return await this.db.getAllPolicyUsers(this.policyId);
    }
}

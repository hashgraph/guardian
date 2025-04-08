import { PolicyStatus } from '../type/index.js';

/**
 * Policy helper
 */
export class PolicyHelper {
    /**
     * If policy running
     * @param policy
     */
    public static isRun(policy: { status?: PolicyStatus }): boolean {
        if (policy && (
            policy.status === PolicyStatus.DRY_RUN ||
            policy.status === PolicyStatus.DEMO ||
            policy.status === PolicyStatus.VIEW ||
            policy.status === PolicyStatus.PUBLISH ||
            policy.status === PolicyStatus.DISCONTINUED
        )) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * If policy running in dry run mode
     * @param policy
     */
    public static isDryRunMode(policy: { status?: PolicyStatus }): boolean {
        if (policy && (
            policy.status === PolicyStatus.DRY_RUN ||
            policy.status === PolicyStatus.DEMO
        )) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * If policy running in publish mode
     * @param policy
     */
    public static isPublishMode(policy: { status?: PolicyStatus }): boolean {
        if (policy && (
            policy.status === PolicyStatus.PUBLISH ||
            policy.status === PolicyStatus.DISCONTINUED
        )) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * If policy not running
     * @param policy
     */
    public static isEditMode(policy: { status?: PolicyStatus }): boolean {
        if (policy && (
            policy.status === PolicyStatus.DRAFT ||
            policy.status === PolicyStatus.PUBLISH_ERROR
        )) {
            return true;
        } else {
            return false;
        }
    }
}

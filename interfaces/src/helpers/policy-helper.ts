import { PolicyType } from '../type/index.js';

/**
 * Policy helper
 */
export class PolicyHelper {
    /**
     * If policy running
     * @param policy
     */
    public static isRun(policy: { status?: PolicyType }): boolean {
        if (policy && (
            policy.status === PolicyType.DRY_RUN ||
            policy.status === PolicyType.DEMO ||
            policy.status === PolicyType.PUBLISH ||
            policy.status === PolicyType.DISCONTINUED
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
    public static isDryRunMode(policy: { status?: PolicyType }): boolean {
        if (policy && (
            policy.status === PolicyType.DRY_RUN ||
            policy.status === PolicyType.DEMO
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
    public static isPublishMode(policy: { status?: PolicyType }): boolean {
        if (policy && (
            policy.status === PolicyType.PUBLISH ||
            policy.status === PolicyType.DISCONTINUED
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
    public static isEditMode(policy: { status?: PolicyType }): boolean {
        if (policy && (
            policy.status === PolicyType.DRAFT ||
            policy.status === PolicyType.PUBLISH_ERROR
        )) {
            return true;
        } else {
            return false;
        }
    }
}

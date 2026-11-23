import {
    getPolicyDocumentationIssues,
    isPolicyDocumentationEditable,
    IPolicyDocumentationEntry,
    PolicyDocumentationIssueCode,
    PolicyStatus
} from '@guardian/interfaces';
import { buildDocumentationUrls } from './build-documentation-urls.js';

/**
 * Validates documentation entries for a stand-alone update of a policy and
 * builds their URLs. Throws if the policy cannot be changed this way or the
 * entries are invalid.
 * @param policy policy (status, locationType, config, id)
 * @param entries entries sent by the user
 */
export function preparePolicyDocumentation(
    policy: { id?: string, status?: string, locationType?: string, config?: any },
    entries: IPolicyDocumentationEntry[]
): IPolicyDocumentationEntry[] {
    if (!Array.isArray(entries)) {
        throw new Error('Policy documentation must be an array.');
    }
    if (!isPolicyDocumentationEditable(policy)) {
        throw new Error('Policy documentation cannot be changed for this policy.');
    }
    const built = buildDocumentationUrls(policy.id, entries);
    // A draft config can still change before the policy is saved, so a missing target is only enforced once it is fixed.
    // A changed block type only warns.
    const issues = getPolicyDocumentationIssues(policy.config, built).filter((issue) =>
        issue.code !== PolicyDocumentationIssueCode.BLOCK_TYPE_CHANGED &&
        !(issue.code === PolicyDocumentationIssueCode.TARGET_NOT_FOUND && policy.status === PolicyStatus.DRAFT)
    );
    if (issues.length) {
        throw new Error(issues.map((issue) => issue.message).join(' '));
    }
    return built;
}

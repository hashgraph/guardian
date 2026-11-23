import {
    getPolicyDocumentationIssues,
    IPolicyDocumentationEntry,
    LocationType,
    PolicyDocumentationIssueCode,
    PolicyStatus
} from '@guardian/interfaces';
import { buildDocumentationUrls } from './build-documentation-urls.js';

const EDITABLE_STATUSES: string[] = [
    PolicyStatus.DRAFT,
    PolicyStatus.DRY_RUN,
    PolicyStatus.PUBLISH,
    PolicyStatus.DISCONTINUED,
];

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
    if (policy.locationType === LocationType.REMOTE || !EDITABLE_STATUSES.includes(policy.status)) {
        throw new Error('Policy documentation cannot be changed for this policy.');
    }
    const built = buildDocumentationUrls(policy.id, entries);
    // A draft config can still change before the policy is saved, so targets are only enforced once it is fixed
    const issues = getPolicyDocumentationIssues(policy.config, built).filter((issue) =>
        issue.code === PolicyDocumentationIssueCode.INVALID_METHOD ||
        issue.code === PolicyDocumentationIssueCode.DUPLICATE_ALIAS ||
        (issue.code === PolicyDocumentationIssueCode.TARGET_NOT_FOUND && policy.status !== PolicyStatus.DRAFT)
    );
    if (issues.length) {
        throw new Error(issues.map((issue) => issue.message).join(' '));
    }
    return built;
}

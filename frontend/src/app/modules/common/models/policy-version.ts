import { PolicyStatus } from '@guardian/interfaces';

/**
 * The policy version is shown for a published or discontinued policy that has one.
 * @param policy policy summary
 */
export function isPolicyVersionShown(policy: { version?: string, status?: string } | null | undefined): boolean {
    const status = policy?.status;
    return !!policy?.version && (status === PolicyStatus.PUBLISH || status === PolicyStatus.DISCONTINUED);
}

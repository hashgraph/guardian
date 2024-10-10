import { PolicyRole } from '@guardian/interfaces';

/**
 * User in policy
 */
export interface IPolicyUser {
    /**
     * User DID
     */
    readonly id: string;
    /**
     * User DID
     */
    readonly did: string;
    /**
     * User Role
     */
    readonly role: PolicyRole | null;
    /**
     * User Role
     */
    readonly group: string;
    /**
     * User DID
     */
    readonly virtual?: boolean;
    /**
     * username
     */
    readonly username?: string;
}
import { UserRole } from "@guardian/interfaces";

export interface IPolicyUser {
    /**
     * User DID
     */
    did: string;
    /**
     * User DID
     */
    virtual?: boolean
}
import { PolicyRoles } from "@entity/policy-roles";
import { PolicyRole } from "@guardian/interfaces";

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
}

/**
 * User in policy
 */
export class PolicyUser implements IPolicyUser {
    /**
     * User DID
     */
    public id: string;
    /**
     * User DID
     */
    public did: string;
    /**
     * User Role
     */
    public role: PolicyRole | null;
    /**
     * User Role
     */
    public group: string;
    /**
     * User DID
     */
    public virtual?: boolean;

    constructor(did: string, virtual: boolean = false) {
        this.id = did;
        this.did = did;
        this.role = null;
        this.group = null;
        this.virtual = virtual;
    }

    /**
     * Set Group
     * @param group
     */
    public setGroup(group: {
        /**
         * Role in Group
         */
        role?: string,
        /**
         * Group ID
         */
        uuid?: string
    } | null): PolicyUser {
        if (group) {
            this.role = group.role;
            this.group = group.uuid;
            this.id = `${this.group}:${this.did}`;
        }
        return this;
    }

    /**
     * Set Virtual DID
     * @param user
     */
    public setVirtualUser(user: any): PolicyUser {
        if (user) {
            this.did = user.did;
            this.virtual = true;
        }
        return this;
    }

    public static create(group: PolicyRoles, virtual: boolean = false): PolicyUser {
        const user = new PolicyUser(group.did, virtual);
        return user.setGroup({ role: group.role, uuid: group.uuid });
    }
}
import { PolicyRoles } from '@entity/policy-roles';
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
    /**
     * username
     */
    public username?: string;

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
            this.group = group.uuid || null;
            if (this.group) {
                this.id = `${this.group}:${this.did}`;
            } else {
                this.id = this.did;
            }
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
            this.username = user.username;
        }
        return this;
    }

    /**
     * Create User by group object
     * @param group
     * @param virtual
     */
    public static create(group: PolicyRoles, virtual: boolean = false): PolicyUser {
        const user = new PolicyUser(group.did, virtual);
        return user.setGroup({ role: group.role, uuid: group.uuid });
    }

    /**
     * Set username
     * @param username
     */
    public setUsername(username: string): PolicyUser {
        this.username = username;
        return this;
    }
}
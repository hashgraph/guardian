import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * PolicyRoles collection
 */
@Entity()
export class PolicyRoles extends BaseEntity {
    /**
     * Policy Id name
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * User DID value
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * User Role
     */
    @Property({ nullable: true })
    role?: string;

    toJSON(): { [p: string]: any } {
        return Object.assign({}, { ...this, id: this.id });
    }
}

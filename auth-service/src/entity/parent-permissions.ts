import { Entity, Property } from '@mikro-orm/core';
import { IGroup } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

/**
 * ParentPermissions collection
 */
@Entity()
export class ParentPermissions extends BaseEntity {
    /**
     * User DID
     */
    @Property({ nullable: true })
    username: string;

    /**
     * Parent user
     */
    @Property({ nullable: true })
    parent: string;

    /**
     * Group name
     */
    @Property({ nullable: true })
    permissionsGroup?: IGroup[];

    /**
     * Permissions
     */
    @Property({ nullable: true })
    permissions?: string[];
}

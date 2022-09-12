import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';
import { IVC } from '@guardian/interfaces';

/**
 * MultiDocuments collection
 */
@Entity()
export class MultiDocuments extends BaseEntity {
    /**
     * Block UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Document Id
     */
    @Property({ nullable: true })
    documentId?: string;

    /**
     * User Id
     */
    @Property({ nullable: true })
    userId?: string;

    /**
     * (User DID)
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * username
     */
    @Property({ nullable: true })
    username?: string;

    /**
     * Created at
     */
    @Property()
    createDate: Date = new Date();

    /**
     * Status
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true })
    document?: IVC;
}

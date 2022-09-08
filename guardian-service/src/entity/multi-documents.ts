import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

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
     * (User DID)
     */
    @Property({ nullable: true })
    did?: string;

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
}

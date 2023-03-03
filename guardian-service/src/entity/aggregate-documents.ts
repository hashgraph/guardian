import { DocumentSignature, DocumentStatus, IVC } from '@guardian/interfaces';
import { Entity, Property, Enum } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Documents for aggregate collection
 */
@Entity()
export class AggregateVC extends BaseEntity {
    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Document assign
     */
    @Property({ nullable: true })
    assignedTo?: string;

    /**
     * Document assign
     */
    @Property({ nullable: true })
    assignedToGroup?: string;

    /**
     * Document hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true })
    document?: IVC;

    /**
     * Document hedera status
     */
    @Enum({ nullable: true })
    hederaStatus?: DocumentStatus;

    /**
     * Document signature
     */
    @Enum({ nullable: true })
    signature?: DocumentSignature;

    /**
     * Document processing status
     */
    @Property({ nullable: true })
    processingStatus?: string;

    /**
     * Document type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Document policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Document block id
     */
    @Property({
        nullable: true,
        index: true
    })
    blockId?: string;

    /**
     * Document tag
     */
    @Property({
        nullable: true,
        index: true
    })
    tag?: string;

    /**
     * Document option
     */
    @Property({ nullable: true })
    option?: any;

    /**
     * Document schema
     */
    @Property({ nullable: true })
    schema?: string;

    /**
     * Document message id
     */
    @Property({ nullable: true })
    messageId?: string;

    /**
     * Topic id
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * Relationships
     */
    @Property({ nullable: true })
    relationships?: string[];

    /**
     * Comment
     */
    @Property({ nullable: true })
    comment?: string;

    /**
     * Hedera Accounts
     */
    @Property({ nullable: true })
    accounts?: any;

    /**
     * User group
     */
    @Property({ nullable: true })
    group?: any;

    /**
     * Hedera Hash
     */
    @Property({ nullable: true })
    messageHash?: string;

    /**
     * Message History
     */
    @Property({ nullable: true })
    messageIds?: string[];
}
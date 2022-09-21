import { DocumentSignature, DocumentStatus, IVC, IVCDocument } from '@guardian/interfaces';
import { Entity, Property, Enum, BeforeCreate, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * VC documents collection
 */
@Entity()
@Unique({ properties: ['hash'], options: { partialFilterExpression: { hash: { $type: 'string' } } } })
export class VcDocument extends BaseEntity implements IVCDocument {
    /**
     * Document owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Assign
     */
    @Property({ nullable: true })
    assignedTo?: string;

    /**
     * Assign
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
     * Created at
     */
    @Property()
    createDate: Date = new Date();

    /**
     * Updated at
     */
    @Property({ onUpdate: () => new Date() })
    updateDate: Date = new Date();

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
     * Type
     */
    @Property({ nullable: true })
    type?: string;

    /**
     * Policy id
     */
    @Property({ nullable: true })
    policyId?: string;

    /**
     * Tag
     */
    @Property({ nullable: true })
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
     * Message id
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
    accounts?: any

    /**
     * User group
     */
    @Property({ nullable: true })
    group?: any

    /**
     * Document defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.hederaStatus = this.hederaStatus || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
        this.option = this.option || {};
    }
}

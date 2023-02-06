import { DocumentSignature, DocumentStatus, IVP, IVPDocument, SchemaEntity } from '@guardian/interfaces';
import { Entity, Property, Enum, BeforeCreate, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * VP documents collection
 */
@Entity()
@Unique({ properties: ['hash'], options: { partialFilterExpression: { hash: { $type: 'string' }}}})
export class VpDocument extends BaseEntity implements IVPDocument {
    /**
     * Document owner
     */
    @Property({
        nullable: true,
        index: true
    })
    owner?: string;

    /**
     * Document hash
     */
    @Property({
        nullable: true,
        // index: true
    })
    hash?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true })
    document?: IVP;

    /**
     * Created at
     */
    @Property({
        index: true
    })
    createDate: Date = new Date();

    /**
     * Updated at
     */
    @Property({ onUpdate: () => new Date() })
    updateDate: Date = new Date();

    /**
     * Document status
     */
    @Enum({ nullable: true })
    status?: DocumentStatus;

    /**
     * Document signature
     */
    @Enum({ nullable: true })
    signature?: DocumentSignature;

    /**
     * Document type
     */
    @Enum({ nullable: true })
    type?: string;

    /**
     * Policy id
     */
    @Property({
        nullable: true,
        index: true
    })
    policyId?: string;

    /**
     * Tag
     */
    @Property({ nullable: true })
    tag?: string;

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
     * Option
     */
    @Property({ nullable: true })
    option?: any;

    /**
     * Comment
     */
    @Property({ nullable: true })
    comment?: string;

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

    /**
     * Document defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
    }
}
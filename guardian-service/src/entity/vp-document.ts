import { DocumentSignature, DocumentStatus, IVPDocument, SchemaEntity } from '@guardian/interfaces';
import { Entity, Property, Enum, BeforeCreate, Unique } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * VP documents collection
 */
@Entity()
@Unique({ properties: ['hash'], options: { partialFilterExpression: { hash: { $exists: true }}}})
export class VpDocument extends BaseEntity implements IVPDocument {
    /**
     * Document owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Document hash
     */
    @Property({ nullable: true })
    hash?: string;

    /**
     * Document instance
     */
    @Property({ nullable: true })
    document?: any;

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
    type?: SchemaEntity;

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
     * Document defaults
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || DocumentStatus.NEW;
        this.signature = this.signature || DocumentSignature.NEW;
    }

    toJSON(): { [p: string]: any } {
        return Object.assign({}, { ...this, id: this.id });
    }
}

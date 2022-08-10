import { DidDocumentStatus, IDidObject } from '@guardian/interfaces';
import {
    Entity,
    Unique,
    Property,
    Enum,
    BeforeCreate
} from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * DID document
 */
@Entity()
@Unique({ properties: ['did'], options: { partialFilterExpression: { did: { $type: 'string' }}}})
export class DidDocument extends BaseEntity implements IDidObject {
    /**
     * DID
     */
    @Property({ nullable: true })
    did?: string;

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
    status?: DidDocumentStatus;

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
     * Default document values
     */
    @BeforeCreate()
    setDefaults() {
        this.status = this.status || DidDocumentStatus.NEW;
    }
}

import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Document state
 */
@Entity()
export class DocumentState extends BaseEntity {
    /**
     * Created at
     */
    @Property()
    created: Date = new Date();

    /**
     * Document id
     */
    @Property({ nullable: true })
    documentId?: string;

    /**
     * State status
     */
    @Property({ nullable: true })
    status?: string;

    /**
     * State reason
     */
    @Property({ nullable: true })
    reason?: string;

    toJSON(): { [p: string]: any } {
        return Object.assign({}, { ...this, id: this.id });
    }
}

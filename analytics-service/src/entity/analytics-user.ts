import { Entity, Property, Index } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';
import { UserType } from '@interfaces/user.type';

/**
 * StandardRegistry collection
 */
@Entity()
export class AnalyticsUser extends BaseEntity {
    /**
     * Report UUID
     */
    @Index({ name: 'report_uuid' })
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    root?: string;

    /**
     * Topic ID
     */
    @Property({ nullable: true })
    topicId?: string;

    /**
     * DID
     */
    @Property({ nullable: true })
    did?: string;

    /**
     * Hedera account
     */
    @Property({ nullable: true })
    account?: string;

    /**
     * Last message timeStamp
     */
    @Property({ nullable: true })
    timeStamp?: string;

    /**
     * User Type
     */
    @Property({ nullable: true })
    type?: UserType;

    /**
     * Policy Owner
     */
    @Property({ nullable: true })
    owner?: string;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: string;
}

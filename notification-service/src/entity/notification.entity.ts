import { Entity, Enum, Property } from '@mikro-orm/core';
import { NotificationType, NotificationAction } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

/**
 * Notification
 */
@Entity()
export class Notification extends BaseEntity {
    /**
     * User Identifier
     */
    @Property()
    userId: string;

    /**
     * Title
     */
    @Property()
    title: string;

    /**
     * Type
     */
    @Enum(() => NotificationType)
    type: NotificationType;

    /**
     * Action
     */
    @Property({ nullable: true })
    action?: NotificationAction;

    /**
     * Result
     */
    @Property({
        type: 'unknown',
        nullable: true,
    })
    result?: any;

    /**
     * Message
     */
    @Property({
        nullable: true,
    })
    message?: string;

    /**
     * Read
     */
    @Property()
    read: boolean = false;

    /**
     * Old
     */
    @Property()
    old: boolean = false;
}

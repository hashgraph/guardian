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
     * Action
     */
    @Property()
    action: string;

    /**
     * Type
     */
    @Enum(() => NotificationType)
    type: NotificationType;

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
     * Read
     */
    @Property()
    old: boolean = false;
}

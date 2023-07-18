import { BeforeCreate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Notification
 */
@Entity()
export class ProgressiveNotification extends BaseEntity {
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
     * Progress
     */
    @Property()
    progress: number;

    /**
     * Result
     */
    @Property({
        nullable: true,
    })
    taskId?: string;

    /**
     * Message
     */
    @Property({
        nullable: true,
    })
    message?: string;

    @BeforeCreate()
    onCreate() {
        this.progress = 0;
    }
}

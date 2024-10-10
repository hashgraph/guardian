import { BeforeCreate, BeforeUpdate, Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '@guardian/common';

/**
 * Progress
 */
@Entity()
export class Progress extends BaseEntity {
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

    /**
     * Before create callback
     */
    @BeforeCreate()
    onCreate() {
        this.progress = 0;
    }

    /**
     * Before create callback
     */
    @BeforeUpdate()
    onUpdate() {
        this.progress = Math.floor(this.progress);
        if (this.progress < 0) {
            this.progress = 0;
        }
        if (this.progress > 100) {
            this.progress = 100;
        }
    }
}

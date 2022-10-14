import { Entity, Property, Enum } from '@mikro-orm/core';
import { ILog, LogType } from '@guardian/interfaces';
import { BaseEntity } from '@guardian/common';

/**
 * Log message
 */
@Entity()
export class Log extends BaseEntity implements ILog {
    /**
     * Message
     */
    @Property()
    message: string;

    /**
     * Type
     */
    @Enum()
    type: LogType;

    /**
     * Datetime
     */
    @Property({
        index: true
    })
    datetime: Date = new Date();

    /**
     * Attributes
     */
    @Property({
        nullable: true,
        index: true
    })
    attributes?: string[];
}

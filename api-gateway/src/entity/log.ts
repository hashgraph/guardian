import { Entity, Enum, Property } from '@mikro-orm/core';

import { BaseEntity } from '@guardian/common';

export enum LogType {
    TRACE = 'trace',
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal',
}

@Entity()
export class Log extends BaseEntity {
    @Property()
    message: string;

    @Enum()
    type: LogType;

    // @Property({ index: true })
    // datetime: Date = new Date();

    // @Property({ nullable: true, index: true })
    // attributes?: string[];
}
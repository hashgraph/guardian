import { Entity, Enum, Property } from '@mikro-orm/core';

//entities
import { BaseEntity } from '@guardian/common';

//types
import { PinoLogType } from '@guardian/interfaces';

@Entity()
export class Log extends BaseEntity {
    @Property()
    message: string;

    @Enum()
    type: PinoLogType;
}
import {Entity, Property, Index} from '@mikro-orm/core';

import { BaseEntity } from '../models/base-entity.js';

@Entity()
@Index({ properties: ['policyId', 'savepointId', 'blockId'], options: { unique: true } })
export class BlockStateSavepoint extends BaseEntity {
    @Property()
    policyId!: string;

    @Property()
    savepointId!: string;

    @Property()
    blockId!: string;

    @Property()
    blockStateDryRunRecord!: unknown;
}

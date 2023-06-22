import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { SuggestionsOrderPriority } from '@guardian/interfaces';

/**
 * Suggestions config
 */
@Entity()
export class SuggestionsConfig extends BaseEntity {
    /**
     * User DID
     */
    @Property({ nullable: true, unique: true })
    user?: string;

    /**
     * Policies
     */
    @Property({ nullable: true, type: 'unknown' })
    items?: SuggestionsOrderPriority[];
}

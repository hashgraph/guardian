import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { SuggestionOrderPriority } from '@guardian/interfaces';

/**
 * Suggestion config
 */
@Entity()
export class SuggestionConfig extends BaseEntity {
    /**
     * User DID
     */
    @Property({ nullable: true, unique: true })
    user?: string;

    /**
     * Policies
     */
    @Property({ nullable: true, type: 'unknown' })
    items?: SuggestionOrderPriority[];
}

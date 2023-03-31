import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { Binary } from 'bson';

/**
 * Artifact collection
 */
@Entity()
export class ArtifactChunk extends BaseEntity {
    /**
     * Group UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Policy Id name
     */
    @Property({ nullable: true })
    number?: number;

    /**
     * Group UUID
     */
    @Property({ nullable: true })
    data?: Binary;
}

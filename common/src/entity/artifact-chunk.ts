import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../models';
import { Binary } from 'bson';

/**
 * Artifact collection
 */
@Entity()
export class ArtifactChunk extends BaseEntity {
    /**
     * Artifact UUID
     */
    @Property({ nullable: true })
    uuid?: string;

    /**
     * Chunk number
     */
    @Property({ nullable: true })
    number?: number;

    /**
     * Chunk data
     */
    @Property({ nullable: true })
    data?: Binary;
}

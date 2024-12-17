import { BaseEntity } from './base-entity.js';
import { Property } from '@mikro-orm/core';
import { IMetadata, IMetadataItem } from '../hedera-modules/index.js';

export abstract class MetadataEntity extends BaseEntity{
    /**
     * Metadata
     */
    @Property({nullable: true})
    metadata?: IMetadata;

    /**
     * Add metadata item(s)
     * @param metadata
     */
    public addMetadata(metadata: IMetadataItem | IMetadataItem[]): void {
        if (!this.metadata || !Array.isArray(this.metadata)) {
            this.metadata = [];
        }
        if (Array.isArray(metadata)) {
            for (const item of metadata) {
                this.metadata.push(item);
            }
        } else {
            this.metadata.push(metadata);
        }
    }
}

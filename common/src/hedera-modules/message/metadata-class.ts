import { IMetadataItem, TransactionTypes } from './message-metadata-type.js';

/**
 * Metadata class
 */
export abstract class MetadataClass{
    /**
     * Message metadata
     */
    private metadata: IMetadataItem;

    /**
     * Add metadata
     * @param metadata
     */
    public setMetadata(metadata: Partial<IMetadataItem>): void {
        if (!this.metadata) {
            this.metadata = {type: TransactionTypes.Unknown};
        }
        this.metadata = Object.assign(this.metadata, metadata);
    }

    /**
     * Get metadata
     */
    public getMetadata(): IMetadataItem {
        return this.metadata;
    }
}

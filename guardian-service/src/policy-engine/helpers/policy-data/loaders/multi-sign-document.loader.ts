import { MultiDocuments } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Multi sign document loader
 */
export class MultiSignDocumentLoader extends PolicyDataLoader<MultiDocuments> {
    async get(vcIds: string[]) {
        return (await this.db.getMultiSignDocumentsByDocumentIds(
            vcIds
        )) as MultiDocuments[];
    }
}

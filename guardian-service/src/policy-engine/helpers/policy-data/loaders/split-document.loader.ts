import { SplitDocuments } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Split document loader
 */
export class SplitDocumentLoader extends PolicyDataLoader<SplitDocuments> {
    async get() {
        return (await this.db.getSplitDocumentsByPolicy(
            this.policyId
        )) as SplitDocuments[];
    }
}

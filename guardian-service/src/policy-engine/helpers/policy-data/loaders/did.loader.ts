import { DidDocument } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * DID loader
 */
export class DidLoader extends PolicyDataLoader<DidDocument> {
    async get() {
        return (await this.db.getDidDocuments({
            topicId: this.policyInstanceTopicId,
        })) as DidDocument[];
    }
}

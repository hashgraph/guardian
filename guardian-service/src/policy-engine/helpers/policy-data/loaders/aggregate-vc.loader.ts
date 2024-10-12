import { AggregateVC } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Aggregate VC loader
 */
export class AggregateVCLoader extends PolicyDataLoader<AggregateVC> {
    async get() {
        return (await this.db.getAggregateDocumentsByPolicy(
            this.policyId
        )) as AggregateVC[];
    }
}

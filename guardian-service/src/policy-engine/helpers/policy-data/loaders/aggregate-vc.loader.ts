import { AggregateVC } from '@guardian/common/entity/aggregate-documents';
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

import { VcDocument } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * VC document loader
 */
export class VcDocumentLoader extends PolicyDataLoader<VcDocument> {
    async get(filters?: any, options?: any, countResult = false) {
        return (await this.db.getVcDocuments(
            filters
                ? Object.assign(filters, {
                      policyId: this.policyId,
                  })
                : {
                      policyId: this.policyId,
                  },
            options,
            countResult
        )) as VcDocument[];
    }
}

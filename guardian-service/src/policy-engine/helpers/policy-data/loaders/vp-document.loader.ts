import { VpDocument } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * VP document loader
 */
export class VpDocumentLoader extends PolicyDataLoader<VpDocument> {
    async get(filters?: any, options?: any, countResult = false) {
        return (await this.db.getVpDocuments(
            filters
                ? Object.assign(filters, {
                      policyId: this.policyId,
                  })
                : {
                      policyId: this.policyId,
                  },
            options,
            countResult
        )) as VpDocument[];
    }
}

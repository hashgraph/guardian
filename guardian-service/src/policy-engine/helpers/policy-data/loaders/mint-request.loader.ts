import { MintRequest } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Mint request loader
 */
export class MintRequestLoader extends PolicyDataLoader<MintRequest> {
    async get(vpIds: string[]) {
        return (await this.db.getMintRequests({
            vpMessageId: { $in: vpIds },
        })) as MintRequest[];
    }
}

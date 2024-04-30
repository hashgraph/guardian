import { MintTransaction } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Mint transaction loader
 */
export class MintTransactionLoader extends PolicyDataLoader<MintTransaction> {
    async get(mintRequestsIds: string[]) {
        return (await this.db.getMintTransactions({
            mintRequestId: { $in: mintRequestsIds },
        })) as MintTransaction[];
    }
}

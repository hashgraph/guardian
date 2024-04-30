import { DatabaseServer, RetirePool } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Retire pool loader
 */
export class RetirePoolLoader extends PolicyDataLoader<RetirePool> {
    async get(tokenIds: string[]) {
        return (await DatabaseServer.getRetirePools(tokenIds)) as RetirePool[];
    }
}

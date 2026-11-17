import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { RetirePool } from '@guardian/common/entity/retire-pool';
import { PolicyDataLoader } from './loader.js';

/**
 * Retire pool loader
 */
export class RetirePoolLoader extends PolicyDataLoader<RetirePool> {
    async get(tokenIds: string[]) {
        return (await DatabaseServer.getRetirePools(tokenIds)) as RetirePool[];
    }
}

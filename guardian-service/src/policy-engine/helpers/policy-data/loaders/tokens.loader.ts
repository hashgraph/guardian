import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { Token } from '@guardian/common/entity/token';
import { PolicyDataLoader } from './loader.js';

/**
 * Tokens loader
 */
export class TokensLoader extends PolicyDataLoader<Token> {
    async get() {
        return (await DatabaseServer.getTokens({
            policyId: this.policyId,
        })) as Token[];
    }
}

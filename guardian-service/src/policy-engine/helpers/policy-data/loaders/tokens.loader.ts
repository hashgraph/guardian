import { DatabaseServer, Token } from '@guardian/common';
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

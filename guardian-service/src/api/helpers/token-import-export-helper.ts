import { DatabaseServer, Token } from '@guardian/common';
import { GenerateUUIDv4, IOwner } from '@guardian/interfaces';
import { INotifier } from '../../helpers/notifier.js';

/**
 * Import token mapping
 */
export interface ImportTokenMap {
    oldID: string;
    oldTokenID: string;
    newID: string;
    newTokenID: string;
}

/**
 * Import Result
 */
export interface ImportTokenResult {
    /**
     * New token uuid
     */
    tokenMap: ImportTokenMap[];
    /**
     * Errors
     */
    errors: any[];
}

/**
 * Import tokens by files
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importTokensByFiles(
    user: IOwner,
    tokens: any[] = [],
    notifier: INotifier
): Promise<ImportTokenResult> {
    const errors: any[] = [];
    const tokenMap: ImportTokenMap[] = [];
    notifier.start('Import tokens');

    const dataBaseServer = new DatabaseServer();

    for (const token of tokens) {
        const tokenObject = dataBaseServer.create(Token, {
            tokenId: GenerateUUIDv4(),
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            tokenType: token.tokenType,
            decimals: token.decimals,
            initialSupply: token.initialSupply,
            adminId: null,
            changeSupply: !!(token.changeSupply || token.supplyKey),
            enableAdmin: !!(token.enableAdmin || token.adminKey),
            enableFreeze: !!(token.enableFreeze || token.freezeKey),
            enableKYC: !!(token.enableKYC || token.kycKey),
            enableWipe: !!(token.enableWipe || token.wipeKey),
            owner: user.owner,
            creator: user.creator,
            policyId: null,
            draftToken: true
        });
        await dataBaseServer.save(Token, tokenObject);

        tokenMap.push({
            oldID: token.id,
            oldTokenID: token.tokenId,
            newID: tokenObject.id.toString(),
            newTokenID: tokenObject.tokenId,
        })
    }

    notifier.completed();
    return { tokenMap, errors };
}

import { DataBaseHelper, Token } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { INotifier } from '../../helpers/notifier.js';

/**
 * Import Result
 */
interface ImportResult {
    /**
     * New token uuid
     */
    tokenMap: any[];
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
    owner: string,
    tokens: any[] = [],
    notifier: INotifier
): Promise<ImportResult> {
    const errors: any[] = [];
    const tokenMap: any[] = [];
    notifier.start('Import tokens');

    const tokenRepository = new DataBaseHelper(Token);
    for (const token of tokens) {
        const tokenObject = tokenRepository.create({
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
            owner,
            policyId: null,
            draftToken: true
        });
        await tokenRepository.save(tokenObject);

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

import { DatabaseServer, INotificationStep, Token } from '@guardian/common';
import { GenerateUUIDv4, IOwner } from '@guardian/interfaces';
import { ObjectId } from '@mikro-orm/mongodb';
import { ImportMode } from '../common/import.interface.js';
import { ImportTokenMap, ImportTokenResult } from './token-import.interface.js';

export class TokenImport {
    private readonly mode: ImportMode;
    private readonly notifier: INotificationStep;

    constructor(mode: ImportMode, notifier: INotificationStep) {
        this.mode = mode;
        this.notifier = notifier;
    }

    public async import(tokens: Token[], user: IOwner): Promise<ImportTokenResult> {
        this.notifier.start();
        const { tokenMap, tokensObject, errors } = this.importTokensByFiles(tokens, user);
        await this.saveTokens(tokensObject);
        this.notifier.complete();
        return { tokenMap, errors };
    }

    private importTokensByFiles(tokens: Token[], user: IOwner) {
        const errors: any[] = [];
        const tokenMap: ImportTokenMap[] = [];
        const tokensObject: any[] = [];
        const dataBaseServer = new DatabaseServer();
        for (const token of tokens) {
            const tokenObject = dataBaseServer.create(Token, this.prepareTokenData(token, user));
            tokensObject.push(tokenObject);
            tokenMap.push({
                oldID: token.id,
                oldTokenID: token.tokenId,
                newID: tokenObject.id.toString(),
                newTokenID: tokenObject.tokenId,
            })
        }
        return { tokenMap, tokensObject, errors };
    }

    private prepareTokenData(token: Token, user: IOwner): Partial<Token> {
        if (this.mode === ImportMode.VIEW) {
            return {
                _id: new ObjectId(token.id),
                id: token.id,
                tokenId: token.tokenId,
                tokenName: token.tokenName,
                tokenSymbol: token.tokenSymbol,
                tokenType: token.tokenType,
                decimals: token.decimals,
                initialSupply: token.initialSupply,
                changeSupply: this.needSupplyKey(token),
                enableAdmin: this.needAdminKey(token),
                enableFreeze: this.needFreezeKey(token),
                enableKYC: this.needKycKey(token),
                enableWipe: this.needWipeKey(token),
                draftToken: false,
                adminId: token.adminId,
                policyId: token.policyId,
                owner: null,
                creator: null
            }
        } else {
            return {
                tokenId: GenerateUUIDv4(),
                tokenName: token.tokenName,
                tokenSymbol: token.tokenSymbol,
                tokenType: token.tokenType,
                decimals: token.decimals,
                initialSupply: token.initialSupply,
                changeSupply: this.needSupplyKey(token),
                enableAdmin: this.needAdminKey(token),
                enableFreeze: this.needFreezeKey(token),
                enableKYC: this.needKycKey(token),
                enableWipe: this.needWipeKey(token),
                draftToken: true,
                adminId: null,
                policyId: null,
                owner: user.owner,
                creator: user.creator
            }
        }
    }

    private async saveTokens(tokensObject: Token[]) {
        const dataBaseServer = new DatabaseServer();
        await dataBaseServer.saveMany(Token, tokensObject);
    }

    private needSupplyKey(token: any): boolean {
        return !!(token.changeSupply || token.supplyKey);
    }

    private needAdminKey(token: any): boolean {
        return !!(token.enableAdmin || token.adminKey);
    }

    private needFreezeKey(token: any): boolean {
        return !!(token.enableFreeze || token.freezeKey);
    }

    private needKycKey(token: any): boolean {
        return !!(token.enableKYC || token.kycKey);
    }

    private needWipeKey(token: any): boolean {
        return !!(token.enableWipe || token.wipeKey);
    }
}
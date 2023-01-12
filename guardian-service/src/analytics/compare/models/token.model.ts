import { Token } from "@entity/token";

export class TokenModel {
    public readonly id: string;
    public readonly tokenId: string;
    public readonly tokenName: string;
    public readonly tokenSymbol: string;
    public readonly tokenType: string;
    public readonly decimals: any;
    public readonly initialSupply: any;
    public readonly enableAdmin: boolean;
    public readonly enableFreeze: boolean;
    public readonly enableKYC: boolean;
    public readonly enableWipe: boolean;

    constructor(token: Token) {
        this.id = token.id;
        this.tokenId = token.tokenId;
        this.tokenName = token.tokenName;
        this.tokenSymbol = token.tokenSymbol;
        this.tokenType = token.tokenType;
        this.decimals = token.decimals;
        this.initialSupply = token.initialSupply;
        this.enableAdmin = token.enableAdmin;
        this.enableFreeze = token.enableFreeze;
        this.enableKYC = token.enableKYC;
        this.enableWipe = token.enableWipe;
    }

    public equal(item: TokenModel): boolean {
        return this.tokenId === item.tokenId;
    }

    public toObject(): any {
        return {
            id: this.id,
            tokenId: this.tokenId,
            tokenName: this.tokenName,
            tokenSymbol: this.tokenSymbol,
            tokenType: this.tokenType,
            decimals: this.decimals,
            initialSupply: this.initialSupply,
            enableAdmin: this.enableAdmin,
            enableFreeze: this.enableFreeze,
            enableKYC: this.enableKYC,
            enableWipe: this.enableWipe
        }
    }
}

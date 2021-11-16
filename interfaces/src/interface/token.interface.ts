export interface IToken {
    id: string;
    tokenId: string;
    tokenName: string;
    tokenSymbol: string;
    tokenType: string;
    decimals: string;
    initialSupply: string;
    adminId: string;
    adminKey: string;
    kycKey: string;
    freezeKey: string;
    wipeKey: string;
    supplyKey: string;
}

export interface ITokenInfo extends IToken {
    associated: boolean;
    balance: string;
    hBarBalance: string;
    frozen: boolean;
    kyc: boolean;
}

export interface FireblocksCreds{
    apiKey: string;
    privateKey: string;
    vaultId: string;
    assetId: string;
}

export enum SignType{
    INTERNAL = 'INTERNAL',
    FIREBLOCKS = 'FIREBLOCKS'
}

export type ISignOptions = {
    signType: SignType.INTERNAL
} | {
    signType: SignType.FIREBLOCKS
    data: FireblocksCreds
};

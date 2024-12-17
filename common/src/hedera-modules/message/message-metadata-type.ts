/**
 * Metadata item type
 */
export enum TransactionTypes{
    Unknown = 'Unknown',
    TopicMessageSubmitTransaction = 'TopicMessageSubmitTransaction',
    TopicCreateTransaction = 'TopicCreateTransaction',
    TokenCreateTransaction = 'TokenCreateTransaction',
    TokenUpdateTransaction = 'TokenUpdateTransaction',
    TokenDeleteTransaction = 'TokenDeleteTransaction',
    TokenAssociateTransaction = 'TokenAssociateTransaction',
    TokenDissociateTransaction = 'TokenDissociateTransaction',
    TokenFreezeTransaction = 'TokenFreezeTransaction',
    TokenUnfreezeTransaction = 'TokenUnfreezeTransaction',
    TokenGrantKycTransaction = 'TokenGrantKycTransaction',
    TokenRevokeKycTransaction = 'TokenRevokeKycTransaction',
    TokenMintTransaction = 'TokenMintTransaction',
    TokenMintNFTTransaction = 'TokenMintNFTTransaction',
    TokenWipeTransaction = 'TokenWipeTransaction',
    TransferTransaction = 'TransferTransaction',
    NFTTransferTransaction = 'NFTTransferTransaction',
    AccountCreateTransaction = 'AccountCreateTransaction',
    ContractCreateTransaction = 'ContractCreateTransaction'
}

/**
 * Metadata item interface
 */
export interface IMetadataItem{
    type: TransactionTypes

    [key: string]: string | number | string[] | number[] | boolean | boolean[];
}

/**
 * Metadata type
 */
export type IMetadata = IMetadataItem[];

export interface IResultWithMetadata<T extends any>{
    data: T;
    metadata: IMetadataItem;
}

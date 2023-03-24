/**
 * Message action
 */
export enum MessageAction {
    CreateDID = 'create-did-document',
    CreateVC = 'create-vc-document',
    CreatePolicy = 'create-policy',
    PublishPolicy = 'publish-policy',
    DeletePolicy = 'delete-policy',
    CreateSchema = 'create-schema',
    PublishSchema = 'publish-schema',
    DeleteSchema = 'delete-schema',
    CreateTopic = 'create-topic',
    CreateVP = 'create-vp-document',
    PublishSystemSchema = 'publish-system-schema',
    Init = 'Init',
    ChangeMessageStatus = 'change-message-status',
    RevokeDocument = 'revoke-document',
    DeleteDocument = 'delete-document',
    UseToken = 'token-issue',
    CreateToken = 'create-token',
    CreateMultiPolicy = 'create-multi-policy',
    Mint = 'mint',
    PublishModule = 'publish-module',
    PublishTag = 'publish-tag',
    DeleteTag = 'delete-tag'
}

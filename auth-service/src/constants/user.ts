export const REQUIRED_PROPS = {
    STATUS_CODE: 'status_code',
    REASON: 'reason',
    ID: 'id',
    USER_NAME: 'username',
    DID: 'did',
    PARENT: 'parent',
    PARENTS: 'parents',
    HEDERA_ACCOUNT_ID: 'hederaAccountId',
    ROLE: 'role',
    POLICY_ROLES: 'policyRoles',
    PERMISSIONS: 'permissions',
    PERMISSION_GROUP: 'permissionsGroup'
};

export const USER_KEYS_PROPS = {
    ...REQUIRED_PROPS,
    WALLET_TOKEN: 'walletToken',
    PROVIDER: 'provider',
    PROVIDER_ID: 'providerId',
    USE_FIREBLOCKS_SIGNING: 'useFireblocksSigning'
}

export const REGISTER_REQUIRED_PROPS = {
    STATUS_CODE: 'status_code',
    REASON: 'reason',
    ID: 'id',
    USER_NAME: 'username',
    PERMISSIONS: 'permissions',
    PERMISSION_GROUP: 'permissionsGroup'
};

export const DB_REQUIRED_PROPS = [
    'id',
    'username',
    'role',
    'did',
    'parent',
    'hederaAccountId',
    'permissions',
    'permissionsGroup'
]

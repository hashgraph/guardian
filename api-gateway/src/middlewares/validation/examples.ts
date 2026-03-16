export enum Examples {
    DB_ID = '69aeb71ef8c5b278e3bab4e5',
    MESSAGE_ID = '1773670900.819264517',
    UUID = '9db028d2-03ad-4d49-a178-cf4b67f8c147',
    ACCOUNT_ID = '0.0.6046379',
    DATE = '2026-03-03T17:25:53.312Z',
    IPFS = 'ipfs://AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    COLOR = '#000000',
    DID = 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
    DID_2 = 'did:hedera:testnet:EthnLQfQnh8x6vKyegyekhy72oSAok6cH59pfVssKLDw_0.0.8200599',
    HASH = 'GcDE9NsPJc7oCZvSVJySCZHxTxvjc3ZAMgtKozP1r1Eh',
    REFRESH_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYwNmY2MzIyLTk2NGYtNGIwMC05ZjgwLTljM2Y1OTdjYTYyYSIsIm5hbWUiOiJTdGFuZGFyZFJlZ2lzdHJ5IiwiZXhwaXJlQXQiOjE4MDQ3MDAzOTczMzgsImlhdCI6MTc3MzE2NDM5N30.ODc0_ktbl5xPRn4Ub1Kuj-xrjlho2_oyohucLdgMUqFGrI2SD_T3A96OaV2cKx7NQwsxc-QFBpBnrGSriJ9qPUcDm9rYmQYSqwpRJT0uSuL7xwu4TiPlVzghCd5xlLTw_uA6uJR7CG7HrDphPQI6zMGSxKXcn2S9xIZ6z5uBuWU',
    ACCESS_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IlN0YW5kYXJkUmVnaXN0cnkiLCJkaWQiOiJkaWQ6aGVkZXJhOnRlc3RuZXQ6Q3Z6cDVrS1ZVdWlwQkNRamNGNTRmQmpkaWN2YUtzQjh6SGVRNlFxMjJVMlpfMC4wLjgxNDUzNDgiLCJyb2xlIjoiU1RBTkRBUkRfUkVHSVNUUlkiLCJleHBpcmVBdCI6MTc3MzgzNzIwNDYzOSwiaWF0IjoxNzczMjM3MjA0fQ.R9F3os4r4BdVpIXO1WhMq9GYp4qiAzBESMqVwM4NacCht4oRyR2X62t2VVckHyb8ElN4Igwy9C7CHdkSL3kpGlRHrN8haDbDfWxtMWw3bpRNUc8Wyvx8p8-N_aSOBZMgoWJQo-K6hB4MgXP2lPT0MQ-JDP01eG8Xn6MtQF4dctA',
    USER_ROLE_SR = 'STANDARD_REGISTRY',
    USER_NAME_SR_1 = 'StandardRegistry',
    USER_NAME_SR_2 = 'Verra'
}


const PERMISSIONS_SR = [
    'ACCOUNTS_STANDARD_REGISTRY_READ',
    'DEMO_KEY_CREATE',
    'IPFS_FILE_READ',
    'IPFS_FILE_CREATE',
    'PROFILES_USER_READ',
    'PROFILES_USER_UPDATE',
    'PROFILES_BALANCE_READ',
    'ACCOUNTS_ACCOUNT_READ',
    'ANALYTIC_POLICY_READ',
    'ANALYTIC_MODULE_READ',
    'ANALYTIC_TOOL_READ',
    'ANALYTIC_SCHEMA_READ',
    'ANALYTIC_DOCUMENT_READ',
    'ARTIFACTS_FILE_READ',
    'ARTIFACTS_FILE_CREATE',
    'ARTIFACTS_FILE_DELETE',
    'BRANDING_CONFIG_UPDATE',
    'CONTRACTS_CONTRACT_READ',
    'CONTRACTS_CONTRACT_CREATE',
    'CONTRACTS_CONTRACT_DELETE',
    'CONTRACTS_CONTRACT_MANAGE',
    'CONTRACTS_WIPE_REQUEST_READ',
    'CONTRACTS_WIPE_REQUEST_UPDATE',
    'CONTRACTS_WIPE_REQUEST_DELETE',
    'CONTRACTS_WIPE_REQUEST_REVIEW',
    'CONTRACTS_WIPE_ADMIN_CREATE',
    'CONTRACTS_WIPE_ADMIN_DELETE',
    'CONTRACTS_WIPE_MANAGER_CREATE',
    'CONTRACTS_WIPE_MANAGER_DELETE',
    'CONTRACTS_WIPER_CREATE',
    'CONTRACTS_WIPER_DELETE',
    'CONTRACTS_POOL_READ',
    'CONTRACTS_POOL_UPDATE',
    'CONTRACTS_POOL_DELETE',
    'CONTRACTS_RETIRE_REQUEST_READ',
    'CONTRACTS_RETIRE_REQUEST_CREATE',
    'CONTRACTS_RETIRE_REQUEST_DELETE',
    'CONTRACTS_RETIRE_REQUEST_REVIEW',
    'CONTRACTS_RETIRE_ADMIN_CREATE',
    'CONTRACTS_RETIRE_ADMIN_DELETE',
    'CONTRACTS_PERMISSIONS_READ',
    'CONTRACTS_DOCUMENT_READ',
    'LOG_LOG_READ',
    'MODULES_MODULE_READ',
    'MODULES_MODULE_CREATE',
    'MODULES_MODULE_UPDATE',
    'MODULES_MODULE_DELETE',
    'MODULES_MODULE_REVIEW',
    'POLICIES_POLICY_READ',
    'POLICIES_POLICY_CREATE',
    'POLICIES_POLICY_UPDATE',
    'POLICIES_POLICY_DELETE',
    'POLICIES_POLICY_REVIEW',
    'POLICIES_POLICY_EXECUTE',
    'POLICIES_POLICY_MANAGE',
    'POLICIES_MIGRATION_CREATE',
    'POLICIES_RECORD_ALL',
    'SCHEMAS_SCHEMA_READ',
    'SCHEMAS_SCHEMA_CREATE',
    'SCHEMAS_SCHEMA_UPDATE',
    'SCHEMAS_SCHEMA_DELETE',
    'SCHEMAS_SCHEMA_REVIEW',
    'SCHEMAS_SYSTEM_SCHEMA_READ',
    'SCHEMAS_SYSTEM_SCHEMA_CREATE',
    'SCHEMAS_SYSTEM_SCHEMA_UPDATE',
    'SCHEMAS_SYSTEM_SCHEMA_DELETE',
    'SCHEMAS_SYSTEM_SCHEMA_REVIEW',
    'TOOLS_TOOL_READ',
    'TOOLS_TOOL_CREATE',
    'TOOLS_TOOL_UPDATE',
    'TOOLS_TOOL_DELETE',
    'TOOLS_TOOL_REVIEW',
    'TOOL_MIGRATION_CREATE',
    'TOKENS_TOKEN_READ',
    'TOKENS_TOKEN_CREATE',
    'TOKENS_TOKEN_UPDATE',
    'TOKENS_TOKEN_DELETE',
    'TOKENS_TOKEN_MANAGE',
    'TAGS_TAG_READ',
    'TAGS_TAG_CREATE',
    'PROFILES_RESTORE_ALL',
    'SUGGESTIONS_SUGGESTIONS_READ',
    'SUGGESTIONS_SUGGESTIONS_UPDATE',
    'SETTINGS_SETTINGS_READ',
    'SETTINGS_SETTINGS_UPDATE',
    'SETTINGS_THEME_READ',
    'SETTINGS_THEME_CREATE',
    'SETTINGS_THEME_UPDATE',
    'SETTINGS_THEME_DELETE',
    'PERMISSIONS_ROLE_READ',
    'PERMISSIONS_ROLE_CREATE',
    'PERMISSIONS_ROLE_UPDATE',
    'PERMISSIONS_ROLE_DELETE',
    'PERMISSIONS_ROLE_MANAGE',
    'ACCESS_POLICY_ALL',
    'SCHEMAS_RULE_CREATE',
    'SCHEMAS_RULE_READ',
    'SCHEMAS_RULE_EXECUTE',
    'FORMULAS_FORMULA_CREATE',
    'FORMULAS_FORMULA_READ',
    'POLICIES_EXTERNAL_POLICY_READ',
    'POLICIES_EXTERNAL_POLICY_CREATE',
    'POLICIES_EXTERNAL_POLICY_UPDATE',
    'POLICIES_EXTERNAL_POLICY_DELETE',
    'LOG_LOG_READ',
    'LOG_SYSTEM_READ']


export const ObjectExamples = {
    PERMISSION_SR: PERMISSIONS_SR,

    SESSION_RESPONSE_WITH_ID: {
        id: Examples.DB_ID,
        username: Examples.USER_NAME_SR_1,
        did: Examples.DID,
        hederaAccountId: Examples.ACCOUNT_ID,
        role: Examples.USER_ROLE_SR,
        permissions: PERMISSIONS_SR,
        location: 'local'
    },

    SESSION_RESPONSE_WITHOUT_ID: {
        id: Examples.DB_ID,
        username: Examples.USER_NAME_SR_1,
        role: Examples.USER_ROLE_SR,
        permissions: PERMISSIONS_SR,
        location: 'local'
    },

    REGISTER_RESPONSE: {
        id: Examples.DB_ID,
        username: Examples.USER_NAME_SR_1,
        role: Examples.USER_ROLE_SR,
        permissions: PERMISSIONS_SR,
        permissionsGroup: [
            {
                uuid: Examples.UUID,
                roleId: '69a814bfca21314a0a25040f',
                roleName: 'Default policy user',
                owner: null
            }
        ],
        location: 'local'
    },

    VC_DOCUMENT_1: {
        createDate: '2026-03-13T09:26:55.610Z',
        updateDate: '2026-03-13T09:27:09.653Z',
        _propHash: 'fd1dea4c3cdc680fcf570c13fc5089cc',
        _docHash: 'b7a2726053900b6572cb3f8fa9b51468',
        hash: '74RwXshVfxSkWFkNhDWdHHMqHhAFMbZ6pR4sepB4pJz2',
        hederaStatus: 'ISSUE',
        signature: 0,
        type: 'STANDARD_REGISTRY',
        option: {
            status: 'NEW'
        },
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        topicId: '0.0.8200599',
        messageId: '1773394029.513409000',
        document: {
            id: 'urn:uuid:962aa166-7da1-4fab-ad88-6681ac55f770',
            type: [
                'VerifiableCredential'
            ],
            issuer: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
            issuanceDate: '2026-03-13T09:26:55.502Z',
            '@context': [
                'https://www.w3.org/2018/credentials/v1',
                'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
            ],
            credentialSubject: [
                {
                    OrganizationName: 'Organization name',
                    Website: 'https://google.com',
                    Tags: 'Tag',
                    '@context': [
                        'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
                    ],
                    id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
                    type: 'StandardRegistry'
                }
            ],
            proof: {
                type: 'Ed25519Signature2018',
                created: '2026-03-13T09:26:55Z',
                verificationMethod: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599#did-root-key',
                proofPurpose: 'assertionMethod',
                jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..Uc6RaUnv_zC4xc9j3mBqdd8Ew3z6lZITofdoJUYpxDot-fZhQEtiDjPAj5Au6UwApAfTnXy_el-uv5iOdzOyCg'
            }
        },
        documentFileId: '69b3d86d0b1c848021821bf9',
        tableFileIds: [],
        _id: '69b3d85f0b1c848021821bf2',
        id: '69b3d85f0b1c848021821bf2'
    },

    VC_DOCUMENT_2: {
        createDate: '2026-03-13T13:34:33.856Z',
        updateDate: '2026-03-13T13:34:47.849Z',
        _propHash: '99a25ce7c710196fc32281ad2f3b11b1',
        _docHash: 'c23b6b611c733f21c676010720b5b471',
        hash: '2L9fzuBnQpQnnZeSXXQi3NTuXDsJG5YjeeDRj4wWomhi',
        hederaStatus: 'ISSUE',
        signature: 0,
        type: 'STANDARD_REGISTRY',
        option: {
            status: 'NEW'
        },
        owner: 'did:hedera:testnet:DtFfFAkJo9QLV8dqsMfWF2BEC5VFkVn4BzGqaAjkjpic_0.0.8204128',
        topicId: '0.0.8204128',
        messageId: '1773408887.187315595',
        document: {
            id: 'urn:uuid:af79517f-940f-4e7a-b895-2f2f1682b493',
            type: [
                'VerifiableCredential'
            ],
            issuer: 'did:hedera:testnet:DtFfFAkJo9QLV8dqsMfWF2BEC5VFkVn4BzGqaAjkjpic_0.0.8204128',
            issuanceDate: '2026-03-13T13:34:33.794Z',
            '@context': [
                'https://www.w3.org/2018/credentials/v1',
                'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
            ],
            credentialSubject: [
                {
                    OrganizationName: 'Some orgname',
                    Website: 'https://test.test',
                    Tags: 'test',
                    '@context': [
                        'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
                    ],
                    id: 'did:hedera:testnet:DtFfFAkJo9QLV8dqsMfWF2BEC5VFkVn4BzGqaAjkjpic_0.0.8204128',
                    type: 'StandardRegistry'
                }
            ],
            proof: {
                type: 'Ed25519Signature2018',
                created: '2026-03-13T13:34:33Z',
                verificationMethod: 'did:hedera:testnet:DtFfFAkJo9QLV8dqsMfWF2BEC5VFkVn4BzGqaAjkjpic_0.0.8204128#did-root-key',
                proofPurpose: 'assertionMethod',
                jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..9eDfxnIaEfkx17NwOsVJK6JrWu4zXgz1tYPhE5g-O1zlFaWO3a6KLv0UtrgHcob-yDFx4k9avcJJmFN3aowSCg'
            }
        },
        documentFileId: '69b41277b23f3b6a77d127a5',
        tableFileIds: [],
        _id: '69b41269b23f3b6a77d1279e',
        id: '69b41269b23f3b6a77d1279e'
    },

    POLICY_1: {
        createDate: '2026-03-13T13:32:08.119Z',
        uuid: '595d65e6-1fc6-42ec-a72d-a12fb2313218',
        name: 'VM0044_1741272604219',
        version: '1',
        description: 'VM0044',
        status: 'PUBLISH',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        policyRoles: [
            'Project_Proponent',
            'VVB'
        ],
        policyGroups: [],
        topicId: '0.0.8204101',
        instanceTopicId: '0.0.8204176',
        policyTag: 'Tag_1773408686116',
        messageId: '1773409092.761373000',
        codeVersion: '1.5.1',
        tools: [
            {
                name: 'Tool 05',
                version: null,
                topicId: '0.0.3418637',
                messageId: '1707833182.503204122'
            },
            {
                name: 'Tool 07',
                version: null,
                topicId: '0.0.2175383',
                messageId: '1706867530.884259218'
            },
            {
                name: 'Tool 12',
                version: null,
                topicId: '0.0.3625013',
                messageId: '1709106946.913157840'
            },
            {
                name: 'Tool 03',
                version: null,
                topicId: '0.0.2182119',
                messageId: '1706867833.676387003'
            }
        ],
        _id: '69b411d8b23f3b6a77d12742',
        userRoles: [
            'Administrator'
        ],
        userGroups: [],
        userRole: 'Administrator',
        userGroup: null,
        tests: [],
        id: '69b411d8b23f3b6a77d12742'
    },

    POLICY_2: {
        createDate: '2026-03-13T13:24:21.116Z',
        uuid: 'ef137508-3e02-4ee3-92fa-8847ca1687cf',
        name: 'CDM AMS-III.AR Policy',
        version: '1',
        description: 'Substituting fossil fuel-based lighting with LED/CFL lighting systems',
        status: 'PUBLISH',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        policyRoles: [
            'Project Participant',
            'VVB'
        ],
        policyGroups: [],
        topicId: '0.0.8204020',
        instanceTopicId: '0.0.8204046',
        policyTag: 'Tag_1773408218292',
        messageId: '1773408455.836215124',
        codeVersion: '1.5.1',
        tools: [
            {
                name: 'Tool 33',
                version: null,
                topicId: '0.0.4865949',
                messageId: '1726593517.484578000'
            },
            {
                name: 'Tool 19',
                version: null,
                topicId: '0.0.2196124',
                messageId: '1706869798.177938003'
            },
            {
                name: 'Tool 21',
                version: null,
                topicId: '0.0.2203279',
                messageId: '1706873385.455822873'
            },
            {
                name: 'Tool 07',
                version: null,
                topicId: '0.0.2175383',
                messageId: '1706867530.884259218'
            }
        ],
        _id: '69b41005b23f3b6a77d125ed',
        userRoles: [
            'Administrator'
        ],
        userGroups: [],
        userRole: 'Administrator',
        userGroup: null,
        tests: [],
        id: '69b41005b23f3b6a77d125ed'
    }

}

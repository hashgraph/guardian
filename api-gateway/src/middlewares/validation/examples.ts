import * as CsvExamples from './csv-examples.js';

export enum Examples {
    DB_ID = '69aeb71ef8c5b278e3bab4e5',
    DB_ID_2 = '69b8115f3dc0fa022156fb89',
    DB_ID_3 = '69b7da996d2f71c7a55b1fa3',
    MESSAGE_ID = '1773670900.819264517',
    UUID = '9db028d2-03ad-4d49-a178-cf4b67f8c147',
    UUID_2 = 'e9c0d9ee-fc29-4372-89e0-0a7e08516699',
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

    ARTIFACTS_RESPONSE_LIST: [
        {
            createDate: '2026-03-16T09:31:27.902Z',
            updateDate: '2026-03-16T09:31:28.042Z',
            uuid: 'dcc46b7b-3bb8-4a60-8e5b-f7b17ae76d1e',
            policyId: '69b7cdefa48bb15eb7afb3e7',
            name: 'region_emission_factors',
            type: 'JSON',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            extention: 'json',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            _id: '69b7cdefa48bb15eb7afb3e5',
            id: '69b7cdefa48bb15eb7afb3e5'
        },
        {
            createDate: '2026-03-16T09:31:27.898Z',
            updateDate: '2026-03-16T09:31:28.042Z',
            uuid: 'ba6f7bc5-0f91-46a5-a681-1658f93a1b68',
            policyId: '69b7cdefa48bb15eb7afb3e7',
            name: 'country_emission_factors',
            type: 'JSON',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            extention: 'json',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            _id: '69b7cdefa48bb15eb7afb3e3',
            id: '69b7cdefa48bb15eb7afb3e3'
        }
    ],

    ARTIFACTS_UPLOAD_RESPONSE_LIST: [
        {
            createDate: '2026-03-19T14:43:45.250Z',
            updateDate: '2026-03-19T14:43:45.250Z',
            uuid: 'd5fc05d5-efc8-4b00-80d7-020374361452',
            policyId: '69ba978163637d350db5b56f',
            name: '1_profile_preset',
            type: 'JSON',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            extention: 'json',
            category: 'policy',
            _id: '69bc0ba1f6b2fa8ae50f2ec9',
            id: '69bc0ba1f6b2fa8ae50f2ec9'
        }
    ],

    ARTIFACTS_UPLOAD_RESPONSE_LIST_MULTI: [
        {
            createDate: '2026-03-16T09:31:27.902Z',
            updateDate: '2026-03-16T09:31:28.042Z',
            uuid: 'dcc46b7b-3bb8-4a60-8e5b-f7b17ae76d1e',
            policyId: '69b7cdefa48bb15eb7afb3e7',
            name: 'region_emission_factors',
            type: 'JSON',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            extention: 'json',
            category: 'policy',
            _id: '69b7cdefa48bb15eb7afb3e5',
            id: '69b7cdefa48bb15eb7afb3e5'
        },
        {
            createDate: '2026-03-16T09:31:27.898Z',
            updateDate: '2026-03-16T09:31:28.042Z',
            uuid: 'ba6f7bc5-0f91-46a5-a681-1658f93a1b68',
            policyId: '69b7cdefa48bb15eb7afb3e7',
            name: 'country_emission_factors',
            type: 'JSON',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            extention: 'json',
            category: 'policy',
            _id: '69b7cdefa48bb15eb7afb3e3',
            id: '69b7cdefa48bb15eb7afb3e3'
        }
    ],

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
    },

    SEARCH_POLICIES_REQUEST_GLOBAL_WITH_FILTERS: {
        threshold: 0,
        type: 'Global',
        owner: 'did:hedera:testnet:6RM7qg4qcK68ciX3DtSMXYU7jVuvf9qvVL4ciQmTX2j8_0.0.4230990',
        minTokensCount: 5,
        minVcCount: 13,
        minVpCount: 1,
        toolMessageIds: [
            '1741365085.279118931'
        ]
    },

    SEARCH_POLICIES_REQUEST_LOCAL_WITH_POLICY_AND_TOOL: {
        threshold: 0,
        policyId: '69b9719c3ac44dc8f6b5096a',
        type: 'Local',
        toolMessageIds: [
            '1726593517.484578000'
        ]
    },

    SEARCH_BLOCKS_REQUEST_COMPACT: {
        id: Examples.UUID,
        config: {
            id: Examples.UUID,
            blockType: 'interfaceContainerBlock',
            uiMetaData: {
                type: 'blank'
            },
            permissions: ['ANY_ROLE'],
            defaultActive: true,
            onErrorAction: 'no-action',
            tag: '',
            children: [
                {
                    id: Examples.UUID_2,
                    blockType: 'policyRolesBlock',
                    defaultActive: true,
                    uiMetaData: {
                        title: 'Roles',
                        description: 'Choose Roles'
                    },
                    roles: ['Project Participant', 'VVB'],
                    permissions: ['NO_ROLE'],
                    onErrorAction: 'no-action',
                    tag: 'Choose_Roles1',
                    children: [],
                    events: [],
                    artifacts: []
                }
            ],
            events: [],
            artifacts: []
        }
    },

    SEARCH_BLOCKS_RESPONSE_COMPACT: [
        {
            name: 'CDM AMS-III.AR Policy',
            description: 'Substituting fossil fuel-based lighting with LED/CFL lighting systems',
            version: '1',
            owner: Examples.DID,
            topicId: Examples.ACCOUNT_ID,
            messageId: Examples.MESSAGE_ID,
            hash: 12099,
            chains: [
                {
                    hash: 12099,
                    target: {
                        id: Examples.UUID,
                        tag: 'pp_grid_sr',
                        blockType: 'interfaceDocumentsSourceBlock',
                        config: {
                            id: Examples.UUID,
                            blockType: 'interfaceDocumentsSourceBlock',
                            tag: 'pp_grid_sr'
                        },
                        path: [0, 1, 0, 0]
                    },
                    pairs: [
                        {
                            hash: 100,
                            source: {
                                id: Examples.UUID,
                                tag: 'header',
                                blockType: 'interfaceContainerBlock',
                                config: {
                                    id: Examples.UUID,
                                    blockType: 'interfaceContainerBlock',
                                    tag: 'header'
                                },
                                path: [0, 1]
                            },
                            filter: {
                                id: Examples.UUID,
                                tag: 'header',
                                blockType: 'interfaceContainerBlock',
                                config: {
                                    id: Examples.UUID,
                                    blockType: 'interfaceContainerBlock',
                                    tag: 'header'
                                },
                                path: [0, 1]
                            }
                        }
                    ]
                }
            ]
        }
    ],

    SEARCH_POLICIES_RESPONSE_WITH_POLICY_ID: {
        target: {
            type: 'Local',
            id: '69b7cd37a48bb15eb7afb308',
            topicId: '0.0.8245828',
            messageId: '1773653426.428090343',
            uuid: '9d948508-4cc4-49f3-9c1e-c9fb9976c602',
            name: 'Remote Work GHG Policy',
            description: 'Remote_Work_GHG_Policy',
            version: '1',
            status: 'PUBLISH',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            vcCount: 1,
            vpCount: 0,
            tokensCount: 0,
            rate: 100,
            tags: []
        },
        result: [
            {
                type: 'Local',
                id: '69b7da996d2f71c7a55b1fa3',
                topicId: '0.0.8246509',
                messageId: '1773662571.607239000',
                uuid: 'df23e461-c3ba-48d5-9bf6-db1f96a2f2b7',
                name: 'CDM AMS-III.AR Policy',
                description: 'Substituting fossil fuel-based lighting with LED/CFL lighting systems',
                version: '1',
                status: 'PUBLISH',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
                vcCount: 1,
                vpCount: 0,
                tokensCount: 0,
                rate: 9,
                tags: []
            },
            {
                type: 'Local',
                id: '69b9727c3ac44dc8f6b50a8b',
                topicId: '0.0.8264658',
                messageId: '1773763808.323660342',
                uuid: 'e8e70f1c-fc6f-48cd-a0f1-6de39f6efb02',
                name: 'CDM AMS-II.G Policy',
                description: 'Energy efficiency measures in thermal applications of non-renewable biomass',
                version: '1',
                status: 'PUBLISH',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
                vcCount: 1,
                vpCount: 0,
                tokensCount: 0,
                rate: 9,
                tags: []
            },
            {
                type: 'Local',
                id: '69b9719c3ac44dc8f6b5096a',
                topicId: '0.0.8264592',
                messageId: '1773761007.292762801',
                uuid: 'a57b4e28-2b81-4d43-83a6-8c85d7983b0f',
                name: 'CDM AMS-III.BB',
                description: 'CDM AMS-III.BB. policy',
                version: '1',
                status: 'PUBLISH',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
                vcCount: 1,
                vpCount: 0,
                tokensCount: 0,
                rate: 8,
                tags: []
            }
        ]
    },

    SEARCH_POLICIES_RESPONSE_GLOBAL_WITH_FILTERS: {
        target: null,
        result: [
            {
                type: 'Global',
                topicId: '0.0.4230993',
                messageId: '1713278598.610141122',
                uuid: 'c4db13c6-7c04-490a-881a-e41cfdb435d0',
                name: 'CDM AMS-III.AR Policy',
                description: 'Substituting fossil fuel-based lighting with LED/CFL lighting systems',
                version: '1',
                status: 'PUBLISH',
                owner: 'did:hedera:testnet:6RM7qg4qcK68ciX3DtSMXYU7jVuvf9qvVL4ciQmTX2j8_0.0.4230990',
                vcCount: 22,
                vpCount: 4,
                tokensCount: 6030,
                tags: []
            }
        ]
    },

    SEARCH_POLICIES_RESPONSE_LOCAL_WITH_POLICY_AND_TOOL: {
        target: {
            type: 'Local',
            id: '69b9719c3ac44dc8f6b5096a',
            topicId: '0.0.8264592',
            messageId: '1773761007.292762801',
            uuid: 'a57b4e28-2b81-4d43-83a6-8c85d7983b0f',
            name: 'CDM AMS-III.BB',
            description: 'CDM AMS-III.BB. policy',
            version: '1',
            status: 'PUBLISH',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
            vcCount: 1,
            vpCount: 0,
            tokensCount: 0,
            rate: 100,
            tags: []
        },
        result: [
            {
                type: 'Local',
                id: '69b7da996d2f71c7a55b1fa3',
                topicId: '0.0.8246509',
                messageId: '1773662571.607239000',
                uuid: 'df23e461-c3ba-48d5-9bf6-db1f96a2f2b7',
                name: 'CDM AMS-III.AR Policy',
                description: 'Substituting fossil fuel-based lighting with LED/CFL lighting systems',
                version: '1',
                status: 'PUBLISH',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
                vcCount: 1,
                vpCount: 0,
                tokensCount: 0,
                rate: 63,
                tags: []
            },
            {
                type: 'Local',
                id: '69b9727c3ac44dc8f6b50a8b',
                topicId: '0.0.8264658',
                messageId: '1773763808.323660342',
                uuid: 'e8e70f1c-fc6f-48cd-a0f1-6de39f6efb02',
                name: 'CDM AMS-II.G Policy',
                description: 'Energy efficiency measures in thermal applications of non-renewable biomass',
                version: '1',
                status: 'PUBLISH',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8145348',
                vcCount: 1,
                vpCount: 0,
                tokensCount: 0,
                rate: 63,
                tags: []
            }
        ]
    },

    COMPARE_POLICIES_RESPONSE_SINGLE: {
        left: {},
        right: {},
        total: 24,
        blocks: { columns: [], report: [] },
        roles: { columns: [], report: [] },
        groups: { columns: [], report: [] },
        topics: { columns: [], report: [] },
        tokens: { columns: [], report: [] },
        tools: { columns: [], report: [] }
    },

    COMPARE_POLICIES_RESPONSE_MULTI: {
        size: 3,
        left: {},
        rights: [],
        totals: [60, 99],
        blocks: { columns: [], report: [] },
        roles: { columns: [], report: [] },
        groups: { columns: [], report: [] },
        topics: { columns: [], report: [] },
        tokens: { columns: [], report: [] },
        tools: { columns: [], report: [] }
    },

    COMPARE_MODULES_REQUEST: {
        eventsLvl: '2',
        propLvl: '2',
        childrenLvl: '2',
        idLvl: '0',
        moduleId1: '69baa4cf63637d350db5b59c',
        moduleId2: '69baa4b563637d350db5b594'
    },

    COMPARE_MODULES_RESPONSE: {
        left: {
            id: '69baa4cf63637d350db5b59c',
            name: 'Module_1',
            description: 'Description'
        },
        right: {
            id: '69baa4b563637d350db5b594',
            name: 'Module_2',
            description: ''
        },
        total: 22,
        blocks: { columns: [], report: [] },
        inputEvents: { columns: [], report: [] },
        outputEvents: { columns: [], report: [] },
        variables: { columns: [], report: [] }
    },

    COMPARE_SCHEMAS_RESPONSE: {
        left: {
            id: Examples.DB_ID,
            name: 'Schema_1',
            description: 'Description_1',
            uuid: Examples.UUID,
            topicId: Examples.ACCOUNT_ID,
            version: '1.0.0',
            iri: '#20e0202f-bbf6-441e-97e8-b2c9af9a3a4d&1.0.0',
            policy: 'CDM AMS-II.J Policy'
        },
        right: {
            id: Examples.DB_ID_2,
            name: 'Schema_2',
            description: 'Description_2',
            uuid: '3ec235e9-fffc-42ff-b1c3-f3ba712b8a5b',
            topicId: '0.0.8264622',
            version: '1.0.0',
            iri: '#e998578c-ef14-4c4b-96a8-3158c5a0f9ab&1.0.0',
            policy: 'VM0042 V2.1'
        },
        total: 44,
        fields: { columns: [], report: [] }
    },

    COMPARE_TOOLS_REQUEST_BY_IDS: {
        eventsLvl: '0',
        propLvl: '0',
        childrenLvl: '0',
        idLvl: '0',
        toolId1: Examples.DB_ID,
        toolId2: Examples.DB_ID_2
    },

    COMPARE_TOOLS_REQUEST_BY_LIST: {
        eventsLvl: '0',
        propLvl: '0',
        childrenLvl: '0',
        idLvl: '0',
        toolIds: [
            Examples.DB_ID,
            Examples.DB_ID_2,
            Examples.DB_ID_3
        ]
    },

    COMPARE_TOOLS_RESPONSE_SINGLE: {
        left: {
            id: '69b9727a3ac44dc8f6b50a44',
            name: 'Tool 30',
            description: '',
            hash: '4r7i6SXuDxDrk8dkwomzgkfFp8FqMuWSCsuWqZhhYLZ4',
            messageId: '1707417996.173398196'
        },
        right: {
            id: '69b7da936d2f71c7a55b1e99',
            name: 'Tool 21',
            description: '',
            hash: '71ZWDSX2cUPsye4AuMUqXUhgk1XBDnpi4Ky1mtjYqYom',
            messageId: '1706873385.455822873'
        },
        total: 74,
        blocks: { columns: [], report: [] },
        inputEvents: { columns: [], report: [] },
        outputEvents: { columns: [], report: [] },
        variables: { columns: [], report: [] }
    },

    COMPARE_TOOLS_RESPONSE_MULTI: {
        size: 3,
        left: {
            id: '69b9727a3ac44dc8f6b50a44',
            name: 'Tool 30',
            description: '',
            hash: '4r7i6SXuDxDrk8dkwomzgkfFp8FqMuWSCsuWqZhhYLZ4',
            messageId: '1707417996.173398196'
        },
        rights: [
            {
                id: '69b7da936d2f71c7a55b1e99',
                name: 'Tool 21',
                description: '',
                hash: '71ZWDSX2cUPsye4AuMUqXUhgk1XBDnpi4Ky1mtjYqYom',
                messageId: '1706873385.455822873'
            },
            {
                id: '69b7da8d6d2f71c7a55b1e67',
                name: 'Tool 33',
                description: '',
                hash: 'Ceo5z8VkMbYWAcgjhesqGXHzJ9Z6aEdEEGWA4Jq4XE2i',
                messageId: '1726593517.484578000'
            }
        ],
        totals: [74, 52],
        blocks: { columns: [], report: [] },
        inputEvents: { columns: [], report: [] },
        outputEvents: { columns: [], report: [] },
        variables: { columns: [], report: [] }
    },

    COMPARE_DOCUMENTS_REQUEST_BY_IDS: {
        eventsLvl: '0',
        propLvl: '0',
        childrenLvl: '0',
        idLvl: '0',
        documentId1: Examples.DB_ID,
        documentId2: Examples.DB_ID_2
    },

    COMPARE_DOCUMENTS_REQUEST_BY_LIST: {
        eventsLvl: '0',
        propLvl: '0',
        childrenLvl: '0',
        idLvl: '0',
        documentIds: [
            Examples.DB_ID,
            Examples.DB_ID_2,
            Examples.DB_ID_3
        ]
    },

    COMPARE_DOCUMENTS_RESPONSE_SINGLE: {
        left: {
            id: Examples.DB_ID,
            type: 'VerifiableCredential',
            owner: Examples.DID,
            policy: '69b9727c3ac44dc8f6b50a8b'
        },
        right: {
            id: Examples.DB_ID_2,
            type: 'VerifiableCredential',
            owner: Examples.DID,
            policy: '69b7da996d2f71c7a55b1fa3'
        },
        total: 68,
        documents: { columns: [], report: [] }
    },

    COMPARE_DOCUMENTS_RESPONSE_MULTI: {
        size: 3,
        left: {
            id: Examples.DB_ID,
            type: 'VerifiableCredential',
            owner: Examples.DID,
            policy: '69b9727c3ac44dc8f6b50a8b'
        },
        rights: [
            {
                id: Examples.DB_ID_2,
                type: 'VerifiableCredential',
                owner: Examples.DID,
                policy: '69b7da996d2f71c7a55b1fa3'
            },
            {
                id: Examples.DB_ID_3,
                type: 'VerifiableCredential',
                owner: Examples.DID,
                policy: '69afeab013b23cf457db9720'
            }
        ],
        totals: [68, 51],
        documents: { columns: [], report: [] }
    },

    COMPARE_POLICIES_EXPORT_CSV_RESPONSE: CsvExamples.COMPARE_POLICIES_EXPORT_CSV_RESPONSE,
    COMPARE_MODULES_EXPORT_CSV_RESPONSE: CsvExamples.COMPARE_MODULES_EXPORT_CSV_RESPONSE,
    COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE: CsvExamples.COMPARE_SCHEMAS_EXPORT_CSV_RESPONSE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE: CsvExamples.COMPARE_TOOLS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI: CsvExamples.COMPARE_TOOLS_EXPORT_CSV_RESPONSE_MULTI,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE: CsvExamples.COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_SINGLE,
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI: CsvExamples.COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI

}

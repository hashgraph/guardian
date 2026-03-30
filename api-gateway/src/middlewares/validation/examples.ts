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
    REFRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCIsIm5hbWUiOiJFeGFtcGxlVXNlciIsImV4cGlyZUF0IjoxNzAwMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDB9.EXAMPLE_SIGNATURE_NOT_VALID',
    ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkV4YW1wbGVVc2VyIiwicm9sZSI6IlNUQU5EQVJEX1JFR0lTVFJZIiwiZXhwaXJlQXQiOjE3MDAwMDAwMDAwMDAsImlhdCI6MTcwMDAwMDAwMH0.EXAMPLE_SIGNATURE_NOT_VALID',
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

    WORKER_TASK_COMPLETE: {
        createDate: '2026-03-25T14:39:22.548Z',
        updateDate: '2026-03-25T14:39:34.989Z',
        taskId: '4001e7db-e8ee-4716-97e1-c9483a9b43b2',
        type: 'add-file',
        sent: true,
        isRetryableTask: true,
        processedTime: '2026-03-25T14:39:34.988Z',
        done: true,
        interception: '69b00a309fe1408d21bea39a',
        id: null
    },

    WORKER_TASK_ERROR: {
        createDate: '2026-03-11T09:05:00.778Z',
        updateDate: '2026-03-11T09:05:30.188Z',
        taskId: 'adb9dfe2-d61b-48ef-94f5-dde8d0395a11',
        type: 'get-user-balance-rest',
        sent: true,
        isRetryableTask: false,
        processedTime: '2026-03-11T09:05:01.054Z',
        isError: true,
        errorReason: 'connect ETIMEDOUT 35.186.230.203:443',
        interception: '69b00a309fe1408d21bea39a',
        id: null
    },

    WORKER_TASK_PROCESSING: {
        createDate: '2026-03-25T21:25:15.617Z',
        updateDate: '2026-03-25T21:25:15.617Z',
        taskId: 'a7d799ca-ace4-4959-8155-073800d9e56a',
        type: 'add-file',
        sent: true,
        isRetryableTask: true,
        processedTime: '2026-03-25T21:25:15.700Z',
        interception: '69b00a309fe1408d21bea39a',
        id: null
    },

    WORKER_TASK_IN_QUEUE: {
        createDate: '2026-03-25T21:25:15.617Z',
        updateDate: '2026-03-25T21:25:15.617Z',
        taskId: 'b3c456de-ace4-4959-8155-073800d9e56a',
        type: 'add-file',
        isRetryableTask: true,
        processedTime: null,
        interception: '69b00a309fe1408d21bea39a',
        id: null
    },

    THEME: {
        createDate: '2026-03-25T14:36:51.320Z',
        updateDate: '2026-03-25T14:36:51.320Z',
        uuid: '71725b88-1801-4ab6-b672-3c133cd73e89',
        name: 'Test Theme',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        rules: [
            {
                description: 'Container style',
                text: '#ffffff',
                background: '#1a1a2e',
                border: '#16213e',
                shape: '0',
                borderWidth: '2px',
                filterType: 'type',
                filterValue: 'interfaceContainerBlock'
            }
        ],
        id: '69c3f303810b639b34bae861'
    },

    TAG: {
        uuid: '9db028d2-03ad-4d49-a178-cf4b67f8c147',
        name: 'Carbon Credit Verification',
        description: 'Tag for verified carbon credit documents',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        date: '2026-03-03T17:25:53.312Z',
        entity: 'PolicyDocument',
        status: 'Published',
        operation: 'Create',
        topicId: '0.0.6046379',
        messageId: '1773670900.819264517',
        policyId: '69b411d8b23f3b6a77d12742',
        uri: 'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i',
        target: '1773670900.819264517',
        localTarget: '69b411d8b23f3b6a77d12742',
        document: {},
        tagSchemaId: null,
        inheritTags: false
    },

    TAG_MAP: {
        entity: 'PolicyDocument',
        target: '1773670900.819264517',
        refreshDate: '2026-03-03T17:30:00.000Z',
        tags: [
            {
                uuid: '9db028d2-03ad-4d49-a178-cf4b67f8c147',
                name: 'Carbon Credit Verification',
                description: 'Tag for verified carbon credit documents',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
                date: '2026-03-03T17:25:53.312Z',
                entity: 'PolicyDocument',
                status: 'Published',
                operation: 'Create',
                topicId: '0.0.6046379',
                messageId: '1773670900.819264517',
                policyId: '69b411d8b23f3b6a77d12742',
                target: '1773670900.819264517',
                localTarget: '69b411d8b23f3b6a77d12742'
            }
        ]
    },

    TOKEN: {
        createDate: '2026-03-10T13:18:36.660Z',
        updateDate: '2026-03-10T13:18:36.660Z',
        tokenId: '737a27a4-5706-4d87-b5a2-c8a12c45d109',
        tokenName: 'VCU',
        tokenSymbol: 'VCU',
        tokenType: 'non-fungible',
        decimals: 0,
        initialSupply: 0,
        adminId: null,
        changeSupply: true,
        enableAdmin: true,
        enableKYC: true,
        enableFreeze: true,
        enableWipe: true,
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        policyId: null,
        draftToken: true,
        id: '69b01a2c3f674c474aa928e4',
        policies: ['VM0042 10/27 (DRAFT)'],
        policyIds: ['69b01a323f674c474aa931ba'],
        canDelete: true
    },

    TOKEN_INFO: {
        createDate: '2026-03-10T13:18:36.660Z',
        updateDate: '2026-03-10T13:18:36.660Z',
        tokenId: '737a27a4-5706-4d87-b5a2-c8a12c45d109',
        tokenName: 'VCU',
        tokenSymbol: 'VCU',
        tokenType: 'non-fungible',
        decimals: 0,
        initialSupply: 0,
        adminId: null,
        changeSupply: true,
        enableAdmin: true,
        enableKYC: true,
        enableFreeze: true,
        enableWipe: true,
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        policyId: null,
        draftToken: true,
        id: '69b01a2c3f674c474aa928e4',
        policies: ['VM0042 10/27 (DRAFT)'],
        policyIds: ['69b01a323f674c474aa931ba'],
        canDelete: true,
        associated: false,
        frozen: false,
        kyc: false,
        balance: '0'
    },

    TOOL: {
        hash: 'CbtFMU4gQb8pC27o6Lh1ZgUXCNx343bJSFMyYCNLt7QM',
        uuid: '999e1216-16a2-4e0b-b926-9da25b53b8b2',
        name: 'AR Tool 14',
        description: 'AR Tool 14 (Estimation of carbon stocks and change in carbon stocks of trees and shrubs in A/R CDM project activities)',
        status: 'PUBLISHED',
        creator: 'did:hedera:testnet:7FAR5SjztXurtUdjHsj8WoAqBNA6jMYLAiAEHfxsLvnF_0.0.5148380',
        owner: 'did:hedera:testnet:7FAR5SjztXurtUdjHsj8WoAqBNA6jMYLAiAEHfxsLvnF_0.0.5148380',
        topicId: '0.0.5738458',
        messageId: '1742305279.639972851',
        id: '69b01a2b3f674c474aa92820'
    },

    VP_DOCUMENT: {
        id: '69aeb71ef8c5b278e3bab4e5',
        hash: 'GcDE9NsPJc7oCZvSVJySCZHxTxvjc3ZAMgtKozP1r1Eh',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        type: 'VP',
        policyId: '69b411d8b23f3b6a77d12742',
        tag: 'mint_token',
        createDate: '2026-03-03T17:25:53.312Z',
        updateDate: '2026-03-03T17:26:10.000Z',
        document: {
            id: 'urn:uuid:962aa166-7da1-4fab-ad88-6681ac55f770',
            type: ['VerifiablePresentation'],
            '@context': ['https://www.w3.org/2018/credentials/v1']
        }
    },

    TRUST_CHAIN: {
        chain: [
            {
                id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
                type: 'DID',
                tag: '',
                label: 'DID Document',
                schema: '',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
                document: {}
            },
            {
                id: 'urn:uuid:962aa166-7da1-4fab-ad88-6681ac55f770',
                type: 'VC',
                tag: 'create_vc',
                label: 'Verifiable Credential',
                schema: '#StandardRegistry',
                owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
                document: {}
            }
        ],
        userMap: [
            {
                did: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
                username: 'StandardRegistry'
            }
        ]
    },

    WIZARD_CONFIG: {
        roles: ['Project_Proponent', 'VVB'],
        policy: {
            name: 'New Wizard Policy',
            description: 'Policy created by wizard',
            topicDescription: 'Wizard policy topic',
            policyTag: 'Tag_wizard_1773408686116'
        },
        schemas: [],
        trustChain: []
    },

    WIZARD_RESULT: {
        policyId: '69b411d8b23f3b6a77d12742',
        wizardConfig: {
            roles: ['Project_Proponent', 'VVB'],
            policy: {
                name: 'New Wizard Policy',
                description: 'Policy created by wizard',
                topicDescription: 'Wizard policy topic',
                policyTag: 'Tag_wizard_1773408686116'
            },
            schemas: [],
            trustChain: []
        }
    },

    PROFILE: {
        username: 'ExampleUser',
        role: 'STANDARD_REGISTRY',
        did: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        hederaAccountId: '0.0.6046379',
        confirmed: true,
        failed: false,
        topicId: '0.0.6046379',
        parentTopicId: '0.0.1960'
    },

    SCHEMA: {
        createDate: '2026-03-10T13:18:42.450Z',
        updateDate: '2026-03-10T13:18:42.450Z',
        uuid: '3eeb3f6b-da10-43fa-a247-a4df386278b5',
        name: '6.2 Appendix 2: Project Risks Table',
        description: null,
        entity: 'NONE',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        topicId: '0.0.8147477',
        version: '',
        iri: '#3eeb3f6b-da10-43fa-a247-a4df386278b5',
        category: 'POLICY',
        codeVersion: '1.2.0',
        readonly: false,
        system: false,
        active: false,
        id: '69b01a323f674c474aa931b5'
    },

    SETTINGS: {
        operatorId: '0.0.1858',
        operatorKey: '',
        ipfsStorageApiKey: ''
    },

    PERMISSION: {
        name: 'ANALYTIC_POLICY_READ',
        category: 'ANALYTIC',
        entity: 'POLICY',
        action: 'READ',
        disabled: false,
        dependOn: ['POLICIES_POLICY_READ']
    },

    PERMISSION_ROLE: {
        createDate: '2026-03-10T13:06:42.559Z',
        updateDate: '2026-03-10T13:06:54.056Z',
        uuid: '5c4eb19b-a946-4edb-a79f-e7199317824c',
        name: 'Policy User',
        description: '',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        permissions: [
            'CONTRACTS_CONTRACT_READ',
            'POLICIES_POLICY_EXECUTE',
            'POLICIES_POLICY_READ',
            'TOKENS_TOKEN_READ',
            'TAGS_TAG_READ'
        ],
        default: false,
        readonly: false,
        id: '69b017625a07d3f3b40a9acd'
    },

    BRANDING: {
        headerColor: '#0031ff',
        headerColor1: '#8259ef',
        primaryColor: '#0031ff',
        companyName: 'GUARDIAN',
        companyLogoUrl: '/assets/images/logo.png',
        loginBannerUrl: '/assets/bg.jpg',
        faviconUrl: 'favicon.ico',
        termsAndConditions: 'Lorem Ipsum Version Introduction...'
    },

    RELAYER_ACCOUNT: {
        createDate: '2026-03-25T15:30:37.191Z',
        updateDate: '2026-03-25T15:30:37.191Z',
        name: 'New Test Account',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        account: '0.0.6046500',
        username: 'ExampleUser',
        _id: '69c3ff9de85d8b6ef99ef86a',
        id: '69c3ff9de85d8b6ef99ef86a'
    },

    NOTIFICATION_SUCCESS: {
        createDate: '2026-03-25T14:40:28.853Z',
        updateDate: '2026-03-25T14:40:28.853Z',
        userId: '69b00a309fe1408d21bea39a',
        title: 'Policy published',
        type: 'SUCCESS',
        action: 'POLICY_CONFIGURATION',
        result: '69b83f18cd6b7c4adf4139bc',
        message: 'Policy 69b83f18cd6b7c4adf4139bc published',
        read: false,
        old: false,
        id: '69c3f3dc0c86dc7119046b9f'
    },

    NOTIFICATION_ERROR: {
        createDate: '2026-03-10T13:15:21.260Z',
        updateDate: '2026-03-10T13:15:21.260Z',
        userId: '69b00a309fe1408d21bea39a',
        title: 'Import schema file',
        type: 'ERROR',
        message: 'Cannot destructure property \'category\' of \'(intermediate value)\' as it is null.',
        read: false,
        old: false,
        id: '69b01969b8a32e85cd3714bd'
    },

    SCHEMA_RULE: {
        createDate: '2026-03-25T15:34:42.540Z',
        updateDate: '2026-03-25T15:34:42.540Z',
        uuid: 'f11d9161-a429-46de-989d-3d7bdeb32da6',
        name: 'Test Schema Rule',
        description: 'Description of test schema rule',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        status: 'DRAFT',
        policyId: '69b83f18cd6b7c4adf4139bc',
        policyTopicId: '0.0.8251226',
        policyInstanceTopicId: '0.0.8372748',
        config: { fields: [] },
        id: '69c40092810b639b34bae8a2'
    },

    SCHEMA_RULE_LIST_ITEM: {
        name: 'Test Schema Rule',
        description: 'Description of test schema rule',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        status: 'DRAFT',
        policyId: '69b83f18cd6b7c4adf4139bc',
        config: { fields: [] },
        id: '69c40092810b639b34bae8a2'
    },

    FORMULA: {
        createDate: '2026-03-16T17:35:18.617Z',
        updateDate: '2026-03-25T14:40:22.393Z',
        uuid: 'fb7980f1-f347-47f3-9c1d-698b60162aba',
        name: 'Test 3',
        description: '',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        status: 'PUBLISHED',
        messageId: '1774449622.177353801',
        policyId: '69b83f18cd6b7c4adf4139bc',
        policyTopicId: '0.0.8251226',
        policyInstanceTopicId: '0.0.8372748',
        id: '69b83f56cd6b7c4adf413a1e'
    },

    FORMULA_LIST_ITEM: {
        name: 'Test 3',
        description: '',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        status: 'PUBLISHED',
        policyId: '69b83f18cd6b7c4adf4139bc',
        policyTopicId: '0.0.8251226',
        policyInstanceTopicId: '0.0.8372748',
        id: '69b83f56cd6b7c4adf413a1e'
    },

    MODULE: {
        id: Examples.DB_ID,
        uuid: Examples.UUID,
        type: 'MODULE',
        name: 'Example Module',
        description: 'Example module description',
        status: 'PUBLISHED',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8200599',
        topicId: '0.0.8200599',
        messageId: Examples.MESSAGE_ID,
        codeVersion: '1.5.1',
        createDate: '2026-03-13T09:26:55.610Z',
        config: {}
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

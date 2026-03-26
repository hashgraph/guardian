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

const EXTERNAL_REQUEST_BODY_EXAMPLE = {
    owner: 'string',
    policyTag: 'string',
    document: {
        id: '8f457a5a-c02b-4a18-a7d3-20e4def1bf7f',
        '@context': [
            'https://www.w3.org/2018/credentials/v1'
        ],
        type: [
            'VerifiableCredential',
            'a2274869-4a41-4446-8efd-dacde5a81221'
        ],
        credentialSubject: [
            {
                id: 'did:hedera:testnet:4YZuEXk95TMt2WfuAB5UYJMQSgSfUgBNutnZioUVAxkR_0.0.1774462341919',
                field0: 'value0',
                field1: 'value1',
                policyId: '69c42569ae73da728c8d9027',
                accountId: '0.0.1774462367074'
            }
        ],
        issuer: 'did:hedera:testnet:4YZuEXk95TMt2WfuAB5UYJMQSgSfUgBNutnZioUVAxkR_0.0.1774462341919',
        issuanceDate: '2026-03-25T17:12:17.150Z',
        proof: {
            type: 'Ed25519Signature2018',
            created: '2026-03-25T17:12:17.150Z',
            verificationMethod: 'did:hedera:testnet:4YZuEXk95TMt2WfuAB5UYJMQSgSfUgBNutnZioUVAxkR_0.0.1774462341919#did-root-key',
            proofPurpose: 'assertionMethod',
            jws: 'eyJhbGciOiJFZERTQSJ9..signature'
        }
    }
};

const EXTERNAL_SYNC_EVENTS_RESPONSE_EXAMPLE = {
    response: {},
    result: null,
    steps: []
};

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

/**
 * Short placeholder for customLogicBlock.expression in tool examples (production scripts are often very long).
 * Same pattern as GET /tools/:id example below.
 */
const TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT =
    'function calc_tool_16(document) {\n' +
    '    document.C14 = document.tool_01?.field2?.field1 === \'Yes\' ? \'Yes\' : \'No\';\n' +
    '    // ... [calculation logic continues, hundreds of lines] ...\n' +
    '    return document;\n' +
    '}\n' +
    'calc();';

const PROFILE_DID_DOCUMENT_SAMPLE = {
    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
    '@context': 'https://www.w3.org/ns/did/v1',
    verificationMethod: [
        {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
            type: 'Ed25519VerificationKey2018',
            controller:
                'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
            publicKeyBase58: '2vKLgbwo1DoxTebvSzmz1mk1H4tJTX3FaUt4RUFPCZ6p'
        },
        {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
            type: 'Bls12381G2Key2020',
            controller:
                'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
            publicKeyBase58:
                '24LRAHd2Dc7d2qziS9D6hXHFmc5uir2TDzowcxzprCd24ynNBjz5NP1kcpGoFbHdRLZo69ZvwdcsjNGSxEyDyCpgqe2Z1ihL8Ysy8Z9KA6wJmBUjEmTYdNNMur8mxgmapoq6'
        }
    ],
    authentication: [
        'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key'
    ],
    assertionMethod: ['#did-root-key', '#did-root-key-bbs']
};

export const ObjectExamples = {
    PERMISSION_SR: PERMISSIONS_SR,
    EXTERNAL_REQUEST_BODY_EXAMPLE,
    EXTERNAL_SYNC_EVENTS_RESPONSE_EXAMPLE,

    CONTRACTS_LIST_RESPONSE_WIPE: [
        {
            createDate: '2026-03-20T08:24:09.121Z',
            updateDate: '2026-03-20T09:08:01.905Z',
            contractId: '0.0.8300131',
            description: 'Wipe contract description',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            permissions: 7,
            topicId: '0.0.8300126',
            type: 'WIPE',
            lastSyncEventTimeStamp: '1773997659.461000723',
            wipeContractIds: [],
            syncDisabled: false,
            version: '1.0.1',
            wipeTokenIds: [],
            id: '69bd0429fdc2fd0bb2f9e95b'
        }
    ],

    CONTRACTS_LIST_RESPONSE_RETIRE: [
        {
            createDate: '2026-03-20T08:26:36.292Z',
            updateDate: '2026-03-20T08:55:03.162Z',
            contractId: '0.0.8300155',
            description: 'Retire Contract description',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            permissions: 3,
            topicId: '0.0.8300142',
            type: 'RETIRE',
            lastSyncEventTimeStamp: '1773996847.377859483',
            wipeContractIds: [],
            syncDisabled: false,
            version: '1.0.1',
            wipeTokenIds: ['0.0.8300593'],
            id: '69bd04bcfdc2fd0bb2f9e971'
        }
    ],

    CONTRACTS_CREATE_RESPONSE_RETIRE: {
        createDate: '2026-03-20T09:30:28.129Z',
        updateDate: '2026-03-20T09:30:28.129Z',
        contractId: '0.0.8301737',
        description: 'Retire contract description',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        permissions: 3,
        topicId: '0.0.8301715',
        type: 'RETIRE',
        wipeContractIds: [],
        syncDisabled: false,
        version: '1.0.1',
        wipeTokenIds: [],
        id: '69bd13b4fdc2fd0bb2f9eccc'
    },

    CONTRACTS_CREATE_RESPONSE_WIPE: {
        createDate: '2026-03-20T09:31:11.101Z',
        updateDate: '2026-03-20T09:31:11.101Z',
        contractId: '0.0.8301741',
        description: 'Wipe contract description',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        permissions: 7,
        topicId: '0.0.8301716',
        type: 'WIPE',
        wipeContractIds: [],
        syncDisabled: false,
        version: '1.0.1',
        wipeTokenIds: [],
        id: '69bd13df2a7b53526de3826b'
    },

    CONTRACTS_CREATE_REQUEST_RETIRE: {
        type: 'RETIRE',
        description: 'Retire contract description'
    },

    CONTRACTS_CREATE_REQUEST_WIPE: {
        type: 'WIPE',
        description: 'Wipe contract description'
    },

    CONTRACTS_IMPORT_REQUEST: {
        contractId: '0.0.8301737',
        description: 'Imported contract'
    },

    CONTRACTS_IMPORT_RESPONSE_RETIRE: {
        createDate: '2026-03-20T09:30:28.129Z',
        updateDate: '2026-03-20T09:30:28.129Z',
        contractId: '0.0.8301737',
        description: 'Imported contract',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        permissions: 3,
        topicId: '0.0.8301715',
        type: 'RETIRE',
        lastSyncEventTimeStamp: '1773997659.461000723',
        wipeContractIds: [],
        syncDisabled: false,
        version: '1.0.1',
        wipeTokenIds: [],
        id: '69bd13b4fdc2fd0bb2f9eccc'
    },

    CONTRACTS_IMPORT_RESPONSE_WIPE: {
        createDate: '2026-03-20T09:31:11.101Z',
        updateDate: '2026-03-20T09:31:11.101Z',
        contractId: '0.0.8301741',
        description: 'Imported contract',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        permissions: 7,
        topicId: '0.0.8301716',
        type: 'WIPE',
        lastSyncEventTimeStamp: '1773997659.461000723',
        wipeContractIds: [],
        syncDisabled: false,
        version: '1.0.1',
        wipeTokenIds: [],
        id: '69bd13df2a7b53526de3826b'
    },

    WIPER_REQUESTS_RESPONSE: [
        {
            createDate: '2026-03-20T12:55:01.614Z',
            updateDate: '2026-03-20T12:55:01.614Z',
            contractId: '0.0.8300131',
            user: '0.0.8300155',
            token: '0.0.8305077',
            id: '69bd43a55b864fe37954a8bb'
        }
    ],

    CONTRACTS_SET_RETIRE_POOL_REQUEST: {
        tokens: [
            {
                token: '0.0.8300593',
                count: 1
            }
        ],
        immediately: true
    },

    RETIRE_POOLS_RESPONSE: [
        {
            createDate: '2026-03-20T17:58:51.312Z',
            updateDate: '2026-03-20T18:00:01.342Z',
            contractId: '0.0.8308132',
            tokens: [
                {
                    token: '0.0.8308700',
                    count: 1,
                    type: 'non-fungible',
                    tokenSymbol: 'TT',
                    decimals: '0',
                    contract: '0.0.8308101'
                },
                {
                    token: '0.0.8308712',
                    count: 3,
                    type: 'non-fungible',
                    tokenSymbol: 'DD',
                    decimals: '0',
                    contract: '0.0.8308101'
                }
            ],
            tokenIds: ['0.0.8308700', '0.0.8308712'],
            immediately: true,
            enabled: false,
            id: '69bd8adb90fe6f912cbb0d05'
        },
        {
            createDate: '2026-03-20T17:14:31.038Z',
            updateDate: '2026-03-20T18:00:01.342Z',
            contractId: '0.0.8308132',
            tokens: [
                {
                    token: '0.0.8308361',
                    count: 3,
                    type: 'fungible',
                    tokenSymbol: 'CER',
                    decimals: '0',
                    contract: '0.0.8308101'
                }
            ],
            tokenIds: ['0.0.8308361'],
            immediately: false,
            enabled: true,
            id: '69bd80773090533214e7380e'
        }
    ],

    CONTRACTS_RETIRE_TOKENS_REQUEST_FT: [
        {
            token: '0.0.8300593',
            count: 3,
            serials: []
        }
    ],

    CONTRACTS_RETIRE_TOKENS_REQUEST_NFT: [
        {
            token: '0.0.8300593',
            count: 0,
            serials: [1, 2, 4]
        }
    ],

    RETIRE_VCS_INDEXER_RESPONSE: [
        {
            id: '66ee387945ab8bf9448f45e2',
            lastUpdate: 0,
            topicId: '0.0.4641052',
            consensusTimestamp: '1722418989.344504535',
            owner: '0.0.1416',
            uuid: '8494b750-eed6-4d13-82a1-5cc1a644ffae',
            status: 'ISSUE',
            type: 'VC-Document',
            action: 'create-vc-document',
            lang: 'en-US',
            responseType: 'str',
            options: {
                issuer: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.4640363',
                relationships: null,
                documentStatus: null,
                encodedData: false
            },
            analytics: {
                textSearch: '0.0.4641052|0.0.1416|1722418989.344504535|8494b750-eed6-4d13-82a1-5cc1a644ffae|ISSUE|VC-Document|en-US||did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.4640363|0.0.4437864|0.0.4641053|[object Object]|ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64|did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.4640363|Retire|Retire',
                schemaId: '1743436678.828522000',
                schemaName: 'Retire'
            },
            analyticsUpdate: 1773995161141,
            coordUpdate: 1756843304325,
            files: ['bafkreihwnas7c7ji53iolrjkjuqevqdg2j6je2supras5vghzjq5ccnyai'],
            documents: [
                {
                    id: 'urn:uuid:e7c97bd5-39a3-4f98-b642-b20ec4f81aaf',
                    type: ['VerifiableCredential'],
                    issuer: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.4640363',
                    issuanceDate: '2024-07-31T09:43:02.117Z',
                    '@context': ['https://www.w3.org/2018/credentials/v1', 'ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64'],
                    credentialSubject: [
                        {
                            user: '0.0.4437864',
                            contractId: '0.0.4641053',
                            tokens: [
                                {
                                    tokenId: '0.0.4641082',
                                    count: 0,
                                    serials: [23, 22, 21, 20, 19],
                                    type: 'Token',
                                    '@context': ['ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64']
                                }
                            ],
                            '@context': ['ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64'],
                            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.4640363',
                            type: 'Retire'
                        }
                    ],
                    proof: {
                        type: 'Ed25519Signature2018',
                        created: '2024-07-31T09:43:02Z',
                        verificationMethod: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.4640363#did-root-key',
                        proofPurpose: 'assertionMethod',
                        jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..DGYzJmYogDgbByIERm8cnb_zOJsAKWLg79hW2bkp2mleb57VRaEjm8bOwj9AizlSD4zQzhmXXux7L_nhRO0yCQ'
                    }
                }
            ],
            topics: [],
            tokens: [],
            sequenceNumber: 3,
            loaded: true
        }
    ],

    RETIRE_VCS_RESPONSE: [
        {
            createDate: '2026-03-20T18:36:53.698Z',
            updateDate: '2026-03-20T18:36:53.698Z',
            hash: '88chLeeXjKUXa13dNeEJz2tNehsjo3HQGUX5QH3kmY6b',
            hederaStatus: 'NEW',
            signature: 0,
            type: 'RETIRE',
            option: { status: 'NEW' },
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            document: {
                id: 'urn:uuid:93328f13-cac2-49a8-9c30-fb52842093dd',
                type: ['VerifiableCredential'],
                issuer: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
                issuanceDate: '2026-03-20T18:36:34.285Z',
                '@context': ['https://www.w3.org/2018/credentials/v1', 'ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64'],
                credentialSubject: [
                    {
                        user: '0.0.6057669',
                        contractId: '0.0.8308132',
                        tokens: [{ tokenId: '0.0.8308164', count: 0, serials: [2, 3, 4, 10] }],
                        '@context': ['ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64'],
                        id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
                        type: 'Retire'
                    }
                ],
                proof: {
                    type: 'Ed25519Signature2018',
                    created: '2026-03-20T18:36:34Z',
                    verificationMethod: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835#did-root-key',
                    proofPurpose: 'assertionMethod',
                    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..f71046hE9geZXL7uPc5EIc2YsNGMWsRakFwN_iMht4O6njdQZPtKckkQ6H9P1pZBaRz-_yaAy-gmfO-I3LJDBw'
                }
            },
            documentFileId: '69bd93c590fe6f912cbb0d36',
            documentFields: ['credentialSubject.0.user'],
            tableFileIds: [],
            id: '69bd93c590fe6f912cbb0d38'
        },
        {
            createDate: '2026-03-20T10:44:47.623Z',
            updateDate: '2026-03-20T10:44:47.623Z',
            hash: '7Sj7GyTA7TocoZGfVczb9jSfGhitHKZ133G7pny4nFTV',
            hederaStatus: 'NEW',
            signature: 0,
            type: 'RETIRE',
            option: { status: 'NEW' },
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            document: {
                id: 'urn:uuid:2e122bba-2f7e-4f46-9ea6-2d790e300caa',
                type: ['VerifiableCredential'],
                issuer: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
                issuanceDate: '2026-03-20T10:44:31.703Z',
                '@context': ['https://www.w3.org/2018/credentials/v1', 'ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64'],
                credentialSubject: [
                    {
                        user: '0.0.6057669',
                        contractId: '0.0.8300155',
                        tokens: [{ tokenId: '0.0.8302213', count: 6, serials: [] }],
                        '@context': ['ipfs://bafkreifsj2y32io54zolo4ltcjzu45rg4ejqogpkmbkhb3llzig6dpjf64'],
                        id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
                        type: 'Retire'
                    }
                ],
                proof: {
                    type: 'Ed25519Signature2018',
                    created: '2026-03-20T10:44:31Z',
                    verificationMethod: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835#did-root-key',
                    proofPurpose: 'assertionMethod',
                    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..FHaguzWfQoSo2t9SEcAAlJUHNgjtI8_Op189piqVWj_w'
                }
            },
            documentFileId: '69bd251f5b864fe37954a6f9',
            documentFields: ['credentialSubject.0.user'],
            tableFileIds: [],
            id: '69bd251f5b864fe37954a6fb'
        }
    ],

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

    PUSH_RANDOM_KEY_RESPONSE: {
        taskId: '405f156b-fad1-4f88-9b30-925dbeea1e39',
        expectation: 3,
        action: 'Create random key',
        userId: '69bcfd91c98df6ceb05e8a79'
    },

    DEMO_KEY_RESPONSE: {
        id: '0.0.8340839',
        key: '302e020100300506032b657004220420f6168da5cd88b85151e9735252419f0768b87b1a800f7e3b7908d15fa1f358a2'
    },

    REGISTERED_USERS_RESPONSE: [
        {
            did: Examples.DID,
            username: Examples.USER_NAME_SR_1,
            role: Examples.USER_ROLE_SR,
            policyRoles: []
        },
        {
            parent: Examples.DID,
            did: 'did:hedera:testnet:4Rh3aC5jNAzPJwwNtsy95Ava954Thyjk41gREjynY2D9_0.0.8299835',
            username: 'Installer',
            role: 'USER',
            policyRoles: [
                { name: 'CDM AMS-III.AR Policy', version: '1.0.0', role: 'Project Participant' },
                { name: 'CDM AMS-III.BB Policy', version: '1.0.5', role: 'Project Participant' }
            ]
        },
        {
            parent: Examples.DID,
            did: 'did:hedera:testnet:3asJKFx6RVPRJi1qQNuRs26yuqJ7211mWJ5hrxNkmZqA_0.0.8299835',
            username: 'VVB',
            role: 'USER',
            policyRoles: [
                { name: 'CDM AMS-III.AR Policy', version: '1.0.0', role: 'VVB' }
            ]
        }
    ],

    PROFILE_RESPONSE: {
        username: 'StandardRegistry',
        role: 'STANDARD_REGISTRY',
        permissions: [
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
            'WORKER_TASKS_READ',
            'WORKER_TASKS_EXECUTE',
            'WORKER_TASKS_DELETE',
            'POLICIES_EXTERNAL_POLICY_READ',
            'POLICIES_EXTERNAL_POLICY_CREATE',
            'POLICIES_EXTERNAL_POLICY_UPDATE',
            'POLICIES_EXTERNAL_POLICY_DELETE',
            'LOG_LOG_READ',
            'LOG_SYSTEM_READ'
        ],
        did: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        hederaAccountId: '0.0.6046379',
        location: 'local',
        confirmed: true,
        failed: false,
        topicId: '0.0.8361161',
        parentTopicId: '0.0.1960',
        didDocument: {
            createDate: '2026-03-24T17:54:47.965Z',
            updateDate: '2026-03-24T17:55:01.913Z',
            did: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            document: {
                id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
                '@context': 'https://www.w3.org/ns/did/v1',
                verificationMethod: [
                    {
                        id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161#did-root-key',
                        type: 'Ed25519VerificationKey2018',
                        controller: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
                        publicKeyBase58: 'QDui45JN8tAZyc8aNcgbjKH8DQDzgXYpNGD7wfpeqwSAsm3FJ5TymhXz7japEGMW'
                    },
                    {
                        id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161#did-root-key-bbs',
                        type: 'Bls12381G2Key2020',
                        controller: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
                        publicKeyBase58: 'sneuVgE8ZoiH9kJzG1uAZZ9Rgj1wcfWhJv2DACLzqvdPkVzgWRPKFQ2eZPZRKYoUyoZM44UXViXWQvpWAjaML739EuJXEcsanrKvKsaBUAN5GG3Zx82NP8c2pZd3rBCQnWM'
                    }
                ],
                authentication: [
                    'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161#did-root-key'
                ],
                assertionMethod: [
                    '#did-root-key',
                    '#did-root-key-bbs'
                ]
            },
            status: 'CREATE',
            messageId: '1774374900.107419100',
            topicId: '0.0.8361161',
            verificationMethods: {
                Ed25519VerificationKey2018: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161#did-root-key',
                Bls12381G2Key2020: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161#did-root-key-bbs'
            },
            id: '69c2cfe734d008dac2664379'
        },
        vcDocument: {
            createDate: '2026-03-24T17:55:35.698Z',
            updateDate: '2026-03-24T17:55:48.545Z',
            hash: '8KKWiMe45XrgPpRsPa9bWJW5sqBNRdzH2ftYgG6TnDia',
            hederaStatus: 'ISSUE',
            signature: 0,
            type: 'STANDARD_REGISTRY',
            option: {
                status: 'NEW'
            },
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8361161',
            messageId: '1774374946.399537000',
            document: {
                id: 'urn:uuid:e2b24cbd-f480-4675-8b68-b51fe72aadfd',
                type: [
                    'VerifiableCredential'
                ],
                issuer: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
                issuanceDate: '2026-03-24T17:55:35.574Z',
                '@context': [
                    'https://www.w3.org/2018/credentials/v1',
                    'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
                ],
                credentialSubject: [
                    {
                        OrganizationName: 'OrgName',
                        Website: 'https://test.test',
                        Tags: 'Tag',
                        '@context': [
                            'ipfs://bafkreihj7gclc4qgem27tre5je6a3t7tpdrk4li6oamdl6bnflwnoyfs5i'
                        ],
                        id: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
                        type: 'StandardRegistry'
                    }
                ],
                proof: {
                    type: 'Ed25519Signature2018',
                    created: '2026-03-24T17:55:35Z',
                    verificationMethod: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161#did-root-key',
                    proofPurpose: 'assertionMethod',
                    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..TktKeCGVTYDA4qY67dN3Tbpy8ufbElVOcYdgAOsx1f1q50FWlMbqsTStESgDX0F-fmVWuuS_D-WSoGMBMqoLAA'
                }
            },
            documentFileId: '69c2d02434d008dac26643ca',
            tableFileIds: [],
            id: '69c2d01734d008dac26643c3'
        }
    },

    /** Typical request body for PUT `/profiles/{username}` and PUT `/profiles/push/{username}` (local Hedera + SR VC fields). */
    PROFILE_CREDENTIALS_PUT_BODY: {
        hederaAccountId: '0.0.6059566',
        hederaAccountKey:
            '3030020100300706052b8104000a04220420dcfc59e2346b4f0cef1c9f11dee3af6c50be449a08badc55764498787e8a1899',
        vcDocument: {
            OrganizationName: 'Another Org name',
            Website: 'https://google.com',
            Tags: 'AnotherTag'
        },
        didDocument: null,
        useFireblocksSigning: false,
        fireblocksConfig: {
            fireBlocksVaultId: '',
            fireBlocksAssetId: '',
            fireBlocksApiKey: '',
            fireBlocksPrivateiKey: ''
        },
        didKeys: []
    },

    /** Reusable DID document sample used by validate / restore examples. */
    PROFILE_DID_DOCUMENT_SAMPLE,

    /** `POST /profiles/did-document/validate` — valid DID document (expected verification method types). */
    PROFILE_DID_DOCUMENT_VALIDATE_REQUEST_VALID: {
        id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
        '@context': 'https://www.w3.org/ns/did/v1',
        verificationMethod: [
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
                type: 'Ed25519VerificationKey2018',
                controller:
                    'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                publicKeyBase58: '2vKLgbwo1DoxTebvSzmz1mk1H4tJTX3FaUt4RUFPCZ6p'
            },
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
                type: 'Bls12381G2Key2020',
                controller:
                    'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                publicKeyBase58:
                    '24LRAHd2Dc7d2qziS9D6hXHFmc5uir2TDzowcxzprCd24ynNBjz5NP1kcpGoFbHdRLZo69ZvwdcsjNGSxEyDyCpgqe2Z1ihL8Ysy8Z9KA6wJmBUjEmTYdNNMur8mxgmapoq6'
            }
        ],
        authentication: [
            'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key'
        ],
        assertionMethod: ['#did-root-key', '#did-root-key-bbs']
    },

    /** Same endpoint — invalid `type` on a verification method (e.g. not Ed25519VerificationKey2018). */
    PROFILE_DID_DOCUMENT_VALIDATE_REQUEST_INVALID: {
        id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
        '@context': 'https://www.w3.org/ns/did/v1',
        verificationMethod: [
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
                type: 'noType',
                controller:
                    'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                publicKeyBase58: '2vKLgbwo1DoxTebvSzmz1mk1H4tJTX3FaUt4RUFPCZ6p'
            },
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
                type: 'Bls12381G2Key2020',
                controller:
                    'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                publicKeyBase58:
                    '24LRAHd2Dc7d2qziS9D6hXHFmc5uir2TDzowcxzprCd24ynNBjz5NP1kcpGoFbHdRLZo69ZvwdcsjNGSxEyDyCpgqe2Z1ihL8Ysy8Z9KA6wJmBUjEmTYdNNMur8mxgmapoq6'
            }
        ],
        authentication: [
            'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key'
        ],
        assertionMethod: ['#did-root-key', '#did-root-key-bbs']
    },

    /** `POST /profiles/did-document/validate` — success body (shape matches guardian-service). */
    PROFILE_DID_DOCUMENT_VALIDATE_RESPONSE_VALID: {
        valid: true,
        error: '',
        keys: {
            Ed25519VerificationKey2018: [
                {
                    name: '#did-root-key',
                    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key'
                }
            ],
            Bls12381G2Key2020: [
                {
                    name: '#did-root-key-bbs',
                    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs'
                }
            ]
        }
    },

    /** Same endpoint — `valid: false` when a required method type is missing or invalid. */
    PROFILE_DID_DOCUMENT_VALIDATE_RESPONSE_INVALID: {
        valid: false,
        error: 'Ed25519VerificationKey2018 method not found.',
        keys: {
            Ed25519VerificationKey2018: [],
            Bls12381G2Key2020: [
                {
                    name: '#did-root-key-bbs',
                    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs'
                }
            ]
        }
    },

    /** `POST /profiles/did-keys/validate` — placeholder keys (expect `valid: false`). */
    PROFILE_DID_KEYS_VALIDATE_REQUEST_INVALID: {
        document: PROFILE_DID_DOCUMENT_SAMPLE,
        keys: [
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
                key: '1'
            },
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
                key: '1'
            }
        ]
    },

    /** Same route — real private key material (expect `valid: true`). */
    PROFILE_DID_KEYS_VALIDATE_REQUEST_VALID: {
        document: PROFILE_DID_DOCUMENT_SAMPLE,
        keys: [
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
                key: '4RE1RukTJFzz2JV3ccio6yupN1PEq7JD7hVEsViFDigkgj8ZdUdmjJKsq2evxM9NusXvYcPJA9bu5szma3917Q24'
            },
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
                key: '38Rcnwc8Gw62MQYDjSHVovEuHCgXDq8WmnoxozJyzFHj'
            }
        ]
    },

    /** `POST /profiles/did-keys/validate` — response array when keys are invalid. */
    PROFILE_DID_KEYS_VALIDATE_RESPONSE_INVALID: [
        {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
            key: '1',
            valid: false
        },
        {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
            key: '1',
            valid: false
        }
    ],

    /** Same endpoint — response array when keys validate. */
    PROFILE_DID_KEYS_VALIDATE_RESPONSE_VALID: [
        {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
            key: '4RE1RukTJFzz2JV3ccio6yupN1PEq7JD7hVEsViFDigkgj8ZdUdmjJKsq2evxM9NusXvYcPJA9bu5szma3917Q24',
            valid: true
        },
        {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
            key: '38Rcnwc8Gw62MQYDjSHVovEuHCgXDq8WmnoxozJyzFHj',
            valid: true
        }
    ],

    /** Request body for `PUT /profiles/restore/{username}` — topic + Hedera keys; `didDocument` may be null. */
    PROFILE_PUT_RESTORE_USERNAME_REQUEST: {
        topicId: '0.0.8310503',
        hederaAccountId: '0.0.6057669',
        hederaAccountKey:
            '302e020100300506032b657004220420efb6030ba3c022d16b6828a7cf826c88b1578bcf9d69fbcc4a548f5292b6068f',
        didDocument: null,
        didKeys: []
    },

    /** Same route with full `didDocument` and `didKeys`. */
    PROFILE_PUT_RESTORE_USERNAME_REQUEST_WITH_DID: {
        topicId: '0.0.7813042',
        hederaAccountId: '0.0.6057669',
        hederaAccountKey:
            '302e020100300506032b657004220420efb6030ba3c022d16b6828a7cf826c88b1578bcf9d69fbcc4a548f5292b6068f',
        didDocument: {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
            '@context': 'https://www.w3.org/ns/did/v1',
            verificationMethod: [
                {
                    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
                    type: 'Ed25519VerificationKey2018',
                    controller:
                        'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                    publicKeyBase58: '2vKLgbwo1DoxTebvSzmz1mk1H4tJTX3FaUt4RUFPCZ6p'
                },
                {
                    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
                    type: 'Bls12381G2Key2020',
                    controller:
                        'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                    publicKeyBase58:
                        '24LRAHd2Dc7d2qziS9D6hXHFmc5uir2TDzowcxzprCd24ynNBjz5NP1kcpGoFbHdRLZo69ZvwdcsjNGSxEyDyCpgqe2Z1ihL8Ysy8Z9KA6wJmBUjEmTYdNNMur8mxgmapoq6'
                }
            ],
            authentication: [
                'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key'
            ],
            assertionMethod: ['#did-root-key', '#did-root-key-bbs']
        },
        didKeys: [
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
                key: '4RE1RukTJFzz2JV3ccio6yupN1PEq7JD7hVEsViFDigkgj8ZdUdmjJKsq2evxM9NusXvYcPJA9bu5szma3917Q24'
            },
            {
                id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
                key: '38Rcnwc8Gw62MQYDjSHVovEuHCgXDq8WmnoxozJyzFHj'
            }
        ]
    },

    /** `202 Accepted` from `PUT /profiles/restore/{username}` (`TaskAction.RESTORE_USER_PROFILE`, expectation 2). */
    PROFILE_PUT_RESTORE_USERNAME_ACCEPTED_TASK: {
        taskId: 'de64235b-939b-47e5-99ed-2dbf7c4a3e61',
        expectation: 2,
        action: 'Restore user profile',
        userId: '69c3a5b08c0ae8a3b1083e95'
    },

    /** Request body for `PUT /profiles/restore/topics/{username}` (Hedera credentials; `didDocument` may be null). */
    PROFILE_RESTORE_TOPICS_REQUEST: {
        hederaAccountId: '0.0.6057669',
        hederaAccountKey:
            '302e020100300506032b657004220420efb6030ba3c022d16b6828a7cf826c88b1578bcf9d69fbcc4a548f5292b6068f',
        didDocument: null
    },

    /** Same route with a full `didDocument` (Hedera DID + verification methods). */
    PROFILE_RESTORE_TOPICS_REQUEST_WITH_DID: {
        hederaAccountId: '0.0.6057669',
        hederaAccountKey:
            '302e020100300506032b657004220420efb6030ba3c022d16b6828a7cf826c88b1578bcf9d69fbcc4a548f5292b6068f',
        didDocument: {
            id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
            '@context': 'https://www.w3.org/ns/did/v1',
            verificationMethod: [
                {
                    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key',
                    type: 'Ed25519VerificationKey2018',
                    controller:
                        'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                    publicKeyBase58: '2vKLgbwo1DoxTebvSzmz1mk1H4tJTX3FaUt4RUFPCZ6p'
                },
                {
                    id: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key-bbs',
                    type: 'Bls12381G2Key2020',
                    controller:
                        'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
                    publicKeyBase58:
                        '24LRAHd2Dc7d2qziS9D6hXHFmc5uir2TDzowcxzprCd24ynNBjz5NP1kcpGoFbHdRLZo69ZvwdcsjNGSxEyDyCpgqe2Z1ihL8Ysy8Z9KA6wJmBUjEmTYdNNMur8mxgmapoq6'
                }
            ],
            authentication: [
                'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734#did-root-key'
            ],
            assertionMethod: ['#did-root-key', '#did-root-key-bbs']
        }
    },

    /** `202 Accepted` from `PUT /profiles/restore/topics/{username}` (`TaskAction.GET_USER_TOPICS`, expectation 2). */
    PROFILE_RESTORE_TOPICS_ACCEPTED_TASK: {
        taskId: 'b34f028a-16b5-4f5e-a75f-17c3da89bb7d',
        expectation: 2,
        action: 'Get user topics',
        userId: '69c3a5b08c0ae8a3b1083e95'
    },

    /** `202 Accepted` body from `PUT /profiles/push/{username}` (`TaskAction.CONNECT_USER`, expectation 9). */
    PROFILE_ASYNC_PUT_ACCEPTED_TASK: {
        taskId: '415e6c71-7fc5-4c67-a40d-918ed0202bd4',
        expectation: 9,
        action: 'Connect user',
        userId: '69c2cfc621d39e7b6d15e23f'
    },

    /**
     * `POST /profiles/keys` — only `messageId`: server generates a policy signing key (generate path).
     * Flow: pass `messageId` + returned `key` out of band to the **remote user**; they call import with both fields.
     */
    PROFILE_POST_KEYS_REQUEST_MESSAGE_ONLY: {
        messageId: '1769689879.382295507'
    },

    /** `POST /profiles/keys` — import on **remote user** account: same `messageId` plus DER private `key` received out of band. */
    PROFILE_POST_KEYS_REQUEST_IMPORT: {
        messageId: '1769689879.382295507',
        key: '302e020100300506032b6570042204200c05a906fc9f560901032fd8781d49811a82eb855baa6143f8bdb5976d0f9273'
    },

    /**
     * `POST /profiles/keys` success body. Documented id is `id`; runtime may also expose internal fields.
     */
    PROFILE_POST_KEYS_RESPONSE: {
        createDate: '2026-03-25T07:53:00.554Z',
        updateDate: '2026-03-25T07:53:00.554Z',
        messageId: '1769689879.382295507',
        owner: 'did:hedera:testnet:BftZd6RVk1D5yXC64g25b9TmhAvNLwki271mWgDAu7yW_0.0.8361161',
        id: '69c3945c462c9c1141de2e06',
        key: '302e020100300506032b6570042204201f7147c259331152b8f8b4772029af8cfe60385db3c5a1c1cdb8dc9bd6810a6a'
    },

    /** `GET /profiles/keys` response body (array). `policyName` / `policyVersion` may be added when resolvable. */
    PROFILE_GET_KEYS_RESPONSE_LIST: [
        {
            createDate: '2026-03-25T08:38:23.528Z',
            updateDate: '2026-03-25T08:38:23.528Z',
            messageId: '1774427068.001165000',
            owner: 'did:hedera:testnet:BftZd6RVk1D5yXC64g25b9TmhAvNLwki271mWgDAu7yW_0.0.8361161',
            policyName: 'CDM AMS-III.AR Policy',
            id: '69c39eff462c9c1141de2f7d'
        },
        {
            createDate: '2026-03-25T08:38:15.920Z',
            updateDate: '2026-03-25T08:38:15.920Z',
            messageId: '1774427841.463316056',
            owner: 'did:hedera:testnet:BftZd6RVk1D5yXC64g25b9TmhAvNLwki271mWgDAu7yW_0.0.8361161',
            policyName: 'CDM AMS-II.J Policy',
            id: '69c39ef7462c9c1141de2f7c'
        }
    ],

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
            id: '69b7cdefa48bb15eb7afb3e3'
        }
    ],

    VC_DOCUMENT_1: {
        createDate: '2026-03-13T09:26:55.610Z',
        updateDate: '2026-03-13T09:27:09.653Z',
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
        id: '69b3d85f0b1c848021821bf2'
    },

    VC_DOCUMENT_2: {
        createDate: '2026-03-13T13:34:33.856Z',
        updateDate: '2026-03-13T13:34:47.849Z',
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

    /** POST /modules — typical SR UI create body */
    MODULE_POST_CREATE_REQUEST: {
        name: 'New Module',
        description: 'New module description',
        menu: 'show',
        config: {
            blockType: 'module'
        }
    },

    /** POST /modules — created module after `updateModuleConfig` defaults */
    MODULE_POST_CREATE_RESPONSE: {
        createDate: '2026-03-25T12:04:14.291Z',
        updateDate: '2026-03-25T12:04:14.291Z',
        uuid: 'f0624944-02f0-4329-8cae-e871c1984bf4',
        name: 'New Module',
        description: 'New module description',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
        owner: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
        codeVersion: '1.0.0',
        type: 'CUSTOM',
        config: {
            blockType: 'module',
            permissions: [],
            children: [],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        },
        id: '69c3cf3e462c9c1141de3052'
    },

    MODULE_PUT_UPDATE_REQUEST: {
        createDate: '2026-03-25T14:29:09.327Z',
        uuid: 'f964f762-4e77-4f09-b98e-c1f12961ff17',
        name: 'UPDATED NAME',
        description: 'UPDATED DESCRIPTION',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        type: 'CUSTOM',
        config: {
            name: 'UPDATED NAME',
            description: 'UPDATED DESCRIPTION',
            blockType: 'module',
            permissions: [],
            id: '738b9162-a25c-43b9-a609-490a10af3bd6',
            tag: 'Module',
            children: [
                {
                    id: '90debdfe-1f45-4704-8641-a957aef87f77',
                    blockType: 'interfaceContainerBlock',
                    defaultActive: true,
                    permissions: [],
                    onErrorAction: 'no-action',
                    uiMetaData: {
                        type: 'blank',
                        title: 'UPDATED TITLE'
                    },
                    tag: 'Module:UPDATED_BLOCK_NAME',
                    children: [],
                    events: [],
                    artifacts: []
                }
            ],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        },
        id: '69c3f135ae73da728c8d8f57'
    },

    MODULE_PUT_UPDATE_RESPONSE: {
        createDate: '2026-03-25T14:29:09.327Z',
        updateDate: '2026-03-25T14:33:42.812Z',
        uuid: 'f964f762-4e77-4f09-b98e-c1f12961ff17',
        name: 'UPDATED NAME',
        description: 'UPDATED DESCRIPTION',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        codeVersion: '1.0.0',
        type: 'CUSTOM',
        config: {
            name: 'UPDATED NAME',
            description: 'UPDATED DESCRIPTION',
            blockType: 'module',
            permissions: [],
            id: '738b9162-a25c-43b9-a609-490a10af3bd6',
            tag: 'Module',
            children: [
                {
                    id: '90debdfe-1f45-4704-8641-a957aef87f77',
                    blockType: 'interfaceContainerBlock',
                    defaultActive: true,
                    permissions: [],
                    onErrorAction: 'no-action',
                    uiMetaData: {
                        type: 'blank',
                        title: 'UPDATED TITLE'
                    },
                    tag: 'Module:UPDATED_BLOCK_NAME',
                    children: [],
                    events: [],
                    artifacts: []
                }
            ],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        },
        id: '69c3f135ae73da728c8d8f57'
    },

    MODULE_IMPORT_FILE_PREVIEW_RESPONSE: {
        module: {
            updateDate: '2026-03-25T12:22:27.680Z',
            name: 'Device configuration module',
            description: 'Part of devices flow',
            creator: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
            owner: 'did:hedera:testnet:AGGRsWENUUAqhusdGrfX6R5TuEU8MU56XDyorH2MKZyY_0.0.3578734',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            config: {}
        },
        tags: [],
        schemas: []
    },

    MODULE_IMPORT_MESSAGE_REQUEST: {
        messageId: '1774456966.828228000'
    },

    MODULE_IMPORT_MESSAGE_PREVIEW_RESPONSE: {
        module: {
            updateDate: '2026-03-25T16:42:26.445Z',
            name: 'Test Module with two blocks',
            description: 'Description for the test module',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            config: {
                name: 'Test Module with two blocks',
                description: 'Description for the test module',
                blockType: 'module',
                permissions: [],
                id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
                tag: 'Module',
                children: [
                    {
                        id: '4242c579-891b-437d-8cef-61696c2baf2a',
                        blockType: 'interfaceContainerBlock',
                        defaultActive: true,
                        permissions: [],
                        onErrorAction: 'no-action',
                        uiMetaData: {
                            type: 'blank',
                            title: 'Main page'
                        },
                        tag: 'Module:Main_container_block',
                        children: [
                            {
                                id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                                blockType: 'interfaceContainerBlock',
                                defaultActive: true,
                                permissions: [],
                                onErrorAction: 'no-action',
                                uiMetaData: {
                                    type: 'blank',
                                    title: 'Child page'
                                },
                                tag: 'Module:Child_container_block',
                                children: [],
                                events: [],
                                artifacts: []
                            }
                        ],
                        events: [],
                        artifacts: []
                    }
                ],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            }
        },
        tags: [],
        schemas: [],
        messageId: '1774456966.828228000',
        moduleTopicId: '0.0.8373989'
    },

    MODULE_IMPORT_MESSAGE_RESPONSE: {
        createDate: '2026-03-25T16:48:48.711Z',
        updateDate: '2026-03-25T16:48:48.711Z',
        uuid: 'fd51a3a7-ad99-4699-8de8-0c0ccb300aab',
        name: 'Test Module with two blocks',
        description: 'Description for the test module',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        codeVersion: '1.0.0',
        type: 'CUSTOM',
        config: {
            name: 'Test Module with two blocks',
            description: 'Description for the test module',
            blockType: 'module',
            permissions: [],
            id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
            tag: 'Module',
            children: [
                {
                    id: '4242c579-891b-437d-8cef-61696c2baf2a',
                    blockType: 'interfaceContainerBlock',
                    defaultActive: true,
                    permissions: [],
                    onErrorAction: 'no-action',
                    uiMetaData: {
                        type: 'blank',
                        title: 'Main page'
                    },
                    tag: 'Module:Main_container_block',
                    children: [
                        {
                            id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                            blockType: 'interfaceContainerBlock',
                            defaultActive: true,
                            permissions: [],
                            onErrorAction: 'no-action',
                            uiMetaData: {
                                type: 'blank',
                                title: 'Child page'
                            },
                            tag: 'Module:Child_container_block',
                            children: [],
                            events: [],
                            artifacts: []
                        }
                    ],
                    events: [],
                    artifacts: []
                }
            ],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        },
        id: '69c411f0ae73da728c8d8f99'
    },

    MODULE_VALIDATE_REQUEST_VALID: {
        id: '69c411f0ae73da728c8d8f99',
        uuid: 'fd51a3a7-ad99-4699-8de8-0c0ccb300aab',
        name: 'Test Module with two blocks',
        description: 'Description for the test module',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        codeVersion: '1.0.0',
        createDate: '2026-03-25T16:48:48.711Z',
        config: {
            name: 'Test Module with two blocks',
            description: 'Description for the test module',
            blockType: 'module',
            permissions: [],
            id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
            tag: 'Module',
            children: [
                {
                    id: '4242c579-891b-437d-8cef-61696c2baf2a',
                    blockType: 'interfaceContainerBlock',
                    defaultActive: true,
                    permissions: [],
                    onErrorAction: 'no-action',
                    uiMetaData: {
                        type: 'blank',
                        title: 'Main page'
                    },
                    tag: 'Module:Main_container_block',
                    children: [
                        {
                            id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                            blockType: 'interfaceContainerBlock',
                            defaultActive: true,
                            permissions: [],
                            onErrorAction: 'no-action',
                            uiMetaData: {
                                type: 'blank',
                                title: 'Child page'
                            },
                            tag: 'Module:Child_container_block',
                            children: [],
                            events: [],
                            artifacts: []
                        }
                    ],
                    events: [],
                    artifacts: []
                }
            ],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        }
    },

    MODULE_VALIDATE_REQUEST_INVALID: {
        id: '69c411f0ae73da728c8d8f99',
        uuid: 'fd51a3a7-ad99-4699-8de8-0c0ccb300aab',
        name: 'Test Module with two blocks',
        description: 'Description for the test module',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        codeVersion: '1.0.0',
        createDate: '2026-03-25T16:48:48.711Z',
        config: {
            name: 'Test Module with two blocks',
            description: 'Description for the test module',
            blockType: 'module',
            permissions: [],
            id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
            tag: 'Module',
            children: [
                {
                    id: '4242c579-891b-437d-8cef-61696c2baf2a',
                    blockType: 'interfaceContainerBlock',
                    defaultActive: true,
                    permissions: [],
                    onErrorAction: 'no-action',
                    uiMetaData: {
                        type: 'blank',
                        title: 'Main page'
                    },
                    tag: 'Module:Main_container_block',
                    children: [
                        {
                            id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                            blockType: 'interfaceContainerBlock',
                            defaultActive: true,
                            permissions: [],
                            onErrorAction: 'no-action',
                            uiMetaData: {
                                type: 'blank',
                                title: 'Child page'
                            },
                            tag: 'Module:Child_container_block',
                            children: [],
                            events: [],
                            artifacts: []
                        }
                    ],
                    events: [],
                    artifacts: []
                },
                {
                    id: '4237578f-1057-4aa6-bdac-4d8e11b3be30',
                    blockType: 'createTokenBlock',
                    defaultActive: true,
                    permissions: [],
                    tag: 'Block_1',
                    children: [],
                    events: [],
                    artifacts: []
                }
            ],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        }
    },

    MODULE_VALIDATE_RESPONSE_VALID: {
        results: {
            errors: [],
            blocks: [
                {
                    id: '4242c579-891b-437d-8cef-61696c2baf2a',
                    name: 'interfaceContainerBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                    name: 'interfaceContainerBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                }
            ],
            tools: [],
            id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
            isValid: true
        },
        module: {
            id: '69c411f0ae73da728c8d8f99',
            uuid: 'fd51a3a7-ad99-4699-8de8-0c0ccb300aab',
            name: 'Test Module with two blocks',
            description: 'Description for the test module',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            codeVersion: '1.0.0',
            createDate: '2026-03-25T16:48:48.711Z',
            config: {
                name: 'Test Module with two blocks',
                description: 'Description for the test module',
                blockType: 'module',
                permissions: [],
                id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
                tag: 'Module',
                children: [
                    {
                        id: '4242c579-891b-437d-8cef-61696c2baf2a',
                        blockType: 'interfaceContainerBlock',
                        defaultActive: true,
                        permissions: [],
                        onErrorAction: 'no-action',
                        uiMetaData: {
                            type: 'blank',
                            title: 'Main page'
                        },
                        tag: 'Module:Main_container_block',
                        children: [
                            {
                                id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                                blockType: 'interfaceContainerBlock',
                                defaultActive: true,
                                permissions: [],
                                onErrorAction: 'no-action',
                                uiMetaData: {
                                    type: 'blank',
                                    title: 'Child page'
                                },
                                tag: 'Module:Child_container_block',
                                children: [],
                                events: [],
                                artifacts: []
                            }
                        ],
                        events: [],
                        artifacts: []
                    }
                ],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            }
        }
    },

    MODULE_VALIDATE_RESPONSE_INVALID: {
        results: {
            errors: [],
            blocks: [
                {
                    id: '4242c579-891b-437d-8cef-61696c2baf2a',
                    name: 'interfaceContainerBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                    name: 'interfaceContainerBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '4237578f-1057-4aa6-bdac-4d8e11b3be30',
                    name: 'createTokenBlock',
                    errors: [
                        'Template can not be empty',
                        'Token "undefined" does not exist'
                    ],
                    warnings: [],
                    infos: [],
                    isValid: false
                },
                {
                    id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
                    name: 'module',
                    errors: [
                        'Module is invalid'
                    ],
                    isValid: false
                }
            ],
            tools: [],
            id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
            isValid: false
        },
        module: {
            id: '69c411f0ae73da728c8d8f99',
            uuid: 'fd51a3a7-ad99-4699-8de8-0c0ccb300aab',
            name: 'Test Module with two blocks',
            description: 'Description for the test module',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            codeVersion: '1.0.0',
            createDate: '2026-03-25T16:48:48.711Z',
            config: {
                name: 'Test Module with two blocks',
                description: 'Description for the test module',
                blockType: 'module',
                permissions: [],
                id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
                tag: 'Module',
                children: [
                    {
                        id: '4242c579-891b-437d-8cef-61696c2baf2a',
                        blockType: 'interfaceContainerBlock',
                        defaultActive: true,
                        permissions: [],
                        onErrorAction: 'no-action',
                        uiMetaData: {
                            type: 'blank',
                            title: 'Main page'
                        },
                        tag: 'Module:Main_container_block',
                        children: [
                            {
                                id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                                blockType: 'interfaceContainerBlock',
                                defaultActive: true,
                                permissions: [],
                                onErrorAction: 'no-action',
                                uiMetaData: {
                                    type: 'blank',
                                    title: 'Child page'
                                },
                                tag: 'Module:Child_container_block',
                                children: [],
                                events: [],
                                artifacts: []
                            }
                        ],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '4237578f-1057-4aa6-bdac-4d8e11b3be30',
                        blockType: 'createTokenBlock',
                        defaultActive: true,
                        permissions: [],
                        tag: 'Block_1',
                        children: [],
                        events: [],
                        artifacts: []
                    }
                ],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            }
        }
    },

    MODULE_PUBLISH_RESPONSE: {
        module: {
            createDate: '2026-03-25T17:11:30.244Z',
            updateDate: '2026-03-25T17:12:17.150Z',
            uuid: '8310f001-8fdc-43bb-8ad0-bcd43ca17363',
            name: 'Test Module with two blocks',
            description: 'Description for the test module',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8375153',
            messageId: '1774458729.161736000',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            contentFileId: '69c4175cae73da728c8d8fad',
            config: {
                name: 'Test Module with two blocks',
                description: 'Description for the test module',
                blockType: 'module',
                permissions: [],
                id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
                tag: 'Module',
                children: [
                    {
                        id: '4242c579-891b-437d-8cef-61696c2baf2a',
                        blockType: 'interfaceContainerBlock',
                        defaultActive: true,
                        permissions: [],
                        onErrorAction: 'no-action',
                        uiMetaData: {
                            type: 'blank',
                            title: 'Main page'
                        },
                        tag: 'Module:Main_container_block',
                        children: [
                            {
                                id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                                blockType: 'interfaceContainerBlock',
                                defaultActive: true,
                                permissions: [],
                                onErrorAction: 'no-action',
                                uiMetaData: {
                                    type: 'blank',
                                    title: 'Child page'
                                },
                                tag: 'Module:Child_container_block',
                                children: [],
                                events: [],
                                artifacts: []
                            }
                        ],
                        events: [],
                        artifacts: []
                    }
                ],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            },
            id: '69c41742ae73da728c8d8fa6'
        },
        isValid: true,
        errors: {
            errors: [],
            blocks: [
                {
                    id: '4242c579-891b-437d-8cef-61696c2baf2a',
                    name: 'interfaceContainerBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: 'e851686a-9cd6-4fb0-b3da-3a9e33c54af9',
                    name: 'interfaceContainerBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                }
            ],
            tools: [],
            id: 'cd87187f-26aa-4dfb-994f-12ad810dc952',
            isValid: true
        }
    },

    MODULE_IMPORT_FILE_RESPONSE: {
        createDate: '2026-03-25T16:34:31.456Z',
        updateDate: '2026-03-25T16:34:31.456Z',
        uuid: '70f318e1-d505-4b7b-ac9c-9184839f0072',
        name: 'Device configuration module',
        description: 'Part of devices flow',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
        codeVersion: '1.0.0',
        type: 'CUSTOM',
        config: {
            name: 'Device configuration module',
            description: 'Part of devices flow',
            blockType: 'module',
            permissions: [],
            id: '3dc74d7b-eae8-49a5-84d5-c267c1fd8d06',
            tag: 'Module',
            children: [],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        },
        id: '69c40e97ae73da728c8d8f78'
    },

    MODULES_GET_RESPONSE_LIST: [
        {
            createDate: '2026-03-25T12:23:36.763Z',
            updateDate: '2026-03-25T12:24:28.059Z',
            uuid: '2abde099-08f6-4d75-9de3-d6f33d95bc72',
            name: 'New Module',
            description: 'New module description',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8370210',
            messageId: '1774441459.171929000',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            contentFileId: '69c3d3e5462c9c1141de3074',
            config: {
                name: 'New Module',
                description: 'New module description',
                blockType: 'module',
                permissions: [],
                id: '7d25fdf6-8fc4-4d01-b635-541b996415ce',
                tag: 'Module',
                children: [],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            },
            id: '69c3d3c8462c9c1141de3069'
        },
        {
            createDate: '2026-03-25T12:23:29.549Z',
            updateDate: '2026-03-25T12:23:53.759Z',
            uuid: 'e4ecf6f4-36fb-4872-99b8-9b592aac241d',
            name: 'Device configuration module',
            description: 'Part of devices flow',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            config: {
                name: 'Device configuration module',
                description: 'Part of devices flow',
                blockType: 'module',
                permissions: [],
                id: '3dc74d7b-eae8-49a5-84d5-c267c1fd8d06',
                tag: 'Module',
                children: [],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            },
            id: '69c3d3c1462c9c1141de3066'
        }
    ],

    MODULES_MENU_RESPONSE_LIST: [
        {
            createDate: '2026-03-25T12:23:36.763Z',
            updateDate: '2026-03-25T12:24:28.059Z',
            uuid: '2abde099-08f6-4d75-9de3-d6f33d95bc72',
            name: 'New Module',
            description: 'New module description',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8370210',
            messageId: '1774441459.171929000',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            contentFileId: '69c3d3e5462c9c1141de3074',
            config: {
                name: 'New Module',
                description: 'New module description',
                blockType: 'module',
                permissions: [],
                id: '7d25fdf6-8fc4-4d01-b635-541b996415ce',
                tag: 'Module',
                children: [],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            },
            id: '69c3d3c8462c9c1141de3069'
        },
        {
            createDate: '2026-03-25T12:23:29.549Z',
            updateDate: '2026-03-25T12:23:53.759Z',
            uuid: 'e4ecf6f4-36fb-4872-99b8-9b592aac241d',
            name: 'Device configuration module',
            description: 'Part of devices flow',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            codeVersion: '1.0.0',
            type: 'CUSTOM',
            config: {
                name: 'Device configuration module',
                description: 'Part of devices flow',
                blockType: 'module',
                permissions: [],
                id: '3dc74d7b-eae8-49a5-84d5-c267c1fd8d06',
                tag: 'Module',
                children: [],
                events: [],
                artifacts: [],
                variables: [],
                inputEvents: [],
                outputEvents: [],
                innerEvents: []
            },
            id: '69c3d3c1462c9c1141de3066'
        }
    ],

    MODULE_SCHEMAS_GET_RESPONSE_LIST: [
        {
            createDate: '2026-03-25T12:40:32.586Z',
            updateDate: '2026-03-25T12:40:59.908Z',
            uuid: 'b71c8b0e-b4aa-4d0b-ab63-639e306c02ea',
            name: 'Module schema 3',
            description: '',
            entity: 'VC',
            status: 'PUBLISHED',
            version: '3',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8370319',
            messageId: '1774442456.657381000',
            documentURL: 'ipfs://bafkreifyyqurrnlxnhblm57qobo2ecv4wjm3o7i3axgscls3ydjn3fefaq',
            contextURL: 'ipfs://bafkreid6crdhdtk3mtusl4mqcrjlsan6o7eanyetko3k5nwykcvezndepy',
            iri: '#b71c8b0e-b4aa-4d0b-ab63-639e306c02ea&3',
            readonly: false,
            system: false,
            active: false,
            category: 'MODULE',
            codeVersion: '1.2.0',
            document: 'innerSchemaConfigurationInText',
            context: 'jsonLdContextInText',
            topicCount: 1,
            id: '69c3d7b9462c9c1141de309b'
        },
        {
            createDate: '2026-03-25T12:29:13.470Z',
            updateDate: '2026-03-25T12:29:13.470Z',
            uuid: '5ff2b3dd-1ea0-44c1-a84d-7c68c0d55184',
            name: 'Module schema 2',
            description: '',
            entity: 'NONE',
            status: 'DRAFT',
            version: '1.0.1',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8370227',
            documentURL: '',
            contextURL: 'schema:5ff2b3dd-1ea0-44c1-a84d-7c68c0d55184',
            iri: '#5ff2b3dd-1ea0-44c1-a84d-7c68c0d55184&1.0.1',
            readonly: false,
            system: false,
            active: false,
            category: 'MODULE',
            codeVersion: '1.2.0',
            document: 'innerSchemaConfigurationInText',
            topicCount: 1,
            id: '69c3d513462c9c1141de3091'
        },
        {
            createDate: '2026-03-25T12:28:37.997Z',
            updateDate: '2026-03-25T12:28:37.997Z',
            uuid: 'de840307-57f4-423b-9216-fb6f0e1f788e',
            name: 'Module schema 1',
            description: '',
            entity: 'VC',
            status: 'DRAFT',
            version: '1.0.1',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8370224',
            documentURL: '',
            contextURL: 'schema:de840307-57f4-423b-9216-fb6f0e1f788e',
            iri: '#de840307-57f4-423b-9216-fb6f0e1f788e&1.0.1',
            readonly: false,
            system: false,
            active: false,
            category: 'MODULE',
            codeVersion: '1.2.0',
            document: 'innerSchemaConfigurationInText',
            topicCount: 1,
            id: '69c3d4ef462c9c1141de3087'
        }
    ],

    MODULE_SCHEMAS_POST_REQUEST: {
        uuid: 'd26a7a31-00ba-4c30-1314-3d9eecfd7eda',
        hash: '',
        name: 'Module schema example',
        description: '',
        entity: 'NONE',
        status: 'DRAFT',
        readonly: false,
        document: {
            $id: '#d26a7a31-00ba-4c30-1314-3d9eecfd7eda',
            $comment: '{ "@id": "schema:d26a7a31-00ba-4c30-1314-3d9eecfd7eda#d26a7a31-00ba-4c30-1314-3d9eecfd7eda", "term": "d26a7a31-00ba-4c30-1314-3d9eecfd7eda" }',
            title: 'Module schema example',
            description: '',
            type: 'object',
            properties: {
                '@context': {
                    oneOf: [
                        { type: 'string' },
                        {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    ],
                    readOnly: true
                },
                type: {
                    oneOf: [
                        { type: 'string' },
                        {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    ],
                    readOnly: true
                },
                id: {
                    type: 'string',
                    readOnly: true
                },
                field0: {
                    title: 'field0',
                    description: 'qweqwe',
                    readOnly: false,
                    type: 'string',
                    $comment: '{"term":"field0","@id":"https://www.schema.org/text","availableOptions":[],"orderPosition":0}'
                }
            },
            required: ['@context', 'type'],
            additionalProperties: false,
            $defs: {}
        },
        context: null,
        version: '',
        sourceVersion: '',
        creator: '',
        owner: '',
        messageId: '',
        documentURL: '',
        contextURL: 'schema:d26a7a31-00ba-4c30-1314-3d9eecfd7eda',
        iri: '',
        fields: [],
        conditions: [],
        active: false,
        system: false,
        category: 'MODULE',
        errors: [],
        userDID: null,
        codeVersion: ''
    },

    MODULE_SCHEMAS_POST_RESPONSE_LIST: [
        {
            createDate: '2026-03-25T13:43:28.481Z',
            updateDate: '2026-03-25T13:43:28.481Z',
            uuid: 'd26a7a31-00ba-4c30-1314-3d9eecfd7eda',
            name: 'Module schema example',
            description: '',
            entity: 'NONE',
            status: 'DRAFT',
            version: '1.0.1',
            sourceVersion: '',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8371271',
            messageId: null,
            documentURL: '',
            contextURL: 'schema:d26a7a31-00ba-4c30-1314-3d9eecfd7eda',
            iri: '#d26a7a31-00ba-4c30-1314-3d9eecfd7eda&1.0.1',
            readonly: false,
            system: false,
            active: false,
            category: 'MODULE',
            codeVersion: '1.2.0',
            document: 'innerSchemaConfigurationInText',
            id: '69c3e679ae73da728c8d8eaf'
        }
    ],

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
    COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI: CsvExamples.COMPARE_DOCUMENTS_EXPORT_CSV_RESPONSE_MULTI,

    LOG_FILTER_REQUEST: {
        type: 'WARN',
        startDate: '2026-03-19T12:56:24.000Z',
        endDate: '2026-03-21T12:56:24.000Z',
        attributes: [
            'a3be3319-3558-4b69-bb69-de6e107dcf01',
            'txid: 0.0.6046379@1774020526.908989078; payer sigs: 1; total sigs: 1; message size: 600; memo size: 31; '
        ],
        message: 'TRANSACTION',
        pageSize: 10,
        pageIndex: 0,
        sortDirection: 'desc'
    },

    LOG_ATTRIBUTES_RESPONSE: [
        '12142637-892d-4b1f-a046-eedff9e2a793',
        '2026-03-20T08:26:37.248Z',
        '2026-03-20T08:32:37.371Z',
        'a3be3319-3558-4b69-bb69-de6e107dcf01',
        'txid: 0.0.6046379@1774017194.587930740; payer sigs: 1; admin keys: 1; KYC keys: 1; wipe keys: 1; pause keys: 0; supply keys: 1; freeze keys: 1; token name size: 2; token symbol size: 2; token memo size: 11; memo size: 0; ',
        'txid: 0.0.6046379@1774020526.908989078; payer sigs: 1; total sigs: 1; message size: 600; memo size: 31; '
    ],

    LOG_RESULT_RESPONSE: {
        totalCount: 1,
        logs: [
            {
                message: 'TopicMessageSubmitTransaction',
                type: 'INFO',
                datetime: '2026-03-20T15:28:53.883Z',
                attributes: [
                    'TRANSACTION',
                    'COMPLETION',
                    '2026-03-20T15:28:53.883Z',
                    '_',
                    'TopicMessageSubmitTransaction',
                    '9c409646-6de6-4e0a-a5b8-5010de7ded08',
                    '0.0.6046379',
                    'testnet',
                    'txid: 0.0.6046379@1774020526.908989078; payer sigs: 1; total sigs: 1; message size: 600; memo size: 31; '
                ],
                userId: null,
                id: '69bd67b53090533214e731f1'
            }
        ]
    },

    /**
     * Request body for POST /tools and POST /tools/push (create tool).
     * Only config with blockType: "tool" is required. Other fields are optional.
     */
    TOOL_CREATE_REQUEST: {
        name: 'Test Tool New',
        description: 'This is test description',
        config: {
            id: '47c1f826-88ef-46a0-b3b7-e9038108f97c',
            blockType: 'tool'
        }
    },

    /**
     * Request body for PUT /tools/:id — original (current) tool state.
     */
    TOOL_UPDATE_REQUEST: {
        name: 'Updated Tool Name',
        description: 'Updated Tool Description',
        config: {
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            blockType: 'tool',
            permissions: [],
            tag: 'Tool',
            children: [],
            events: [],
            variables: [],
            inputEvents: [],
            outputEvents: []
        }
    },

    /**
     * Response for PUT /tools/:id (updated tool).
     */
    TOOL_UPDATE_RESPONSE: {
        id: '69c168d8fb66de861cc9dda8',
        createDate: '2026-03-23T16:22:48.808Z',
        updateDate: '2026-03-23T18:35:33.333Z',
        uuid: '56af783a-eddc-4969-a6a7-894694f0a3c0',
        name: 'Updated Tool Name',
        description: 'Updated Tool Description',
        configFileId: '69c187f5fb66de861cc9de5a',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        topicId: '0.0.8346214',
        codeVersion: '1.5.1',
        tools: [],
        config: {
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            blockType: 'tool',
            permissions: [],
            tag: 'Tool',
            children: [],
            events: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            artifacts: [],
            innerEvents: []
        }
    },

    /**
     * Response for PUT /tools/:id/publish (sync publish).
     */
    TOOL_PUBLISH_RESPONSE: {
        tool: {
            createDate: '2026-03-24T07:32:07.366Z',
            updateDate: '2026-03-24T07:53:40.891Z',
            hash: '62zo1ujESm1SehDeQoUK4o7um73qiwqf7fQ8YNan1NGE',
            uuid: '01188757-acb8-42f3-af19-700ba073b66f',
            name: 'Tool 06_1774337527363',
            description: '',
            version: '1.0.0',
            configFileId: '69c243047a442bf5c32d604f',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            topicId: '0.0.8356129',
            messageId: '1774338819.468936917',
            codeVersion: '1.5.1',
            tagsTopicId: '0.0.8356229',
            tools: [],
            contentFileId: '69c242f77a442bf5c32d6047',
            id: '69c23df77a442bf5c32d5ffe',
            config: {
                id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                blockType: 'tool',
                permissions: [],
                tag: 'Tool',
                children: [
                    {
                        id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'get',
                        schema: '#d22a8d47-cfde-468d-b8e7-e87cbaea52f5&1.0.0',
                        tag: 'get_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '52974f49-497d-403b-9616-829da32590fe',
                        blockType: 'customLogicBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        uiMetaData: {},
                        expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                        documentSigner: '',
                        idType: 'UUID',
                        outputSchema: '#d22a8d47-cfde-468d-b8e7-e87cbaea52f5&1.0.0',
                        unsigned: true,
                        tag: 'calc_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'set',
                        schema: '#d22a8d47-cfde-468d-b8e7-e87cbaea52f5&1.0.0',
                        tag: 'set_tool_06',
                        children: [],
                        events: [
                            {
                                target: 'Tool',
                                source: 'set_tool_06',
                                input: 'output_tool_06',
                                output: 'RunEvent',
                                actor: '',
                                disabled: false
                            }
                        ],
                        artifacts: []
                    }
                ],
                events: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ],
                artifacts: [],
                variables: [
                    {
                        name: 'Role',
                        description: '',
                        type: 'Role'
                    }
                ],
                inputEvents: [
                    {
                        name: 'input_tool_06',
                        description: ''
                    }
                ],
                outputEvents: [
                    {
                        name: 'output_tool_06',
                        description: ''
                    }
                ],
                innerEvents: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ]
            }
        },
        isValid: true,
        errors: {
            errors: [],
            blocks: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    name: 'customLogicBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                }
            ],
            tools: [],
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            isValid: true
        }
    },

    /**
     * PUT /tools/:id/publish — validation failed (HTTP 200): same tool as TOOL_PUBLISH_RESPONSE
     * plus invalid createTokenBlock; publish not applied (DRAFT, no hash/messageId).
     */
    TOOL_PUBLISH_RESPONSE_INVALID: {
        tool: {
            createDate: '2026-03-24T07:32:07.366Z',
            updateDate: '2026-03-24T07:53:40.891Z',
            uuid: '01188757-acb8-42f3-af19-700ba073b66f',
            name: 'Tool 06_1774337527363',
            description: '',
            configFileId: '69c243047a442bf5c32d604f',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            topicId: '0.0.8356129',
            codeVersion: '1.5.1',
            tools: [],
            id: '69c23df77a442bf5c32d5ffe',
            config: {
                id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                blockType: 'tool',
                permissions: [],
                tag: 'Tool',
                children: [
                    {
                        id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'get',
                        schema: '#d22a8d47-cfde-468d-b8e7-e87cbaea52f5&1.0.0',
                        tag: 'get_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '2e2e1d55-853b-4d07-9a68-793ea88d28c9',
                        blockType: 'createTokenBlock',
                        tag: 'Block_1',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '52974f49-497d-403b-9616-829da32590fe',
                        blockType: 'customLogicBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        uiMetaData: {},
                        expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                        documentSigner: '',
                        idType: 'UUID',
                        outputSchema: '#d22a8d47-cfde-468d-b8e7-e87cbaea52f5&1.0.0',
                        unsigned: true,
                        tag: 'calc_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'set',
                        schema: '#d22a8d47-cfde-468d-b8e7-e87cbaea52f5&1.0.0',
                        tag: 'set_tool_06',
                        children: [],
                        events: [
                            {
                                target: 'Tool',
                                source: 'set_tool_06',
                                input: 'output_tool_06',
                                output: 'RunEvent',
                                actor: '',
                                disabled: false
                            }
                        ],
                        artifacts: []
                    }
                ],
                events: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ],
                artifacts: [],
                variables: [
                    {
                        name: 'Role',
                        description: '',
                        type: 'Role'
                    }
                ],
                inputEvents: [
                    {
                        name: 'input_tool_06',
                        description: ''
                    }
                ],
                outputEvents: [
                    {
                        name: 'output_tool_06',
                        description: ''
                    }
                ],
                innerEvents: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ]
            }
        },
        isValid: false,
        errors: {
            errors: [],
            blocks: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '2e2e1d55-853b-4d07-9a68-793ea88d28c9',
                    name: 'createTokenBlock',
                    errors: [
                        'Template can not be empty',
                        'Token "undefined" does not exist'
                    ],
                    warnings: [],
                    infos: [],
                    isValid: false
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    name: 'customLogicBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                    name: 'tool',
                    errors: ['Tool is invalid'],
                    isValid: false
                }
            ],
            tools: [],
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            isValid: false
        }
    },

    /**
     * Response for PUT /tools/:id/push/publish (async publish — task handle).
     */
    TOOL_PUBLISH_ASYNC_TASK_RESPONSE: {
        taskId: '02b66111-15f1-4834-8e31-4227f058efa0',
        expectation: 2,
        action: 'Publish tool',
        userId: '69bcfd90c98df6ceb05e8a78'
    },

    /**
     * Response for POST /tools/push/import/file (async import — task handle).
     */
    TOOL_IMPORT_FILE_ASYNC_TASK_RESPONSE: {
        taskId: '4c4bb402-197a-4682-a5eb-ff52e7542f28',
        expectation: 9,
        action: 'Import tool file',
        userId: '69bcfd90c98df6ceb05e8a78'
    },

    /**
     * Response for POST /tools/push/import/message (async import by message — task handle).
     */
    TOOL_IMPORT_MESSAGE_ASYNC_TASK_RESPONSE: {
        taskId: '4c4bb402-197a-4682-a5eb-ff52e7542f28',
        expectation: 11,
        action: 'Import tool message',
        userId: '69bcfd90c98df6ceb05e8a78'
    },

    /**
     * Response for POST /tools/push/import/file-metadata (async import by file with metadata — task handle).
     */
    TOOL_IMPORT_FILE_METADATA_ASYNC_TASK_RESPONSE: {
        taskId: 'e2869118-935c-4f13-bbed-e7868b058606',
        expectation: 9,
        action: 'Import tool file',
        userId: '69b806bbd51470fcd6ea9ba3'
    },

    /**
     * Response for GET /tools/menu/all.
     */
    TOOL_MENU_ALL_RESPONSE: [
        {
            hash: '81PmVismGTVZGSStCGGcAuAqXi3V6JJzu8MKoHT7djQz',
            name: 'Tool 07_modified',
            description: '',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            topicId: '0.0.8360425',
            messageId: '1774367941.594676930',
            tools: [],
            config: {
                inputEvents: [
                    {
                        name: 'input_tool_07',
                        description: ''
                    }
                ],
                outputEvents: [
                    {
                        name: 'output_tool_07',
                        description: ''
                    }
                ],
                variables: [
                    {
                        name: 'Role',
                        description: '',
                        type: 'Role'
                    }
                ]
            },
            schemas: [
                {
                    id: '69c2b4947a442bf5c32d6c8c',
                    name: 'Tool 07',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#31f4f114-95e6-4d3a-b0c0-8888b2ea11f7&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6c91',
                    name: 'Build Margin',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#012635cb-a876-4041-b8fe-2b5297cc86c6&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6c96',
                    name: 'Fuel Type',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#e6f79971-c19a-4317-be13-e39410f72773&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6c9b',
                    name: 'Average OM (Option A1)',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#dfdd825f-7c91-45c2-9a43-12d21da69022&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6ca0',
                    name: 'Average OM (Option A2)',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#3758fbe8-b3c2-4dac-aefd-57ddfe02e718&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6ca5',
                    name: 'Average OM (Option A3)',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#14dae990-fa84-4b98-8e11-f62c0a1a8a24&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6caa',
                    name: '(Average OM, Simple Adj OM) Power units serving the grid in specified year',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#c6e1b179-7c88-4260-9afa-1d3b4be46a3d&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6caf',
                    name: 'Calculation based on average efficiency and electricity  generation of each plant',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#41f1e5ad-8398-47ed-826e-118a8b6d4b47&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6cb4',
                    name: 'Calculation based on total fuel consumption and electricity  generation of the system',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#c47928b5-4cef-405f-85a6-461b5d899bdb&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6cb9',
                    name: 'Average OM, Simple OM',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#267aabfe-573c-4027-b93f-f627428d2d5e&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6cbe',
                    name: 'Dispatch Data OM',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#ec4d478c-5b67-4f96-9467-af8aaba9e382&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6cc3',
                    name: 'Lambda Approach 2',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#7cb46d6d-86e2-4c3c-b7a2-98ad30e0b031&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6cc8',
                    name: 'Lambda Approach 1',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#63fa3154-e12d-4809-ab4e-d5f4e4a42b47&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6ccd',
                    name: 'Simple Adj OM',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#76ee38e8-cfcb-4d87-b5aa-69e3f83ef661&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6cd2',
                    name: 'Do you have annual aggregated data from the grid on power generation, fuel type and fuel consumption?',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#6039ed67-a1ff-49dd-af60-ae9f89898128&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4947a442bf5c32d6cd7',
                    name: 'Is the LASL more than one third of the HASL?',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#63f27fe2-b840-40a7-b9c9-7405497aed7f&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6cdc',
                    name: 'Are hourly loads of the grid in MW available?',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#d59ab516-2731-44f0-a7bd-7a0c8678acc3&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6ce1',
                    name: 'Is the average load by LCMR less than the average LASL over three years?',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#8f354fab-04f8-470a-8872-d19645a22120&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6ce6',
                    name: 'Is LCMR share less than 50% in recent 5 years?',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#c8c2f95b-e95c-4375-8c84-7dcbca057ccc&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6ceb',
                    name: 'Combined Margin',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#99e9128b-daab-4c58-ab10-bc025ee5de5a&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6cf0',
                    name: 'Weighted average CM',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#36c4dde5-2940-4d44-9203-0f8b64a7abc9&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6cf5',
                    name: 'Simplified CM',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#3e3e976d-bfb7-42d7-b4e7-bf77cbfebe02&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6cfa',
                    name: 'Simplified CM for Isolated Grid System',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#18b5b956-0e33-40e9-b7d6-f91c0b3b96da&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6cff',
                    name: 'For multiple power plants, choose the option that best fits your project',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#4e9cf1f2-0de5-4f1a-b670-7902cb6d0fe0&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6d04',
                    name: 'Power Unit',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#29b50d9d-5bae-424c-b5ea-628e9da9b2a7&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2b4957a442bf5c32d6d09',
                    name: 'Combined Margin. Is grid located in LDC/SIDs/URC or an isolated system.',
                    description: '',
                    topicId: '0.0.8360425',
                    iri: '#26f3d4d2-f2a4-45c9-9706-9be055ddafc3&1.0.0',
                    category: 'POLICY'
                }
            ],
            id: '69c2d0af34d008dac2664405'
        },
        {
            hash: 'HPD7E8x2xyqDAXeMaRc9uAG4nMArdxuYSFYVKg9W18x8',
            name: 'Tool 05',
            description: '',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8361161',
            topicId: '0.0.8361167',
            messageId: '1774375293.192012846',
            tools: [
                {
                    name: 'Tool 07_modified',
                    version: '7',
                    topicId: '0.0.8360425',
                    messageId: '1774367941.594676930'
                }
            ],
            config: {
                inputEvents: [
                    {
                        name: 'input_tool_05',
                        description: ''
                    }
                ],
                outputEvents: [
                    {
                        name: 'output_tool_05',
                        description: ''
                    }
                ],
                variables: [
                    {
                        name: 'Role',
                        description: '',
                        type: 'Role'
                    }
                ]
            },
            schemas: [
                {
                    id: '69c2d0b134d008dac266448c',
                    name: 'Tool 05',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#b2c91711-693c-4fd8-aed8-68ff83c0ded6&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2d0b134d008dac2664491',
                    name: 'Tool 05 Scenario C',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#86d9d01e-979b-4a38-b860-857d1f26cf9b&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2d0b134d008dac2664496',
                    name: 'Tool 05 Scenario B | Generic Approach',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#ab7d5541-fdca-4375-bb40-582f0168b745&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2d0b134d008dac266449b',
                    name: 'Tool 05 Power Plants',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#9d4ea98d-981d-4dbf-857f-90f480e2497f&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2d0b134d008dac26644a0',
                    name: 'Tool 05 Scenario A',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#1371798f-a1c2-41d7-b660-13383741f8de&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2d0b134d008dac26644a5',
                    name: 'Tool 05 Scenario A | Default Value',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#0fcf8e8a-4f24-4c46-948c-76f57e5c548a&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2d0b134d008dac26644aa',
                    name: 'Tool 05 Scenario B',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#2a7c2925-6956-4cf6-b3fb-66593bdc496b&1.0.0',
                    category: 'POLICY'
                },
                {
                    id: '69c2d0b134d008dac26644af',
                    name: 'Generic Approach',
                    description: '',
                    topicId: '0.0.8361167',
                    iri: '#88920b11-f2c3-45d4-b762-a487076aeb35&1.0.0',
                    category: 'POLICY'
                }
            ],
            id: '69c2d0b134d008dac26644b4'
        }
    ],

    /**
     * Response for PUT /tools/:id/dry-run (validation result; same shape as guardian-service MessageResponse).
     */
    TOOL_DRY_RUN_RESPONSE: {
        isValid: true,
        errors: {
            errors: [],
            blocks: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    name: 'customLogicBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                }
            ],
            tools: [],
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            isValid: true
        }
    },

    /**
     * PUT /tools/:id/dry-run — validation failed (HTTP 200, isValid false; dry run not started).
     */
    TOOL_DRY_RUN_RESPONSE_VALIDATION_FAILED: {
        isValid: false,
        errors: {
            errors: [],
            blocks: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '8a317e5a-b462-4334-a6ea-263ca527f39a',
                    name: 'createTokenBlock',
                    errors: [
                        'Template can not be empty',
                        'Token "undefined" does not exist'
                    ],
                    warnings: [],
                    infos: [],
                    isValid: false
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    name: 'customLogicBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                    name: 'tool',
                    errors: ['Tool is invalid'],
                    isValid: false
                }
            ],
            tools: [],
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            isValid: false
        }
    },

    /**
     * POST /tools/validate — request body (valid tool).
     */
    TOOL_VALIDATE_REQUEST_VALID: {
        id: '69c245a07a442bf5c32d60a9',
        uuid: 'b03154fa-6c33-4b3a-ba14-6a24df47f5ec',
        name: 'Tool 06_1774339488650',
        description: '',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        topicId: '0.0.8356269',
        messageId: null,
        codeVersion: '1.5.1',
        createDate: '2026-03-24T08:04:48.653Z',
        version: null,
        config: {
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            blockType: 'tool',
            permissions: [],
            tag: 'Tool',
            children: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'get',
                    schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                    tag: 'get_tool_06',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    blockType: 'customLogicBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    uiMetaData: {},
                    expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                    documentSigner: '',
                    idType: 'UUID',
                    outputSchema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                    unsigned: true,
                    tag: 'calc_tool_06',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'set',
                    schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                    tag: 'set_tool_06',
                    children: [],
                    events: [
                        {
                            target: 'Tool',
                            source: 'set_tool_06',
                            input: 'output_tool_06',
                            output: 'RunEvent',
                            actor: '',
                            disabled: false
                        }
                    ],
                    artifacts: []
                }
            ],
            events: [
                {
                    target: 'get_tool_06',
                    source: 'Tool',
                    input: 'RunEvent',
                    output: 'input_tool_06',
                    actor: '',
                    disabled: false
                }
            ],
            artifacts: [],
            variables: [
                {
                    name: 'Role',
                    description: '',
                    type: 'Role'
                }
            ],
            inputEvents: [
                {
                    name: 'input_tool_06',
                    description: ''
                }
            ],
            outputEvents: [
                {
                    name: 'output_tool_06',
                    description: ''
                }
            ],
            innerEvents: [
                {
                    target: 'get_tool_06',
                    source: 'Tool',
                    input: 'RunEvent',
                    output: 'input_tool_06',
                    actor: '',
                    disabled: false
                }
            ]
        }
    },

    /**
     * POST /tools/validate — request body (invalid: createTokenBlock).
     */
    TOOL_VALIDATE_REQUEST_INVALID: {
        id: '69c245a07a442bf5c32d60a9',
        uuid: 'b03154fa-6c33-4b3a-ba14-6a24df47f5ec',
        name: 'Tool 06_1774339488650',
        description: '',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        topicId: '0.0.8356269',
        messageId: null,
        codeVersion: '1.5.1',
        createDate: '2026-03-24T08:04:48.653Z',
        version: null,
        config: {
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            blockType: 'tool',
            permissions: [],
            tag: 'Tool',
            children: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'get',
                    schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                    tag: 'get_tool_06',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '68a86a37-e1b9-4c93-8892-624645bfd467',
                    blockType: 'createTokenBlock',
                    defaultActive: true,
                    permissions: [],
                    tag: 'Block_1',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    blockType: 'customLogicBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    uiMetaData: {},
                    expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                    documentSigner: '',
                    idType: 'UUID',
                    outputSchema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                    unsigned: true,
                    tag: 'calc_tool_06',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'set',
                    schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                    tag: 'set_tool_06',
                    children: [],
                    events: [
                        {
                            target: 'Tool',
                            source: 'set_tool_06',
                            input: 'output_tool_06',
                            output: 'RunEvent',
                            actor: '',
                            disabled: false
                        }
                    ],
                    artifacts: []
                }
            ],
            events: [
                {
                    target: 'get_tool_06',
                    source: 'Tool',
                    input: 'RunEvent',
                    output: 'input_tool_06',
                    actor: '',
                    disabled: false
                }
            ],
            artifacts: [],
            variables: [
                {
                    name: 'Role',
                    description: '',
                    type: 'Role'
                }
            ],
            inputEvents: [
                {
                    name: 'input_tool_06',
                    description: ''
                }
            ],
            outputEvents: [
                {
                    name: 'output_tool_06',
                    description: ''
                }
            ],
            innerEvents: [
                {
                    target: 'get_tool_06',
                    source: 'Tool',
                    input: 'RunEvent',
                    output: 'input_tool_06',
                    actor: '',
                    disabled: false
                }
            ]
        }
    },

    /**
     * POST /tools/validate — HTTP 200 (validation passed).
     */
    TOOL_VALIDATE_RESPONSE_VALID: {
        results: {
            errors: [],
            blocks: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    name: 'customLogicBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                }
            ],
            tools: [],
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            isValid: true
        },
        tool: {
            id: '69c245a07a442bf5c32d60a9',
            uuid: 'b03154fa-6c33-4b3a-ba14-6a24df47f5ec',
            name: 'Tool 06_1774339488650',
            description: '',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            topicId: '0.0.8356269',
            messageId: null,
            codeVersion: '1.5.1',
            createDate: '2026-03-24T08:04:48.653Z',
            version: null,
            config: {
                id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                blockType: 'tool',
                permissions: [],
                tag: 'Tool',
                children: [
                    {
                        id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'get',
                        schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                        tag: 'get_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '52974f49-497d-403b-9616-829da32590fe',
                        blockType: 'customLogicBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        uiMetaData: {},
                        expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                        documentSigner: '',
                        idType: 'UUID',
                        outputSchema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                        unsigned: true,
                        tag: 'calc_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'set',
                        schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                        tag: 'set_tool_06',
                        children: [],
                        events: [
                            {
                                target: 'Tool',
                                source: 'set_tool_06',
                                input: 'output_tool_06',
                                output: 'RunEvent',
                                actor: '',
                                disabled: false
                            }
                        ],
                        artifacts: []
                    }
                ],
                events: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ],
                artifacts: [],
                variables: [
                    {
                        name: 'Role',
                        description: '',
                        type: 'Role'
                    }
                ],
                inputEvents: [
                    {
                        name: 'input_tool_06',
                        description: ''
                    }
                ],
                outputEvents: [
                    {
                        name: 'output_tool_06',
                        description: ''
                    }
                ],
                innerEvents: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ]
            }
        }
    },

    /**
     * POST /tools/validate — HTTP 200 (validation failed).
     */
    TOOL_VALIDATE_RESPONSE_INVALID: {
        results: {
            errors: [],
            blocks: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '68a86a37-e1b9-4c93-8892-624645bfd467',
                    name: 'createTokenBlock',
                    errors: ['Template can not be empty', 'Token "undefined" does not exist'],
                    warnings: [],
                    infos: [],
                    isValid: false
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    name: 'customLogicBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    name: 'extractDataBlock',
                    errors: [],
                    warnings: [],
                    infos: [],
                    isValid: true
                },
                {
                    id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                    name: 'tool',
                    errors: ['Tool is invalid'],
                    isValid: false
                }
            ],
            tools: [],
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            isValid: false
        },
        tool: {
            id: '69c245a07a442bf5c32d60a9',
            uuid: 'b03154fa-6c33-4b3a-ba14-6a24df47f5ec',
            name: 'Tool 06_1774339488650',
            description: '',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            topicId: '0.0.8356269',
            messageId: null,
            codeVersion: '1.5.1',
            createDate: '2026-03-24T08:04:48.653Z',
            version: null,
            config: {
                id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                blockType: 'tool',
                permissions: [],
                tag: 'Tool',
                children: [
                    {
                        id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'get',
                        schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                        tag: 'get_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '68a86a37-e1b9-4c93-8892-624645bfd467',
                        blockType: 'createTokenBlock',
                        defaultActive: true,
                        permissions: [],
                        tag: 'Block_1',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '52974f49-497d-403b-9616-829da32590fe',
                        blockType: 'customLogicBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        uiMetaData: {},
                        expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                        documentSigner: '',
                        idType: 'UUID',
                        outputSchema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                        unsigned: true,
                        tag: 'calc_tool_06',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'set',
                        schema: '#1bdad0d4-90ab-49cd-88d7-253d6b2d4ff9',
                        tag: 'set_tool_06',
                        children: [],
                        events: [
                            {
                                target: 'Tool',
                                source: 'set_tool_06',
                                input: 'output_tool_06',
                                output: 'RunEvent',
                                actor: '',
                                disabled: false
                            }
                        ],
                        artifacts: []
                    }
                ],
                events: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ],
                artifacts: [],
                variables: [
                    {
                        name: 'Role',
                        description: '',
                        type: 'Role'
                    }
                ],
                inputEvents: [
                    {
                        name: 'input_tool_06',
                        description: ''
                    }
                ],
                outputEvents: [
                    {
                        name: 'output_tool_06',
                        description: ''
                    }
                ],
                innerEvents: [
                    {
                        target: 'get_tool_06',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_06',
                        actor: '',
                        disabled: false
                    }
                ]
            }
        }
    },

    /**
     * GET /tools/:id/export/message — published tool (messageId set).
     */
    TOOL_EXPORT_MESSAGE_RESPONSE_PUBLISHED: {
        id: '69c1502ffb66de861cc9dcef',
        uuid: '7d56aec4-5db3-46d3-9f3f-236fc33e0772',
        name: 'Tool 16',
        description: '',
        messageId: '1720000738.873798003',
        owner: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265'
    },

    /**
     * GET /tools/:id/export/message — DRAFT / dry-run (no Hedera message yet).
     */
    TOOL_EXPORT_MESSAGE_RESPONSE_DRAFT: {
        id: '69c245a07a442bf5c32d60a9',
        uuid: 'b03154fa-6c33-4b3a-ba14-6a24df47f5ec',
        name: 'Tool 06_1774339488650',
        description: '',
        messageId: null,
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835'
    },

    /**
     * POST /tools/import/message/preview — parsed ZIP + message ids (see guardian `preparePreviewMessage`).
     * `schemas` items include full metadata; `document` / `context` are `{}` in the example; `tool` may omit DB fields.
     */
    TOOL_IMPORT_MESSAGE_PREVIEW_RESPONSE: {
        tool: {
            name: 'Tool 33',
            description: '',
            creator: 'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
            owner: 'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
            codeVersion: '1.5.1',
            tagsTopicId: '0.0.4865958',
            tools: [],
            config: {
                id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                blockType: 'tool',
                permissions: [],
                tag: 'Tool',
                children: [
                    {
                        id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'get',
                        schema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        tag: 'get_tool_33',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '52974f49-497d-403b-9616-829da32590fe',
                        blockType: 'customLogicBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        uiMetaData: {},
                        expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                        documentSigner: '',
                        idType: 'UUID',
                        outputSchema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        unsigned: true,
                        tag: 'calc_tool_33',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'set',
                        schema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        tag: 'set_tool_33',
                        children: [],
                        events: [
                            {
                                target: 'Tool',
                                source: 'set_tool_33',
                                input: 'output_tool_33',
                                output: 'RunEvent',
                                actor: '',
                                disabled: false
                            }
                        ],
                        artifacts: []
                    }
                ],
                events: [
                    {
                        target: 'get_tool_33',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_33',
                        actor: '',
                        disabled: false
                    }
                ],
                artifacts: [],
                variables: [{ name: 'Role', description: '', type: 'Role' }],
                inputEvents: [{ name: 'input_tool_33', description: '' }],
                outputEvents: [{ name: 'output_tool_33', description: '' }],
                innerEvents: [
                    {
                        target: 'get_tool_33',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_33',
                        actor: '',
                        disabled: false
                    }
                ]
            }
        },
        tags: [],
        schemas: [
            {
                id: '66e9b98854cf4ebe299cb399',
                createDate: '2024-09-17T17:17:00.224Z',
                updateDate: '2024-09-17T17:18:28.695Z',
                uuid: '073bdaf5-68d1-4bfd-9290-2c4f40a98034',
                hash: '',
                name: 'Tool 33',
                description: '',
                entity: 'VC',
                documentFileId: '66e9b9e454cf4ebe299cb3c9',
                contextFileId: '66e9b9e454cf4ebe299cb3cb',
                version: '1.0.0',
                sourceVersion: '',
                creator:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                owner:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                topicId: '0.0.4865949',
                messageId: '1726593505.353812000',
                documentURL: 'ipfs://bafkreiflnxkizsxsmtyiraojvykwj7s4y3i3twsytelw6egboutawr7xta',
                contextURL: 'ipfs://bafkreic4mekxeq3p5es7bacfdswkae3rxlmka5hirtlnxmr63ukdn7l6ki',
                iri: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                system: false,
                active: false,
                category: 'TOOL',
                codeVersion: '1.1.0',
                defs: ['#64d676db-cd55-41f7-87ed-71d8e7a582dc&1.0.0'],
                errors: [],
                document: {},
                context: {}
            },
            {
                id: '66e9b98c54cf4ebe299cb3a2',
                createDate: '2024-09-17T17:17:03.328Z',
                updateDate: '2024-09-17T17:18:21.063Z',
                uuid: '64d676db-cd55-41f7-87ed-71d8e7a582dc',
                hash: '',
                name: 'Tool 33. Carbon dioxide emission factor for diesel generating system used for offgrid power generation purposes | Carbon dioxide emission factor for kerosene used for lighting applications',
                description: '',
                entity: 'VC',
                documentFileId: '66e9b9dd54cf4ebe299cb3bb',
                contextFileId: '66e9b9dd54cf4ebe299cb3bd',
                version: '1.0.0',
                sourceVersion: '',
                creator:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                owner:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                topicId: '0.0.4865949',
                messageId: '1726593498.351403305',
                documentURL: 'ipfs://bafkreifkfy6ft5bpoudp2oruy5zfwicfycrikcx473vgm7tm7kau6x4raq',
                contextURL: 'ipfs://bafkreifxxqtc4nku6x5y7bu2przweee2flnbhskij35igfhc2xnb5fwutq',
                iri: '#64d676db-cd55-41f7-87ed-71d8e7a582dc&1.0.0',
                system: false,
                active: false,
                category: 'TOOL',
                codeVersion: '1.1.0',
                defs: [],
                errors: [],
                document: {},
                context: {}
            }
        ],
        tools: [],
        messageId: '1726593517.484578000',
        toolTopicId: '0.0.4865949'
    },

    /**
     * POST /tools/import/file/preview — parsed ZIP without Hedera message fields.
     * Same structure as message preview, but no top-level `messageId` / `toolTopicId`.
     */
    TOOL_IMPORT_FILE_PREVIEW_RESPONSE: {
        tool: {
            name: 'Tool 33',
            description: '',
            creator: 'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
            owner: 'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
            codeVersion: '1.5.1',
            tagsTopicId: '0.0.4865958',
            tools: [],
            config: {
                id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                blockType: 'tool',
                permissions: [],
                tag: 'Tool',
                children: [
                    {
                        id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'get',
                        schema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        tag: 'get_tool_33',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '52974f49-497d-403b-9616-829da32590fe',
                        blockType: 'customLogicBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        uiMetaData: {},
                        expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                        documentSigner: '',
                        idType: 'UUID',
                        outputSchema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        unsigned: true,
                        tag: 'calc_tool_33',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'set',
                        schema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        tag: 'set_tool_33',
                        children: [],
                        events: [
                            {
                                target: 'Tool',
                                source: 'set_tool_33',
                                input: 'output_tool_33',
                                output: 'RunEvent',
                                actor: '',
                                disabled: false
                            }
                        ],
                        artifacts: []
                    }
                ],
                events: [
                    {
                        target: 'get_tool_33',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_33',
                        actor: '',
                        disabled: false
                    }
                ],
                artifacts: [],
                variables: [{ name: 'Role', description: '', type: 'Role' }],
                inputEvents: [{ name: 'input_tool_33', description: '' }],
                outputEvents: [{ name: 'output_tool_33', description: '' }],
                innerEvents: [
                    {
                        target: 'get_tool_33',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_33',
                        actor: '',
                        disabled: false
                    }
                ]
            }
        },
        tags: [],
        schemas: [
            {
                id: '66e9b98854cf4ebe299cb399',
                createDate: '2024-09-17T17:17:00.224Z',
                updateDate: '2024-09-17T17:18:28.695Z',
                uuid: '073bdaf5-68d1-4bfd-9290-2c4f40a98034',
                hash: '',
                name: 'Tool 33',
                description: '',
                entity: 'VC',
                documentFileId: '66e9b9e454cf4ebe299cb3c9',
                contextFileId: '66e9b9e454cf4ebe299cb3cb',
                version: '1.0.0',
                sourceVersion: '',
                creator:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                owner:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                topicId: '0.0.4865949',
                messageId: '1726593505.353812000',
                documentURL: 'ipfs://bafkreiflnxkizsxsmtyiraojvykwj7s4y3i3twsytelw6egboutawr7xta',
                contextURL: 'ipfs://bafkreic4mekxeq3p5es7bacfdswkae3rxlmka5hirtlnxmr63ukdn7l6ki',
                iri: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                system: false,
                active: false,
                category: 'TOOL',
                codeVersion: '1.1.0',
                defs: ['#64d676db-cd55-41f7-87ed-71d8e7a582dc&1.0.0'],
                errors: [],
                document: {},
                context: {}
            },
            {
                id: '66e9b98c54cf4ebe299cb3a2',
                createDate: '2024-09-17T17:17:03.328Z',
                updateDate: '2024-09-17T17:18:21.063Z',
                uuid: '64d676db-cd55-41f7-87ed-71d8e7a582dc',
                hash: '',
                name: 'Tool 33. Carbon dioxide emission factor for diesel generating system used for offgrid power generation purposes | Carbon dioxide emission factor for kerosene used for lighting applications',
                description: '',
                entity: 'VC',
                documentFileId: '66e9b9dd54cf4ebe299cb3bb',
                contextFileId: '66e9b9dd54cf4ebe299cb3bd',
                version: '1.0.0',
                sourceVersion: '',
                creator:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                owner:
                    'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
                topicId: '0.0.4865949',
                messageId: '1726593498.351403305',
                documentURL: 'ipfs://bafkreifkfy6ft5bpoudp2oruy5zfwicfycrikcx473vgm7tm7kau6x4raq',
                contextURL: 'ipfs://bafkreifxxqtc4nku6x5y7bu2przweee2flnbhskij35igfhc2xnb5fwutq',
                iri: '#64d676db-cd55-41f7-87ed-71d8e7a582dc&1.0.0',
                system: false,
                active: false,
                category: 'TOOL',
                codeVersion: '1.1.0',
                defs: [],
                errors: [],
                document: {},
                context: {}
            }
        ],
        tools: []
    },

    /**
     * POST /tools/import/message — imported tool result.
     * Matches runtime response shape `{ tool, errors }`; `expression` is shortened.
     */
    TOOL_IMPORT_MESSAGE_RESPONSE: {
        tool: {
            createDate: '2026-03-24T13:31:34.959Z',
            updateDate: '2026-03-24T13:31:34.959Z',
            hash: 'Ceo5z8VkMbYWAcgjhesqGXHzJ9Z6aEdEEGWA4Jq4XE2i',
            uuid: '8772ca4b-4efe-4517-93ae-6c63a4281257',
            name: 'Tool 33',
            description: '',
            configFileId: '69c292367a442bf5c32d6157',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
            owner: 'did:hedera:testnet:5h54ixs4SfsNJwPxtpdMcd2M1V4ddK8aRYCh44nnWxfv_0.0.4674597',
            topicId: '0.0.4865949',
            messageId: '1726593517.484578000',
            codeVersion: '1.5.1',
            tagsTopicId: '0.0.4865958',
            tools: [],
            contentFileId: '69c292367a442bf5c32d6154',
            id: '69c292367a442bf5c32d6156',
            config: {
                id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
                blockType: 'tool',
                permissions: [],
                tag: 'Tool',
                children: [
                    {
                        id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'get',
                        schema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        tag: 'get_tool_33',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '52974f49-497d-403b-9616-829da32590fe',
                        blockType: 'customLogicBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        uiMetaData: {},
                        expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                        documentSigner: '',
                        idType: 'UUID',
                        outputSchema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        unsigned: true,
                        tag: 'calc_tool_33',
                        children: [],
                        events: [],
                        artifacts: []
                    },
                    {
                        id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                        blockType: 'extractDataBlock',
                        defaultActive: false,
                        permissions: ['Role'],
                        onErrorAction: 'no-action',
                        action: 'set',
                        schema: '#073bdaf5-68d1-4bfd-9290-2c4f40a98034&1.0.0',
                        tag: 'set_tool_33',
                        children: [],
                        events: [
                            {
                                target: 'Tool',
                                source: 'set_tool_33',
                                input: 'output_tool_33',
                                output: 'RunEvent',
                                actor: '',
                                disabled: false
                            }
                        ],
                        artifacts: []
                    }
                ],
                events: [
                    {
                        target: 'get_tool_33',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_33',
                        actor: '',
                        disabled: false
                    }
                ],
                artifacts: [],
                variables: [{ name: 'Role', description: '', type: 'Role' }],
                inputEvents: [{ name: 'input_tool_33', description: '' }],
                outputEvents: [{ name: 'output_tool_33', description: '' }],
                innerEvents: [
                    {
                        target: 'get_tool_33',
                        source: 'Tool',
                        input: 'RunEvent',
                        output: 'input_tool_33',
                        actor: '',
                        disabled: false
                    }
                ]
            }
        },
        errors: []
    },

    /**
     * POST /tools/import/file — imported local ZIP as DRAFT tool.
     * Matches ToolDTO shape; runtime Mongo `_id` is intentionally omitted from docs.
     */
    TOOL_IMPORT_FILE_RESPONSE: {
        createDate: '2026-03-24T13:53:21.329Z',
        updateDate: '2026-03-24T13:53:21.329Z',
        uuid: '6ae44173-e280-406b-bb64-5588bc539be3',
        name: 'Tool 33_1774360401319',
        description: '',
        configFileId: '69c297517a442bf5c32d617f',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        topicId: '0.0.8359424',
        codeVersion: '1.5.1',
        tools: [],
        id: '69c297517a442bf5c32d617e',
        config: {
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            blockType: 'tool',
            permissions: [],
            tag: 'Tool',
            children: [
                {
                    id: 'b7984eab-893a-497f-ba73-3e6d4c0b7ce0',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'get',
                    schema: '#02527932-b2ba-4f0d-be2a-563a8ab21889',
                    tag: 'get_tool_33',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    blockType: 'customLogicBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    uiMetaData: {},
                    expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                    documentSigner: '',
                    idType: 'UUID',
                    outputSchema: '#02527932-b2ba-4f0d-be2a-563a8ab21889',
                    unsigned: true,
                    tag: 'calc_tool_33',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '16f57f36-48db-4989-adb1-ddb276fc23f1',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'set',
                    schema: '#02527932-b2ba-4f0d-be2a-563a8ab21889',
                    tag: 'set_tool_33',
                    children: [],
                    events: [
                        {
                            target: 'Tool',
                            source: 'set_tool_33',
                            input: 'output_tool_33',
                            output: 'RunEvent',
                            actor: '',
                            disabled: false
                        }
                    ],
                    artifacts: []
                }
            ],
            events: [
                {
                    target: 'get_tool_33',
                    source: 'Tool',
                    input: 'RunEvent',
                    output: 'input_tool_33',
                    actor: '',
                    disabled: false
                }
            ],
            artifacts: [],
            variables: [{ name: 'Role', description: '', type: 'Role' }],
            inputEvents: [{ name: 'input_tool_33', description: '' }],
            outputEvents: [{ name: 'output_tool_33', description: '' }],
            innerEvents: [
                {
                    target: 'get_tool_33',
                    source: 'Tool',
                    input: 'RunEvent',
                    output: 'input_tool_33',
                    actor: '',
                    disabled: false
                }
            ]
        }
    },

    /**
     * POST /tools/import/file-metadata — imported local *.tool with metadata.
     * Matches ToolDTO shape; runtime Mongo `_id` is intentionally omitted from docs.
     */
    TOOL_IMPORT_FILE_METADATA_RESPONSE: {
        createDate: '2026-03-24T17:11:34.719Z',
        updateDate: '2026-03-24T17:11:34.719Z',
        uuid: '1c04677c-0c6f-4abf-a10b-5f1a34a4efb1',
        name: 'Tool 05',
        description: '',
        configFileId: '69c2c5c693723d9b1b38c359',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8360865',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8360865',
        topicId: '0.0.8360888',
        codeVersion: '1.5.1',
        tools: [],
        id: '69c2c5c693723d9b1b38c358',
        config: {
            id: '8f3c6675-16ee-4680-ab1f-58c0f619ab82',
            blockType: 'tool',
            permissions: [],
            tag: 'Tool',
            children: [
                {
                    id: '816f0414-286d-4d2d-ade1-6ce7768fa171',
                    blockType: 'tool',
                    defaultActive: true,
                    hash: 'FYwXXAw2pumRVekHJbVpVrtqUGPvNGjMnNsrcZ6gagiS',
                    messageId: '1706867530.884259218',
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    Role: 'Role',
                    tag: 'tool_07',
                    children: [],
                    events: [
                        {
                            target: 'get_tool_05',
                            source: 'tool_07',
                            input: 'RunEvent',
                            output: 'output_tool_07',
                            actor: '',
                            disabled: false
                        }
                    ],
                    artifacts: [],
                    variables: [{ name: 'Role', description: '', type: 'Role' }],
                    inputEvents: [{ name: 'input_tool_07', description: '' }],
                    outputEvents: [{ name: 'output_tool_07', description: '' }],
                    innerEvents: []
                },
                {
                    id: '5119c09c-804c-4eea-9b26-7a9eb90a8394',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'get',
                    schema: '#433e11e5-918d-43c1-ad05-063c9ac12d67',
                    tag: 'get_tool_05',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '88cc53c2-83db-4d21-93a8-0e0cdc25ce3b',
                    blockType: 'customLogicBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    uiMetaData: {},
                    expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                    documentSigner: '',
                    idType: 'UUID',
                    outputSchema: '#433e11e5-918d-43c1-ad05-063c9ac12d67',
                    unsigned: true,
                    tag: 'calc_tool_05',
                    children: [],
                    events: [],
                    artifacts: []
                },
                {
                    id: '61fa5298-d71f-41e3-8d6c-df0c94052edf',
                    blockType: 'extractDataBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    action: 'set',
                    schema: '#433e11e5-918d-43c1-ad05-063c9ac12d67',
                    tag: 'set_tool_05',
                    children: [],
                    events: [
                        {
                            target: 'Tool',
                            source: 'set_tool_05',
                            input: 'output_tool_05',
                            output: 'RunEvent',
                            actor: '',
                            disabled: false
                        }
                    ],
                    artifacts: []
                }
            ],
            events: [
                {
                    target: 'tool_07',
                    source: 'Tool',
                    input: 'input_tool_07',
                    output: 'input_tool_05',
                    actor: '',
                    disabled: false
                }
            ],
            artifacts: [],
            variables: [{ name: 'Role', description: '', type: 'Role' }],
            inputEvents: [{ name: 'input_tool_05', description: '' }],
            outputEvents: [{ name: 'output_tool_05', description: '' }],
            innerEvents: [
                {
                    target: 'tool_07',
                    source: 'Tool',
                    input: 'input_tool_07',
                    output: 'input_tool_05',
                    actor: '',
                    disabled: false
                }
            ]
        }
    },

    /**
     * Response for GET /tools/:id (tool by id).
     */
    TOOL_GET_BY_ID_RESPONSE: {
        id: '69c1502ffb66de861cc9dcef',
        createDate: '2026-03-23T14:37:35.376Z',
        updateDate: '2026-03-23T14:37:35.376Z',
        hash: '8j5UAc8s38X2qRaePqzCBj1rMuM9SXwkE3GcfXSJ7SaN',
        uuid: '7d56aec4-5db3-46d3-9f3f-236fc33e0772',
        name: 'Tool 16',
        description: '',
        configFileId: '69c1502ffb66de861cc9dcf0',
        status: 'PUBLISHED',
        creator: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        owner: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        topicId: '0.0.4496134',
        messageId: '1720000738.873798003',
        codeVersion: '1.5.1',
        tagsTopicId: '0.0.4496152',
        contentFileId: '69c1500afb66de861cc9dbca',
        tools: [
            {
                name: 'Tool 01',
                version: null,
                topicId: '0.0.3418896',
                messageId: '1707834520.925981198'
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
        config: {
            id: 'ee7c7a73-96b0-464e-9ad9-13198b0fadf5',
            blockType: 'tool',
            permissions: [],
            tag: 'Tool',
            children: [
                {
                    id: '0988b533-bbe2-4cf9-9f43-c041764e163b',
                    blockType: 'tool',
                    defaultActive: true,
                    hash: 'FE2TVGaYbHkzT5xox71zRGowBh9uz7p1QZEmDd1BZbco',
                    messageId: '1719310223.735760003',
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    tag: 'Tool_14',
                    children: [],
                    events: [
                        {
                            target: 'Tool_1',
                            source: 'Tool_14',
                            input: 'input_tool_01',
                            output: 'output_tool_14',
                            actor: '',
                            disabled: false
                        }
                    ],
                    artifacts: [],
                    variables: [{ name: 'Role', description: '', type: 'Role' }],
                    inputEvents: [{ name: 'input_tool_14', description: '' }],
                    outputEvents: [{ name: 'output_tool_14', description: '' }],
                    innerEvents: []
                },
                {
                    id: '52974f49-497d-403b-9616-829da32590fe',
                    blockType: 'customLogicBlock',
                    defaultActive: false,
                    permissions: ['Role'],
                    onErrorAction: 'no-action',
                    uiMetaData: {},
                    expression: TOOL_EXAMPLE_CUSTOM_LOGIC_EXPRESSION_SHORT,
                    documentSigner: '',
                    idType: 'UUID',
                    outputSchema: '#7e8f0766-996d-4715-b501-3abf55efa3ac&1.0.0',
                    unsigned: true,
                    tag: 'calc_tool_16',
                    children: [],
                    events: [],
                    artifacts: []
                }
            ],
            events: [
                {
                    target: 'Tool_14',
                    source: 'Tool',
                    input: 'input_tool_14',
                    output: 'input_tool_16',
                    actor: '',
                    disabled: false
                }
            ],
            variables: [{ name: 'Role', description: '', type: 'Role' }],
            inputEvents: [{ name: 'input_tool_16', description: '' }],
            outputEvents: [{ name: 'output_tool_16', description: '' }],
            innerEvents: [
                {
                    target: 'Tool_14',
                    source: 'Tool',
                    input: 'input_tool_14',
                    output: 'input_tool_16',
                    actor: '',
                    disabled: false
                }
            ]
        }
    },

    /**
     * Response for POST /tools (sync create).
     */
    TOOL_CREATE_RESPONSE: {
        id: '69c17209fb66de861cc9de3a',
        createDate: '2026-03-23T17:02:01.093Z',
        updateDate: '2026-03-23T17:02:01.093Z',
        uuid: '0e2a0907-18a4-41cf-bd93-dbd5b1ad5f98',
        name: 'Test Tool New',
        description: 'This is test description',
        configFileId: '69c17209fb66de861cc9de3b',
        status: 'DRAFT',
        creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
        topicId: '0.0.8346869',
        codeVersion: '1.5.1',
        tools: [],
        config: {
            id: Examples.UUID,
            blockType: 'tool',
            permissions: [],
            children: [],
            events: [],
            artifacts: [],
            variables: [],
            inputEvents: [],
            outputEvents: [],
            innerEvents: []
        }
    },

    TOOLS_V1_RESPONSE: [
        {
            uuid: '741556b2-ebf9-481b-837d-3cfd13322279',
            name: 'Tool 06_new_edited',
            description: '',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            topicId: '0.0.8345573',
            id: '69c156a4fb66de861cc9dd8a'
        },
        {
            hash: '8j5UAc8s38X2qRaePqzCBj1rMuM9SXwkE3GcfXSJ7SaN',
            uuid: '7d56aec4-5db3-46d3-9f3f-236fc33e0772',
            name: 'Tool 16',
            description: '',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
            owner: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
            topicId: '0.0.4496134',
            messageId: '1720000738.873798003',
            id: '69c1502ffb66de861cc9dcef'
        },
        {
            hash: 'CQZ9E5bEmFwsCQ8vmqsvtXMQfK8hjLAnq5Ryk5Td49BP',
            uuid: '840cda66-9e63-41ce-a779-b6ec3557f798',
            name: 'Tool 06',
            description: '',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:9pZJ9UokYbTyeb7ZWUrLWWLxFmuF3UAcLbjhwge8d3hp_0.0.2172755',
            owner: 'did:hedera:testnet:9pZJ9UokYbTyeb7ZWUrLWWLxFmuF3UAcLbjhwge8d3hp_0.0.2172755',
            topicId: '0.0.2657406',
            messageId: '1707068762.886477003',
            id: '69c1501cfb66de861cc9dc26'
        }
    ],

    TOOLS_V2_RESPONSE: [
        {
            name: 'Tool 06_new_edited',
            description: '',
            status: 'DRAFT',
            creator: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            owner: 'did:hedera:testnet:Cvzp5kKVUuipBCQjcF54fBjdicvaKsB8zHeQ6Qq22U2Z_0.0.8299835',
            topicId: '0.0.8345573',
            id: '69c156a4fb66de861cc9dd8a'
        },
        {
            name: 'Tool 16',
            description: '',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
            owner: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
            topicId: '0.0.4496134',
            messageId: '1720000738.873798003',
            id: '69c1502ffb66de861cc9dcef'
        },
        {
            name: 'Tool 06',
            description: '',
            status: 'PUBLISHED',
            creator: 'did:hedera:testnet:9pZJ9UokYbTyeb7ZWUrLWWLxFmuF3UAcLbjhwge8d3hp_0.0.2172755',
            owner: 'did:hedera:testnet:9pZJ9UokYbTyeb7ZWUrLWWLxFmuF3UAcLbjhwge8d3hp_0.0.2172755',
            topicId: '0.0.2657406',
            messageId: '1707068762.886477003',
            id: '69c1501cfb66de861cc9dc26'
        }
    ]
}

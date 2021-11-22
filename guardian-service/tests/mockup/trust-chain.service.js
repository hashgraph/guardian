'use strict';

module.exports.testObject1 = [
    {
        'type': 'VP',
        'id': '5d46d1fd-75ad-4073-ade7-322d6f31374c',
        'document': {
            'id': '5d46d1fd-75ad-4073-ade7-322d6f31374c',
            'type': [
                'VerifiablePresentation'
            ],
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'verifiableCredential': [
                {
                    '@context': [
                        'https://www.w3.org/2018/credentials/v1'
                    ],
                    'id': '5b6e9587-ea25-440f-85ba-979472e9a2d3',
                    'type': [
                        'VerifiableCredential',
                        'MRV'
                    ],
                    'credentialSubject': [
                        {
                            '@context': [
                                'https://localhost/schema'
                            ],
                            'type': 'MRV',
                            'date': 0,
                            'amount': 1,
                            'period': 0,
                            'policyId': '6169b4533101240013a15fa8',
                            'accountId': '0.0.2859206'
                        }
                    ],
                    'issuer': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
                    'issuanceDate': '2021-10-15T17:05:18.569Z',
                    'proof': {
                        'type': 'Ed25519Signature2018',
                        'created': '2021-10-15T17:05:18Z',
                        'verificationMethod': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201#did-root-key',
                        'proofPurpose': 'assertionMethod',
                        'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..BbZtozBYjbuVAS9nv_V9ZvTe9ZISbECIBmWiaE_vXExl1FzPBoatp161iVNbERscA2_6geYL9VwqkUIau09IDg'
                    }
                },
                {
                    '@context': [
                        'https://www.w3.org/2018/credentials/v1'
                    ],
                    'id': '35b290df-17a9-4f20-8932-bae8bc4cea7a',
                    'type': [
                        'VerifiableCredential',
                        'MintToken'
                    ],
                    'credentialSubject': [
                        {
                            '@context': [
                                'https://localhost/schema'
                            ],
                            'type': 'MintToken',
                            'date': '2021-10-15T17:05:23.097Z',
                            'tokenId': '0.0.2859203',
                            'amount': '100'
                        }
                    ],
                    'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                    'issuanceDate': '2021-10-15T17:05:23.107Z',
                    'proof': {
                        'type': 'Ed25519Signature2018',
                        'created': '2021-10-15T17:05:23Z',
                        'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                        'proofPurpose': 'assertionMethod',
                        'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..MlEZ4v_9NxSIHmBjru3BGY804rzOZgKoHysM4AAuma7Jum1kZcNENakWyPWLwDkya7pfetguwfiMMnWTGmGmDw'
                    }
                }
            ],
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:05:23Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'authentication',
                'challenge': '123',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..dmQamyfZnI1qgTfA7ilxPXA-i6CrOXGAceo4zgeBOO8-78FngyHwZrEhBjbO66y0dZiJqCuoZbJP_zUHhMJYAg'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': 'VerifiablePresentation',
        'label': 'ID',
        'tag': 'mint_token'
    },
    {
        'type': 'VC',
        'id': '4dMTac3e4D8AuqErfZ1UP5ypZaV3oGHTxNyvrFeYLZ7s',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '5b6e9587-ea25-440f-85ba-979472e9a2d3',
            'type': [
                'VerifiableCredential',
                'MRV'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'type': 'MRV',
                    'date': 0,
                    'amount': 1,
                    'period': 0,
                    'policyId': '6169b4533101240013a15fa8',
                    'accountId': '0.0.2859206'
                }
            ],
            'issuer': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
            'issuanceDate': '2021-10-15T17:05:18.569Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:05:18Z',
                'verificationMethod': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..BbZtozBYjbuVAS9nv_V9ZvTe9ZISbECIBmWiaE_vXExl1FzPBoatp161iVNbERscA2_6geYL9VwqkUIau09IDg'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': 'MRV',
        'tag': 'save_mrv_document',
        'label': 'HASH'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
        'document': [
            {
                '_id': {
                    '$oid': '6169b4938c3fb50013b24aab'
                },
                'did': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
                            'publicKeyBase58': 'D2twjJruurR43XCyQEGNPWNjk4DcoqPyCpCfBVpSZ93d'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:04:19.918Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:04:26.959Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': 'HX3Kq4TzixwwMTe5SFTvrYAsAbpaaqtT5VEFJA1upZdt',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': 'c5047748-0000-4f09-b840-52e2bbfe1f56',
            'type': [
                'VerifiableCredential',
                'Inverter'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
                    'type': 'Inverter',
                    'projectId': '1',
                    'projectName': '1',
                    'sensorType': '1',
                    'capacity': '1'
                }
            ],
            'issuer': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
            'issuanceDate': '2021-10-15T17:04:19.993Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:04:20Z',
                'verificationMethod': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..M-jDFgt-8IMflV_X3OCAYXIVapSxZEB20tHihrkhmgVOk4UFGqGbvgB5Mab60ISfjbDsuEL0uPQG_CvnYEqtDA'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': 'Inverter',
        'tag': 'send_sensor_vc_to_guardian',
        'label': 'HASH'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'document': [
            {
                '_id': {
                    '$oid': '6169b46e8c3fb50013b24aa8'
                },
                'did': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                            'publicKeyBase58': 'CoReRVJY82rMwPwnbm25yNGgdU4RviggYSUPFdUryD78'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:03:42.445Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:47.034Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': '6i28MnZRhBjw7gjCn3VFeFtEZ3h6CJcrHPpmybvjsHXB',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '8fd41a06-704f-4563-8a5f-900523045ddb',
            'type': [
                'VerifiableCredential',
                'Installer'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'type': 'Installer',
                    'name': '1'
                }
            ],
            'issuer': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
            'issuanceDate': '2021-10-15T17:03:56.333Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:03:56Z',
                'verificationMethod': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..hHrl8e6tpqCQ-S-MmV-UlBEnflWHvgp1Jl-9qM7GePFW5gjTHsStxkJh3gSNUAca9yIR2Kf_Z-5RfpqNQ9UjBw'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': 'Installer',
        'tag': 'send_installer_vc_to_guardian',
        'label': 'HASH'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'document': [
            {
                '_id': {
                    '$oid': '6169b46e8c3fb50013b24aa8'
                },
                'did': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                            'publicKeyBase58': 'CoReRVJY82rMwPwnbm25yNGgdU4RviggYSUPFdUryD78'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:03:42.445Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:47.034Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': 'EgBAx76vMG8h55voSL1wzZmVveFtyKYm6hv4fcfHeurF',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '34d48ab8-0166-4d59-a43d-f57b79e0c117',
            'type': [
                'VerifiableCredential',
                'Policy'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': '6169b4533101240013a15fa8',
                    'type': 'Policy',
                    'name': 't1',
                    'description': '1',
                    'version': '1',
                    'policyTag': 't1'
                }
            ],
            'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
            'issuanceDate': '2021-10-15T17:03:32.058Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:03:32Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..eLPVOuQuM86_mwVpPHz7zwOgGS4tVi7iAzY98nuJWAsfAGjT5MRg9YbtFzkYcdDfYTYZqBD8_h2hXo1cTa9ABA'
            }
        },
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': 'Policy',
        'label': 'HASH',
        'tag': 'Policy Created'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'document': [
            {
                '_id': {
                    '$oid': '6169b4428c3fb50013b24aa5'
                },
                'did': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                            'publicKeyBase58': '7DE3CVyBywCSVbu6NqFouAPnEyP2PuiQMmN315rTKcxf'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:02:58.440Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:03.245Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': 'FgzByaZNyCTscpTbUuEPMKc6gUW7jqEe9pMwAHnVWsa1',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '4cb4a454-74f5-4b30-853d-524e36174614',
            'type': [
                'VerifiableCredential',
                'RootAuthority'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                    'type': 'RootAuthority',
                    'name': '2'
                }
            ],
            'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
            'issuanceDate': '2021-10-15T17:02:58.075Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:02:58Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..r9CsVgVkY448yyxrXPQ5VlY9Ey9-6FrH9lhd26_dwsn6dak0nVEUuGeCUQqkjt7iaAAOqbKU6Aqw1i7bR-UJCA'
            }
        },
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': 'RootAuthority',
        'label': 'HASH',
        'tag': 'Account Creation'
    }
];

module.exports.testObject2 = [
    {
        'type': 'VP',
        'id': '0123583c-ce26-407e-a079-8b72c2fe435c',
        'document': {
            'id': '0123583c-ce26-407e-a079-8b72c2fe435c',
            'type': [
                'VerifiablePresentation'
            ],
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'verifiableCredential': [
                {
                    '@context': [
                        'https://www.w3.org/2018/credentials/v1'
                    ],
                    'id': '7da2317f-e937-4503-8b80-fc722599055a',
                    'type': [
                        'VerifiableCredential',
                        'MRV'
                    ],
                    'credentialSubject': [
                        {
                            '@context': [
                                'https://localhost/schema'
                            ],
                            'type': 'MRV',
                            'date': 1,
                            'amount': 0,
                            'period': 1,
                            'policyId': '616ddb038aee1e00143ce4fe',
                            'accountId': '0.0.2859206'
                        }
                    ],
                    'issuer': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
                    'issuanceDate': '2021-10-18T20:39:32.503Z',
                    'proof': {
                        'type': 'Ed25519Signature2018',
                        'created': '2021-10-18T20:39:32Z',
                        'verificationMethod': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201#did-root-key',
                        'proofPurpose': 'assertionMethod',
                        'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..N1siAOyMnw14kgRxDJud3qAINsz-iC4XoDvJeKP-DNvKnmT3Az-4kh8gof3yVgrAt7ms6dZEbxul9BeTGE7lAQ'
                    }
                },
                {
                    '@context': [
                        'https://www.w3.org/2018/credentials/v1'
                    ],
                    'id': 'd383eb83-dded-48f5-ac55-20769bd8ab9b',
                    'type': [
                        'VerifiableCredential',
                        'MintNFToken'
                    ],
                    'credentialSubject': [
                        {
                            '@context': [
                                'https://localhost/schema'
                            ],
                            'type': 'MintNFToken',
                            'date': '2021-10-18T20:39:36.941Z',
                            'tokenId': '0.0.2880876',
                            'serials': [
                                3
                            ]
                        }
                    ],
                    'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                    'issuanceDate': '2021-10-18T20:39:36.953Z',
                    'proof': {
                        'type': 'Ed25519Signature2018',
                        'created': '2021-10-18T20:39:36Z',
                        'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                        'proofPurpose': 'assertionMethod',
                        'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..0pyyFWsgB5BRJ169U4m-D8ridsmWuqhLVlMVC5Yv-cvSEJ3v7BBGH5PmPXCB9ZsEfz3WSeSXQIbZ0jtn17OXBg'
                    }
                }
            ],
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-18T20:39:37Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'authentication',
                'challenge': '123',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..USGucibpGjHCAGOUyDUhVbEJpLzmlkBHeXdf5f7g67HzGSCBNqyfHZTMLWhkduG3yXAsPRZeKyNHQFuMqez7Dg'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',        
        'schema': 'VerifiablePresentation',
        'label': 'ID',
        'tag': 'mint_token'
    },
    {
        'type': 'VC',
        'id': 'GEmp3C7uJ16ULLhAWjynFfNm3nm6NMeP3tUHvXMevbbc',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '7da2317f-e937-4503-8b80-fc722599055a',
            'type': [
                'VerifiableCredential',
                'MRV'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'type': 'MRV',
                    'date': 1,
                    'amount': 0,
                    'period': 1,
                    'policyId': '616ddb038aee1e00143ce4fe',
                    'accountId': '0.0.2859206'
                }
            ],
            'issuer': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',    
            'issuanceDate': '2021-10-18T20:39:32.503Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-18T20:39:32Z',
                'verificationMethod': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..N1siAOyMnw14kgRxDJud3qAINsz-iC4XoDvJeKP-DNvKnmT3Az-4kh8gof3yVgrAt7ms6dZEbxul9BeTGE7lAQ'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',        
        'schema': 'MRV',
        'tag': 'save_mrv_document',
        'label': 'HASH'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
        'document': [
            {
                '_id': {
                    '$oid': '616ddb2e2ef2bc00141bbe93'
                },
                'did': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',   
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
                            'publicKeyBase58': '9HfLrkUqt72cPxMaQgicnEu7AAoWP8YsRQ9sABGh7UWh'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-18T20:38:06.940Z'
                },
                'updateDate': {
                    '$date': '2021-10-18T20:38:11.898Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': 'H1kX4Xbp6GtHYqrqJRrLmP4YryWWg2CgZ1DUWQkWBoAD',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': 'e5db7e6d-0aa2-4522-9ad1-7f704b449c49',
            'type': [
                'VerifiableCredential',
                'Inverter'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',                    'type': 'Inverter',
                    'projectId': '1',
                    'projectName': '1',
                    'sensorType': '1',
                    'capacity': '1'
                }
            ],
            'issuer': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',   
            'issuanceDate': '2021-10-18T20:38:07.032Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-18T20:38:07Z',
                'verificationMethod': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..77O3KIuq8ceXwb4bitPffliA8dalnTSQwpHWePdqNyCdifXeSqPdZXKw2Gm6Hsc7752Ggyjgm8FW24XUTF0xAA'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',        
        'schema': 'Inverter',
        'tag': 'send_sensor_vc_to_guardian',
        'label': 'HASH'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'document': [
            {
                '_id': {
                    '$oid': '6169b46e8c3fb50013b24aa8'
                },
                'did': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',  
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                            'publicKeyBase58': 'CoReRVJY82rMwPwnbm25yNGgdU4RviggYSUPFdUryD78'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:03:42.445Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:47.034Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',        
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': '5WHX52McNsMpbiUF2y4wFon5UsQNvgUFr6jmbvDqnkdx',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '7e2cb7c9-380d-484c-9642-16c4f9519f54',
            'type': [
                'VerifiableCredential',
                'Installer'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'type': 'Installer',
                    'name': 'test'
                }
            ],
            'issuer': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',   
            'issuanceDate': '2021-10-18T20:37:43.367Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-18T20:37:43Z',
                'verificationMethod': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..wg5S3rPN3bdXQDzHiyh0OKjIu9eKxBiBvlpL7pCp3d0uDke-popuBrPNZd4YzgR1DaOhy58owr44klKyEbVKDA'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',        
        'schema': 'Installer',
        'tag': 'send_installer_vc_to_guardian',
        'label': 'HASH'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'document': [
            {
                '_id': {
                    '$oid': '6169b46e8c3fb50013b24aa8'
                },
                'did': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',  
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                            'publicKeyBase58': 'CoReRVJY82rMwPwnbm25yNGgdU4RviggYSUPFdUryD78'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:03:42.445Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:47.034Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',        
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': '2BjzHhuPged1JGPTTF5uUM6X3YowRHVddw5JG42YKmoy',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '0a1e3947-03ac-4aba-9478-943f476d721b',
            'type': [
                'VerifiableCredential',
                'Policy'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': '616ddb038aee1e00143ce4fe',
                    'type': 'Policy',
                    'name': 'nft token',
                    'description': '1',
                    'version': '1',
                    'policyTag': 'nft'
                }
            ],
            'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',    
            'issuanceDate': '2021-10-18T20:37:34.496Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-18T20:37:34Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..wHrcbnKqrTzp_xTH_7reeR73MrzaILyvc2T9WzBnxCeGF7pWLvsm7RLeXrjSUjGLD4GtGKtdBwmoaWdvEkv8BA'
            }
        },
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': 'Policy',
        'label': 'HASH',
        'tag': 'Policy Created'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'document': [
            {
                '_id': {
                    '$oid': '6169b4428c3fb50013b24aa5'
                },
                'did': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',   
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                            'publicKeyBase58': '7DE3CVyBywCSVbu6NqFouAPnEyP2PuiQMmN315rTKcxf'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:02:58.440Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:03.245Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': 'FgzByaZNyCTscpTbUuEPMKc6gUW7jqEe9pMwAHnVWsa1',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '4cb4a454-74f5-4b30-853d-524e36174614',
            'type': [
                'VerifiableCredential',
                'RootAuthority'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',                    'type': 'RootAuthority',
                    'name': '2'
                }
            ],
            'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',    
            'issuanceDate': '2021-10-15T17:02:58.075Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:02:58Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..r9CsVgVkY448yyxrXPQ5VlY9Ey9-6FrH9lhd26_dwsn6dak0nVEUuGeCUQqkjt7iaAAOqbKU6Aqw1i7bR-UJCA'
            }
        },
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': 'RootAuthority',
        'label': 'HASH',
        'tag': 'Account Creation'
    }
];

module.exports.testObject3 = [
    {
        'type': 'VC',
        'id': '6i28MnZRhBjw7gjCn3VFeFtEZ3h6CJcrHPpmybvjsHXB',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '8fd41a06-704f-4563-8a5f-900523045ddb',
            'type': [
                'VerifiableCredential',
                'Installer'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'type': 'Installer',
                    'name': '1'
                }
            ],
            'issuer': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
            'issuanceDate': '2021-10-15T17:03:56.333Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:03:56Z',
                'verificationMethod': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',        
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..hHrl8e6tpqCQ-S-MmV-UlBEnflWHvgp1Jl-9qM7GePFW5gjTHsStxkJh3gSNUAca9yIR2Kf_Z-5RfpqNQ9UjBw'
            }
        },
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': 'Installer',
        'tag': 'send_installer_vc_to_guardian',
        'label': 'HASH'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'document': [
            {
                '_id': {
                    '$oid': '6169b46e8c3fb50013b24aa8'
                },
                'did': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
                            'publicKeyBase58': 'CoReRVJY82rMwPwnbm25yNGgdU4RviggYSUPFdUryD78'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271#did-root-key',        
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:03:42.445Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:47.034Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': 'EgBAx76vMG8h55voSL1wzZmVveFtyKYm6hv4fcfHeurF',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '34d48ab8-0166-4d59-a43d-f57b79e0c117',
            'type': [
                'VerifiableCredential',
                'Policy'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': '6169b4533101240013a15fa8',
                    'type': 'Policy',
                    'name': 't1',
                    'description': '1',
                    'version': '1',
                    'policyTag': 't1'
                }
            ],
            'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
            'issuanceDate': '2021-10-15T17:03:32.058Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:03:32Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..eLPVOuQuM86_mwVpPHz7zwOgGS4tVi7iAzY98nuJWAsfAGjT5MRg9YbtFzkYcdDfYTYZqBD8_h2hXo1cTa9ABA'
            }
        },
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': 'Policy',
        'label': 'HASH',
        'tag': 'Policy Created'
    },
    {
        'type': 'DID',
        'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'document': [
            {
                '_id': {
                    '$oid': '6169b4428c3fb50013b24aa5'
                },
                'did': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                'document': {
                    '@context': [
                        'https://www.w3.org/ns/did/v1',
                        'https://ns.did.ai/transmute/v1'
                    ],
                    'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                    'verificationMethod': [
                        {
                            'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                            'type': 'Ed25519VerificationKey2018',
                            'controller': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                            'publicKeyBase58': '7DE3CVyBywCSVbu6NqFouAPnEyP2PuiQMmN315rTKcxf'
                        }
                    ],
                    'authentication': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                    'assertionMethod': [
                        '#did-root-key'
                    ]
                },
                'status': 'CREATE',
                'createDate': {
                    '$date': '2021-10-15T17:02:58.440Z'
                },
                'updateDate': {
                    '$date': '2021-10-15T17:03:03.245Z'
                }
            }
        ],
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': null,
        'label': 'DID',
        'tag': null
    },
    {
        'type': 'VC',
        'id': 'FgzByaZNyCTscpTbUuEPMKc6gUW7jqEe9pMwAHnVWsa1',
        'document': {
            '@context': [
                'https://www.w3.org/2018/credentials/v1'
            ],
            'id': '4cb4a454-74f5-4b30-853d-524e36174614',
            'type': [
                'VerifiableCredential',
                'RootAuthority'
            ],
            'credentialSubject': [
                {
                    '@context': [
                        'https://localhost/schema'
                    ],
                    'id': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
                    'type': 'RootAuthority',
                    'name': '2'
                }
            ],
            'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
            'issuanceDate': '2021-10-15T17:02:58.075Z',
            'proof': {
                'type': 'Ed25519Signature2018',
                'created': '2021-10-15T17:02:58Z',
                'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
                'proofPurpose': 'assertionMethod',
                'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..r9CsVgVkY448yyxrXPQ5VlY9Ey9-6FrH9lhd26_dwsn6dak0nVEUuGeCUQqkjt7iaAAOqbKU6Aqw1i7bR-UJCA'
            }
        },
        'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'schema': 'RootAuthority',
        'label': 'HASH',
        'tag': 'Account Creation'
    }
]
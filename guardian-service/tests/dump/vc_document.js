'use strict';

module.exports.vc_document = [{
    '_id': {
        '$oid': '6169b4428c3fb50013b24aa3'
    },
    'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
    'hash': 'FgzByaZNyCTscpTbUuEPMKc6gUW7jqEe9pMwAHnVWsa1',
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
    'type': 'ROOT_AUTHORITY',
    'signature': 1,
    'status': 'ISSUE',
    'createDate': {
        '$date': '2021-10-15T17:02:58.360Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:03:03.242Z'
    }
}, {
    '_id': {
        '$oid': '6169b4648c3fb50013b24aa7'
    },
    'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
    'hash': 'EgBAx76vMG8h55voSL1wzZmVveFtyKYm6hv4fcfHeurF',
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
    'type': 'POLICY',
    'policyId': '6169b4533101240013a15fa8',
    'signature': 1,
    'status': 'NEW',
    'createDate': {
        '$date': '2021-10-15T17:03:32.225Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:03:32.225Z'
    }
}, {
    '_id': {
        '$oid': '6169b48e8c3fb50013b24aaa'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '6i28MnZRhBjw7gjCn3VFeFtEZ3h6CJcrHPpmybvjsHXB',
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
    'status': 'issue',
    'signature': 1,
    'type': 'Installer',
    'policyId': '6169b4533101240013a15fa8',
    'tag': 'send_installer_vc_to_guardian',
    'createDate': {
        '$date': '2021-10-15T17:04:14.483Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:04:14.483Z'
    }
}, {
    '_id': {
        '$oid': '6169b49b8c3fb50013b24aac'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': 'HX3Kq4TzixwwMTe5SFTvrYAsAbpaaqtT5VEFJA1upZdt',
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
    'status': 'issue',
    'signature': 1,
    'type': 'Inverter',
    'policyId': '6169b4533101240013a15fa8',
    'tag': 'send_sensor_vc_to_guardian',
    'createDate': {
        '$date': '2021-10-15T17:04:27.089Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:04:27.089Z'
    }
}, {
    '_id': {
        '$oid': '6169b4a88c3fb50013b24aad'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '7w5Kk1u5qCKZ36Xn797KYdF4K67VUrJELZbNSRFdGDKQ',
    'document': {
        '@context': [
            'https://www.w3.org/2018/credentials/v1'
        ],
        'id': 'e01d2143-987b-4175-ae5b-7fe6fee420cf',
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
                'period': 1,
                'policyId': '6169b4533101240013a15fa8',
                'accountId': '0.0.2859206'
            }
        ],
        'issuer': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201',
        'issuanceDate': '2021-10-15T17:04:40.463Z',
        'proof': {
            'type': 'Ed25519Signature2018',
            'created': '2021-10-15T17:04:40Z',
            'verificationMethod': 'did:hedera:testnet:4iCPiUyiKcHaMLrytqRHavQRCknLGg4n3BcLc5unxn5K;hedera:testnet:fid=0.0.2859201#did-root-key',
            'proofPurpose': 'assertionMethod',
            'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..Aoxshe78XGRbzrLhVNOXr45PvLqIvJGh-ludmCN3t84NAcg3WqTmMDH9PzWuBTP4WcIGuarcjSQpaZXS5CExCw'
        }
    },
    'status': 'NEW',
    'signature': 1,
    'type': 'MRV',
    'policyId': '6169b4533101240013a15fa8',
    'tag': 'save_mrv_document',
    'createDate': {
        '$date': '2021-10-15T17:04:40.738Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:04:40.738Z'
    }
}, {
    '_id': {
        '$oid': '6169b4ce8c3fb50013b24aae'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '4dMTac3e4D8AuqErfZ1UP5ypZaV3oGHTxNyvrFeYLZ7s',
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
    'status': 'NEW',
    'signature': 1,
    'type': 'MRV',
    'policyId': '6169b4533101240013a15fa8',
    'tag': 'save_mrv_document',
    'createDate': {
        '$date': '2021-10-15T17:05:18.767Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:05:18.767Z'
    }
}, {
    '_id': {
        '$oid': '6169b4d38c3fb50013b24aaf'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': 'HaFvVypWsWu5mSrKPQ6DhM1WFisT9nEdwHkzHBYjdt98',
    'document': {
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
    },
    'type': 'mint',
    'policyId': '6169b4533101240013a15fa8',
    'tag': 'mint_token',
    'signature': 1,
    'status': 'NEW',
    'createDate': {
        '$date': '2021-10-15T17:05:23.408Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:05:23.408Z'
    }
}, {
    '_id': {
        '$oid': '616ddb0e2ef2bc00141bbe90'
    },
    'owner': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
    'hash': '2BjzHhuPged1JGPTTF5uUM6X3YowRHVddw5JG42YKmoy',
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
    'type': 'POLICY',
    'policyId': '616ddb038aee1e00143ce4fe',
    'signature': 1,
    'status': 'NEW',
    'createDate': {
        '$date': '2021-10-18T20:37:34.936Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:37:34.936Z'
    }
}, {
    '_id': {
        '$oid': '616ddb282ef2bc00141bbe92'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '5WHX52McNsMpbiUF2y4wFon5UsQNvgUFr6jmbvDqnkdx',
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
    'status': 'issue',
    'signature': 1,
    'type': 'Installer',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'send_installer_vc_to_guardian',
    'createDate': {
        '$date': '2021-10-18T20:38:00.829Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:38:00.829Z'
    }
}, {
    '_id': {
        '$oid': '616ddb332ef2bc00141bbe94'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': 'H1kX4Xbp6GtHYqrqJRrLmP4YryWWg2CgZ1DUWQkWBoAD',
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
                'id': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
                'type': 'Inverter',
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
    'status': 'issue',
    'signature': 1,
    'type': 'Inverter',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'send_sensor_vc_to_guardian',
    'createDate': {
        '$date': '2021-10-18T20:38:11.997Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:38:11.997Z'
    }
}, {
    '_id': {
        '$oid': '616ddb472ef2bc00141bbe95'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': 'HfJBZkPs9TjRZ8ReuUrvhfuKJM64SNEzf3FjgX6bmcs8',
    'document': {
        '@context': [
            'https://www.w3.org/2018/credentials/v1'
        ],
        'id': 'a25778b9-7ac0-4d89-b2af-35ba833b9073',
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
                'period': 0,
                'policyId': '616ddb038aee1e00143ce4fe',
                'accountId': '0.0.2859206'
            }
        ],
        'issuer': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
        'issuanceDate': '2021-10-18T20:38:31.673Z',
        'proof': {
            'type': 'Ed25519Signature2018',
            'created': '2021-10-18T20:38:31Z',
            'verificationMethod': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201#did-root-key',
            'proofPurpose': 'assertionMethod',
            'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..MQSpH6sYl6YawVUM3XaOy-rGXW53_WIWs9mfy616QK45TyknDDq7zqgqxpaCNp2GcjD63Ulie3w4Bz5MMGJfDg'
        }
    },
    'status': 'NEW',
    'signature': 1,
    'type': 'MRV',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'save_mrv_document',
    'createDate': {
        '$date': '2021-10-18T20:38:31.982Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:38:31.982Z'
    }
}, {
    '_id': {
        '$oid': '616ddb492ef2bc00141bbe96'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '6Mt8BebbYHsKi7D4heHaX34H3jEmHF96AS4qjxffZ2g6',
    'document': {
        '@context': [
            'https://www.w3.org/2018/credentials/v1'
        ],
        'id': '5e0c5fb1-5470-408d-99a8-cf119fdaf119',
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
                'period': 1,
                'policyId': '616ddb038aee1e00143ce4fe',
                'accountId': '0.0.2859206'
            }
        ],
        'issuer': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
        'issuanceDate': '2021-10-18T20:38:33.161Z',
        'proof': {
            'type': 'Ed25519Signature2018',
            'created': '2021-10-18T20:38:33Z',
            'verificationMethod': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201#did-root-key',
            'proofPurpose': 'assertionMethod',
            'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..0JcUM_ms_73Zr_3sh3jVN-p3ptP3aSo-ffUWrPTyby05NiGUQbtT0GSyZhjMJg9j6o-7MP9UoXrqQAr7qCRmDg'
        }
    },
    'status': 'NEW',
    'signature': 1,
    'type': 'MRV',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'save_mrv_document',
    'createDate': {
        '$date': '2021-10-18T20:38:33.305Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:38:33.305Z'
    }
}, {
    '_id': {
        '$oid': '616ddb842ef2bc00141bbe97'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': 'GEmp3C7uJ16ULLhAWjynFfNm3nm6NMeP3tUHvXMevbbc',
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
    'status': 'NEW',
    'signature': 1,
    'type': 'MRV',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'save_mrv_document',
    'createDate': {
        '$date': '2021-10-18T20:39:32.683Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:39:32.683Z'
    }
}, {
    '_id': {
        '$oid': '616ddb852ef2bc00141bbe98'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '4DtauEHAxVHM8YkVhPTXmnVjGoncsdDtHTZiFXR9u6NT',
    'document': {
        '@context': [
            'https://www.w3.org/2018/credentials/v1'
        ],
        'id': '0d5f9084-18d5-49ea-b01c-c25222124649',
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
                'amount': 1,
                'period': 1,
                'policyId': '616ddb038aee1e00143ce4fe',
                'accountId': '0.0.2859206'
            }
        ],
        'issuer': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201',
        'issuanceDate': '2021-10-18T20:39:33.491Z',
        'proof': {
            'type': 'Ed25519Signature2018',
            'created': '2021-10-18T20:39:33Z',
            'verificationMethod': 'did:hedera:testnet:8NrYtVbU9opPNYZuEA4Zie4Bjy2wmBWn9eQY4YDmfSZ;hedera:testnet:fid=0.0.2859201#did-root-key',
            'proofPurpose': 'assertionMethod',
            'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..FsHsya0dx7TGGu-F5JfIG1ib1nDbEENjNjWlPPnSQpn0h64wr9RyblARFISjSHudVtHHCFhCKxmOTmkzbb6fDA'
        }
    },
    'status': 'NEW',
    'signature': 1,
    'type': 'MRV',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'save_mrv_document',
    'createDate': {
        '$date': '2021-10-18T20:39:33.613Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:39:33.613Z'
    }
}, {
    '_id': {
        '$oid': '616ddb892ef2bc00141bbe99'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': 'CEhzb1Fcbg2JSdBioqsbiDCxiFiCWudWSSDujMuotes8',
    'document': {
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
    },
    'type': 'mint',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'mint_token',
    'signature': 1,
    'status': 'NEW',
    'createDate': {
        '$date': '2021-10-18T20:39:37.338Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:39:37.338Z'
    }
}, {
    '_id': {
        '$oid': '616ddb8a2ef2bc00141bbe9b'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': 'B6RDDWDZHicH5ERJs7jpTGhsEuA1sq4Za33jp7V9YLHw',
    'document': {
        '@context': [
            'https://www.w3.org/2018/credentials/v1'
        ],
        'id': '5a1a04e5-081c-490c-af2b-9e7ec8612ffe',
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
                'date': '2021-10-18T20:39:38.070Z',
                'tokenId': '0.0.2880876',
                'serials': [
                    4
                ]
            }
        ],
        'issuer': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201',
        'issuanceDate': '2021-10-18T20:39:38.080Z',
        'proof': {
            'type': 'Ed25519Signature2018',
            'created': '2021-10-18T20:39:38Z',
            'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
            'proofPurpose': 'assertionMethod',
            'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19.._onpGErDgPyK9uccboq2iE9Ofgg03mxljBDyEDBzpnEGTA0zx-WAtc4YfShpOrYJ26BYm1eK7o94sZKiXuFFBQ'
        }
    },
    'type': 'mint',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'mint_token',
    'signature': 1,
    'status': 'NEW',
    'createDate': {
        '$date': '2021-10-18T20:39:38.341Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:39:38.341Z'
    }
}];
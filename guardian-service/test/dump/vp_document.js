'use strict';

module.exports.vp_document = [{
    '_id': {
        '$oid': '6169b4d38c3fb50013b24ab0'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '6FNz1t4eHNDncM1zn6J8djJLPnjuhQq3hp6EmcF1ictB',
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
    'type': 'mint',
    'policyId': '6169b4533101240013a15fa8',
    'tag': 'mint_token',
    'status': 'NEW',
    'signature': 0,
    'createDate': {
        '$date': '2021-10-15T17:05:23.419Z'
    },
    'updateDate': {
        '$date': '2021-10-15T17:05:23.419Z'
    }
}, {
    '_id': {
        '$oid': '616ddb892ef2bc00141bbe9a'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '5LDizXoaXcqYmdbGUfsRrzf5PpgWmiUuarmTNgTxAYyU',
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
    'type': 'mint',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'mint_token',
    'status': 'NEW',
    'signature': 0,
    'createDate': {
        '$date': '2021-10-18T20:39:37.354Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:39:37.354Z'
    }
}, {
    '_id': {
        '$oid': '616ddb8a2ef2bc00141bbe9c'
    },
    'owner': 'did:hedera:testnet:DngCWN5hckWLRYnAijxQz5Q2Gyy6cxjnDgvq2VNbGMJj;hedera:testnet:fid=0.0.2276271',
    'hash': '3RfNcMj3Qr3QPbnWv8QqrEYPnQsXkndknLQ1PSHsRN4k',
    'document': {
        'id': '1e88bd9c-13d5-4d96-a611-44356dbd7122',
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
            {
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
            }
        ],
        'proof': {
            'type': 'Ed25519Signature2018',
            'created': '2021-10-18T20:39:38Z',
            'verificationMethod': 'did:hedera:testnet:x719ZpApzxdFA23aUFsDLVjyNHPMeMcYpAcYBmW8nVn;hedera:testnet:fid=0.0.2859201#did-root-key',
            'proofPurpose': 'authentication',
            'challenge': '123',
            'jws': 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..1BJP_igedjSWlyboXZfLV2UM3GSc3kJ0rYF9kKZWGPQ0QzV9on5i-CGZTisoChIWxkXY9YeCrS5ZgazcXQrADQ'
        }
    },
    'type': 'mint',
    'policyId': '616ddb038aee1e00143ce4fe',
    'tag': 'mint_token',
    'status': 'NEW',
    'signature': 0,
    'createDate': {
        '$date': '2021-10-18T20:39:38.350Z'
    },
    'updateDate': {
        '$date': '2021-10-18T20:39:38.350Z'
    }
}];
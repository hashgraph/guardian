import type { Project, Credit } from '~/types/models';

export function generateProjectVc(p: Project): Record<string, any> {
    return {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
            'https://ipfs.io/ipfs/QmPzY9TziQ4QR3jE3sDQpGcoVhMvZm1NFn4J4JpJaYqzSw',
        ],
        id: `urn:uuid:${crypto.randomUUID?.() || p.id}`,
        type: ['VerifiableCredential'],
        issuer: `did:hedera:testnet:z6Mk${p.registry.replace(/\s+/g, '')}Registry`,
        issuanceDate: `${p.createdAt}T00:00:00.000Z`,
        credentialSubject: [
            {
                '@context': ['https://ipfs.io/ipfs/QmPzY9TziQ4QR3jE3sDQpGcoVhMvZm1NFn4J4JpJaYqzSw'],
                id: `did:hedera:testnet:z6MkProject${p.id}`,
                type: 'ProjectRegistration',
                projectName: p.name,
                projectCountry: p.country,
                countryCode: p.countryCode,
                methodology: p.methodology,
                methodologyId: p.methodologyId,
                registry: p.registry,
                developer: p.developer,
                sector: p.sector,
                sectoralScope: p.sectoralScope,
                category: p.category,
                vintage: p.vintage,
                status: p.status,
                estimatedCredits: p.credits,
                sdgs: p.sdgs,
                location: {
                    latitude: p.lat,
                    longitude: p.lng,
                },
                creditingPeriod: {
                    start: `${parseInt(p.vintage) - 1}-01-01`,
                    end: `${parseInt(p.vintage) + 9}-12-31`,
                },
            },
        ],
        proof: {
            type: 'Ed25519Signature2020',
            created: `${p.createdAt}T12:00:00.000Z`,
            verificationMethod: `did:hedera:testnet:z6Mk${p.registry.replace(/\s+/g, '')}Registry#key-1`,
            proofPurpose: 'assertionMethod',
            proofValue: 'z3FXQFBYhSMYDNaUbDfcideGfreKPJLx9bFPmNTNg7CvX8rZpPJLHJ5BpQz1p5vZVp3LdNeDx8k93HQDbVMnEsJA2',
        },
    };
}

export function generateCreditVc(c: Credit, projectName?: string): Record<string, any> {
    return {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
        ],
        id: `urn:uuid:${crypto.randomUUID?.() || c.id}`,
        type: ['VerifiableCredential'],
        issuer: `did:hedera:testnet:z6Mk${c.registry.replace(/\s+/g, '')}Registry`,
        issuanceDate: `${c.mintDate}T00:00:00.000Z`,
        credentialSubject: [
            {
                type: 'TokenIssuance',
                tokenId: c.tokenId,
                tokenName: c.name,
                tokenSymbol: c.symbol,
                tokenType: c.type,
                totalSupply: c.supply,
                project: projectName || c.projectId,
                registry: c.registry,
                emission_reduction: {
                    ER_y: c.supply,
                    unit: 'tCO2e',
                },
            },
        ],
        proof: {
            type: 'Ed25519Signature2020',
            created: `${c.mintDate}T12:00:00.000Z`,
            verificationMethod: `did:hedera:testnet:z6Mk${c.registry.replace(/\s+/g, '')}Registry#key-1`,
            proofPurpose: 'assertionMethod',
            proofValue: 'z5wVsGxZ1pC3xdFQKbFn7zK8vTH3LrRejgBPUqaYo2QmRG4BQMJwx9TqJH5LnNQiABWyrkxJDFu1cTFPYLwKZ8pa',
        },
    };
}

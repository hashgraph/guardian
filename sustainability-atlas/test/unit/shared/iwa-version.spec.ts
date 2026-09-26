import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_IWA_VERSION,
    IwaVersion,
    iwaFieldPaths,
    iwaPathForVersion,
    mapIwaPathV1ToV3,
    resolveIwaVersion,
} from '@shared/config/iwa-version';


describe('IwaVersion', () => {
    it('exposes v1 and v3', () => {
        expect(IwaVersion.V1).toBe('1.0.0');
        expect(IwaVersion.V3).toBe('3.0.0');
    });

    it('defaults new schemas to v3', () => {
        expect(DEFAULT_IWA_VERSION).toBe(IwaVersion.V3);
    });
});

describe('resolveIwaVersion', () => {
    it('reads an untagged schema as v1, never as the create-default', () => {
        expect(resolveIwaVersion(undefined)).toBe(IwaVersion.V1);
        expect(resolveIwaVersion(null)).toBe(IwaVersion.V1);
        expect(resolveIwaVersion({})).toBe(IwaVersion.V1);
        expect(resolveIwaVersion({ iwaVersion: undefined })).toBe(IwaVersion.V1);
    });

    it('honours an explicit tag', () => {
        expect(resolveIwaVersion({ iwaVersion: '1.0.0' })).toBe(IwaVersion.V1);
        expect(resolveIwaVersion({ iwaVersion: '3.0.0' })).toBe(IwaVersion.V3);
    });

    it('falls back to v1 for an unrecognised value', () => {
        expect(resolveIwaVersion({ iwaVersion: '9.9.9' })).toBe(IwaVersion.V1);
        expect(resolveIwaVersion({ iwaVersion: '' })).toBe(IwaVersion.V1);
    });
});

describe('mapIwaPathV1ToV3', () => {
    it('leaves a path unchanged when both versions share it', () => {
        expect(mapIwaPathV1ToV3('ActivityImpactModule.name')).toBe('ActivityImpactModule.name');
        expect(mapIwaPathV1ToV3('ClaimSource.sourceIdentifier')).toBe('ClaimSource.sourceIdentifier');
    });

    it('renames a field within its entity', () => {
        expect(mapIwaPathV1ToV3('Address.zip')).toBe('Address.postalCode');
        expect(mapIwaPathV1ToV3('ProcessedClaim.vpaId')).toBe('ProcessedClaim.opaId');
        expect(mapIwaPathV1ToV3('REC.recType')).toBe('REC.type');
    });

    it('moves a field to a different entity', () => {
        expect(mapIwaPathV1ToV3('AccountableImpactOrganization.country')).toBe('ActivityImpactModule.country');
        expect(mapIwaPathV1ToV3('AccountableImpactOrganization.region')).toBe('ActivityImpactModule.region');
        expect(mapIwaPathV1ToV3('CoreCarbonPrinciples.vintage')).toBe('CRU.vintage');
    });

    it('applies entity renames across every field of that entity', () => {
        expect(mapIwaPathV1ToV3('ImpactClaimCheckpoint.claimId')).toBe('Checkpoint.claimId');
        expect(mapIwaPathV1ToV3('SdpFile.name')).toBe('DataFile.name');
        expect(mapIwaPathV1ToV3('VerificationProcessAgreement.signatories')).toBe('OriginationProcessAgreement.signatories');
    });

    it('collapses the MRV extension family onto entityExtensions', () => {
        expect(mapIwaPathV1ToV3('ClaimSource.mrvExtensions')).toBe('ClaimSource.entityExtensions');
        expect(mapIwaPathV1ToV3('Manifest.mrvExtensions')).toBe('Manifest.entityExtensions');
    });

    it('lets an explicit path rename win over the entity rule', () => {
        expect(mapIwaPathV1ToV3('ImpactClaimCheckpoint.spanDataPackage')).toBe('Checkpoint.dataPackages');
        expect(mapIwaPathV1ToV3('ImpactClaimCheckpoint.mrvExtensions')).toBe('Checkpoint.entityExtensions');
        expect(mapIwaPathV1ToV3('ImpactClaimCheckpoint.verifiedLinkToCheckpointData')).toBe('DataPackage.verifiedLinkToCheckpointData');
    });

    it('returns null for properties v3 removed', () => {
        expect(mapIwaPathV1ToV3('MrvExtension.typedExtension')).toBeNull();
        expect(mapIwaPathV1ToV3('TypedExtension.dataSchema')).toBeNull();
        expect(mapIwaPathV1ToV3('UntypedExtension.name')).toBeNull();
        expect(mapIwaPathV1ToV3('DataExtension.key')).toBeNull();
        expect(mapIwaPathV1ToV3('Any.typeUrl')).toBeNull();
        expect(mapIwaPathV1ToV3('Timestamp.seconds')).toBeNull();
    });

    it('returns null for dropped back-references', () => {
        expect(mapIwaPathV1ToV3('ImpactClaim.activityImpactModule')).toBeNull();
        expect(mapIwaPathV1ToV3('ProcessedClaim.impactClaim')).toBeNull();
        expect(mapIwaPathV1ToV3('ActivityImpactModule.accountableImpactOrganization')).toBeNull();
    });

    it('returns null for an empty or missing path', () => {
        expect(mapIwaPathV1ToV3('')).toBeNull();
        expect(mapIwaPathV1ToV3(undefined as unknown as string)).toBeNull();
        expect(mapIwaPathV1ToV3(null as unknown as string)).toBeNull();
    });

    it('leaves a path with no entity separator alone', () => {
        expect(mapIwaPathV1ToV3('bareValue')).toBe('bareValue');
    });

    it('is idempotent — a v3 path fed back through is unchanged', () => {
        for (const path of [
            'Address.postalCode',
            'ActivityImpactModule.country',
            'Checkpoint.dataPackages',
            'ProcessedClaim.opaId',
            'OriginationProcessAgreement.signatories',
        ]) {
            expect(mapIwaPathV1ToV3(path)).toBe(path);
        }
    });
});

describe('iwaPathForVersion', () => {
    it('returns a v3 path untouched for a v3 schema', () => {
        expect(iwaPathForVersion('ActivityImpactModule.country', IwaVersion.V3)).toBe('ActivityImpactModule.country');
        expect(iwaPathForVersion('Address.postalCode', IwaVersion.V3)).toBe('Address.postalCode');
    });

    it('maps a v1 path up to v3 for a v1 schema', () => {
        expect(iwaPathForVersion('AccountableImpactOrganization.country', IwaVersion.V1)).toBe('ActivityImpactModule.country');
        expect(iwaPathForVersion('Address.zip', IwaVersion.V1)).toBe('Address.postalCode');
    });

    it('is idempotent for a v1 schema that already uses a v3 name', () => {
        expect(iwaPathForVersion('ActivityImpactModule.country', IwaVersion.V1)).toBe('ActivityImpactModule.country');
    });

    it('returns null for a v1 property v3 dropped', () => {
        expect(iwaPathForVersion('MrvExtension.typedExtension', IwaVersion.V1)).toBeNull();
    });

    it('returns null for empty / nullish input', () => {
        expect(iwaPathForVersion(undefined, IwaVersion.V3)).toBeNull();
        expect(iwaPathForVersion(null, IwaVersion.V1)).toBeNull();
        expect(iwaPathForVersion('', IwaVersion.V3)).toBeNull();
    });
});

describe('iwaFieldPaths', () => {
    it('splits a comma-compound spec and trims', () => {
        expect(iwaFieldPaths('ImpactClaim.startDate,ImpactClaim.endDate')).toEqual([
            'ImpactClaim.startDate',
            'ImpactClaim.endDate',
        ]);
        expect(iwaFieldPaths(' A.b , C.d ')).toEqual(['A.b', 'C.d']);
    });

    it('returns a single-element array for a plain path', () => {
        expect(iwaFieldPaths('ActivityImpactModule.name')).toEqual(['ActivityImpactModule.name']);
    });

    it('returns an empty array for nullish / empty input', () => {
        expect(iwaFieldPaths(undefined)).toEqual([]);
        expect(iwaFieldPaths(null)).toEqual([]);
        expect(iwaFieldPaths('')).toEqual([]);
    });
});

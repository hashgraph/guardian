import { describe, expect, it } from '@jest/globals';
import { mapIwaPathV1ToV3 } from '@shared/config/iwa-version';
import { IWA_TO_CADTRUST, IWA_TO_CDOP } from '@shared/config/standard-field-mappings.generated';
import {
    PROJECT_KEY_TO_IWA,
    ProjectExportService,
    resolveIwaPath,
} from '@api/services/project-export.service';
import type { ProjectResponseDto } from '@api/dto/project.dto';

describe('resolveIwaPath — IWA export is always v3', () => {
    it('rewrites a legacy v1 path to v3 for the iwa format', () => {
        expect(resolveIwaPath('AccountableImpactOrganization.country', 'iwa')).toBe('ActivityImpactModule.country');
        expect(resolveIwaPath('Address.zip', 'iwa')).toBe('Address.postalCode');
    });

    it('leaves an already-v3 path unchanged for the iwa format', () => {
        expect(resolveIwaPath('ActivityImpactModule.name', 'iwa')).toBe('ActivityImpactModule.name');
        expect(resolveIwaPath('ImpactClaim.startDate', 'iwa')).toBe('ImpactClaim.startDate');
    });

    it('every PROJECT_KEY_TO_IWA value is already canonical v3', () => {
        for (const value of Object.values(PROJECT_KEY_TO_IWA)) {
            expect(resolveIwaPath(value, 'iwa')).toBe(value);
        }
    });

    it('no PROJECT_KEY_TO_IWA value flips a non-null CADTrust/CDOP mapping to null', () => {
        for (const value of Object.values(PROJECT_KEY_TO_IWA)) {
            const rawCad = IWA_TO_CADTRUST[value] ?? null;
            const rawCdop = IWA_TO_CDOP[value] ?? null;
            if (rawCad !== null) expect(resolveIwaPath(value, 'cadtrust')).toBe(rawCad);
            if (rawCdop !== null) expect(resolveIwaPath(value, 'cdop')).toBe(rawCdop);
        }
    });

    it('resolves a v1 key and its v3 alias to the same standard path', () => {
        // QualityStandard.methodologyAndTools (v1) -> QualityStandard.methdologyAndTools (v3)
        expect(resolveIwaPath('QualityStandard.methodologyAndTools', 'cadtrust'))
            .toBe(resolveIwaPath('QualityStandard.methdologyAndTools', 'cadtrust'));
    });
});

describe('ProjectExportService.exportProject — iwa output paths', () => {
    const project = {
        name: 'Test project',
        description: 'desc',
        country: 'India',
        developer: 'Dev Co',
        category: 'AFOLU',
        scale: 'Large',
        sector: 'Forestry',
        sectoralScope: '14',
        vintage: '2021',
        creditingPeriodStart: '2021-01-01',
        creditingPeriodEnd: '2030-12-31',
        sdgs: [13, 15],
        credits: 1000,
        methodology: 'VM0047',
        registryName: 'Verra',
        lifecycleStage: 'registered',
        sourceTimestamp: '1700000000.000000000',
        lat: null,
        lng: null,
        polygon: null,
    } as unknown as ProjectResponseDto;

    const collectLeafPaths = (obj: Record<string, unknown>, prefix = ''): string[] => {
        const out: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                out.push(...collectLeafPaths(v as Record<string, unknown>, path));
            } else {
                out.push(path);
            }
        }
        return out;
    };

    it('emits only v3-stable IWA paths', async () => {
        const result = await new ProjectExportService().exportProject(project, 'iwa');
        for (const path of collectLeafPaths(result)) {
            // every dotted segment chain must be idempotent under v1->v3
            expect(mapIwaPathV1ToV3(path)).toBe(path);
        }
    });
});

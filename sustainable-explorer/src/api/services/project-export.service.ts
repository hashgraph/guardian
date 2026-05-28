import { Injectable } from '@nestjs/common';
import { PROJECT_EXTRACT_FIELDS } from '../../worker/project-mapper/project-fields';
import { IWA_TO_CADTRUST, IWA_TO_CDOP } from '../../shared/config/standard-field-mappings.generated';
import { ProjectResponseDto } from '../dto/project.dto';

export type ExportFormat = 'iwa' | 'cadtrust' | 'cdop';

interface FlatEntry {
    path: string;
    value: unknown;
}

const COMPOSITE_KEYS = new Set(['creditingPeriod']);

const PROJECT_KEY_TO_IWA: Record<string, string> = {};
for (const f of PROJECT_EXTRACT_FIELDS) {
    if (f.iwaField && !COMPOSITE_KEYS.has(f.key)) {
        PROJECT_KEY_TO_IWA[f.key] = f.iwaField;
    }
}
Object.assign(PROJECT_KEY_TO_IWA, {
    registry: 'OriginationProcessAgreement.name',
    status: 'ActivityImpactModule.validations',
    methodology: 'QualityStandard.name',
    credits: 'ImpactClaim.quantity',
    sectoralScope: 'ActivityImpactModule.projectType',
    lat: 'ActivityImpactModule.geographicLocation.latitude',
    lng: 'ActivityImpactModule.geographicLocation.longitude',
    sourceTimestamp: 'ActivityImpactModule.registryProjectId',
    sdgs: 'ActivityImpactModule.benefitCategory',
    creditingPeriodStart: 'ImpactClaim.startDate',
    creditingPeriodEnd: 'ImpactClaim.endDate',
});

function nestFields(entries: FlatEntry[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const { path, value } of entries) {
        const parts = path.split('.');
        let cursor: Record<string, unknown> = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in cursor) || typeof cursor[parts[i]] !== 'object' || cursor[parts[i]] === null) {
                cursor[parts[i]] = {};
            }
            cursor = cursor[parts[i]] as Record<string, unknown>;
        }
        cursor[parts[parts.length - 1]] = value;
    }
    return result;
}

function resolveIwaPath(iwaPath: string, format: ExportFormat): string | null {
    switch (format) {
        case 'iwa': return iwaPath;
        case 'cadtrust': return IWA_TO_CADTRUST[iwaPath] ?? null;
        case 'cdop': return IWA_TO_CDOP[iwaPath] ?? null;
    }
}

const INVALID_COUNTRY = new Set([
    'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
    'not available', 'not provided', 'unknown',
    'point', 'multipoint', 'linestring', 'multilinestring',
    'polygon', 'multipolygon', 'geometrycollection',
]);

function isValidCountry(val: string | null): boolean {
    if (!val) return false;
    const lower = val.trim().toLowerCase();
    if (INVALID_COUNTRY.has(lower)) return false;
    if (/[°]/.test(val)) return false;
    if (/^-?\d+(\.\d+)?\s*[,°]\s*-?\d+(\.\d+)?/.test(val)) return false;
    if (/^\d+(\.\d+)?$/.test(val.trim())) return false;
    return true;
}

async function reverseGeoCountry(lat: number, lng: number): Promise<string | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`;
        const res = await fetch(url, {
            headers: { 'Accept-Language': 'en', 'User-Agent': 'SustainabilityAtlas/1.0' },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json() as Record<string, any>;
        return data?.address?.country ?? null;
    } catch {
        return null;
    }
}

function resolveValue(project: ProjectResponseDto, key: string): unknown {
    switch (key) {
        case 'name': return project.name;
        case 'description': return project.description;
        case 'country': return project.country;
        case 'developer': return project.developer;
        case 'category': return project.category;
        case 'sector': return project.sector;
        case 'sectoralScope': return project.sectoralScope;
        case 'vintageRaw': return project.vintage;
        case 'creditingPeriodStart': return project.creditingPeriodStart;
        case 'creditingPeriodEnd': return project.creditingPeriodEnd;
        case 'sdgOrCobenefits':
        case 'sdgs':
            return project.sdgs?.length ? project.sdgs.map(n => `UN-SDG-${n}`) : null;
        case 'geo':
            return project.lat != null && project.lng != null
                ? { latitude: project.lat, longitude: project.lng }
                : null;
        case 'lat': return project.lat;
        case 'lng': return project.lng;
        case 'registry': return project.registryName;
        case 'status': return project.status;
        case 'methodology': return project.methodology;
        case 'credits': return project.credits;
        case 'sourceTimestamp': return project.sourceTimestamp;
        default: return null;
    }
}

@Injectable()
export class ProjectExportService {
    async exportProject(project: ProjectResponseDto, format: ExportFormat): Promise<Record<string, unknown>> {
        let country: string | null = isValidCountry(project.country) ? project.country : null;

        if (!country && project.lat != null && project.lng != null) {
            country = await reverseGeoCountry(project.lat, project.lng);
        }

        const entries: FlatEntry[] = [];
        const emittedIwaPaths = new Set<string>();

        for (const [key, iwaPath] of Object.entries(PROJECT_KEY_TO_IWA)) {
            const value = key === 'country' ? country : resolveValue(project, key);
            const targetPath = resolveIwaPath(iwaPath, format);

            if (targetPath) {
                entries.push({ path: targetPath, value: value ?? null });
                emittedIwaPaths.add(iwaPath);
            }
        }

        if (!emittedIwaPaths.has('ImpactClaim.startDate')) {
            const path = resolveIwaPath('ImpactClaim.startDate', format);
            if (path) entries.push({ path, value: project.creditingPeriodStart ?? null });
        }
        if (!emittedIwaPaths.has('ImpactClaim.endDate')) {
            const path = resolveIwaPath('ImpactClaim.endDate', format);
            if (path) entries.push({ path, value: project.creditingPeriodEnd ?? null });
        }

        if (format === 'iwa') {
            entries.push({ path: 'ImpactClaim.unitOfMeasure', value: 'tCO2e' });
        }

        return nestFields(entries);
    }
}

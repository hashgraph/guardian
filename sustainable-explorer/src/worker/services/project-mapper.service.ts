import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
    slugify,
    normalizeSector,
    resolveMethod,
    parseSchemaDoc,
    resolveFieldPaths,
    loadResolutionMaps,
    extractLatLng,
} from '../project-mapper/helpers';
import {
    buildSchemaEntryImproved,
    extractLatLngStrings,
    findFieldByTitleOrDesc,
    findFieldByTitleOrDescExcluding,
    extractSdgsFromText,
} from '../project-mapper/improved-heuristic.mapper';
import { PROJECT_EXTRACT_FIELDS } from '../project-mapper/project-fields';
import { SchemaEntry, FieldDef, ResolvedFieldPaths } from '../project-mapper/types';

/**
 * Per-VC project upsert service.
 * Called from IpfsFetchProcessor immediately after a VC-Document's IPFS content
 * lands, so project rows appear without waiting for the 60-minute batch builder.
 *
 * The batch builder (BusinessViewBuilderProcessor) remains as a reconciliation
 * sweep that handles dedup-key changes and stale row deletion.
 */
@Injectable()
export class ProjectMapperService {
    private readonly logger = new Logger(ProjectMapperService.name);

    constructor(private readonly dataSource: DataSource) {}

    /**
     * Given the consensusTimestamp of a VC-Document message whose documents
     * column has just been populated, attempts to extract project fields and
     * upsert a PROJECT row in business_view keyed by projectKey.
     *
     * Silently returns (does not throw) when the VC cannot be mapped — missing
     * schema, no geo field, no name — because the batch reconciler is the safety net.
     */
    async upsertProjectFromVc(messageConsensusTimestamp: string): Promise<void> {
        // Load the freshly-updated message row.
        const rows: Array<{
            consensusTimestamp: string;
            topicId: string;
            documents: Record<string, unknown>;
        }> = await this.dataSource.query(
            `SELECT "consensusTimestamp", "topicId", documents
             FROM message
             WHERE "consensusTimestamp" = $1
               AND type = 'VC-Document'
               AND documents IS NOT NULL
             LIMIT 1`,
            [messageConsensusTimestamp],
        );

        if (rows.length === 0) return;

        const vc = rows[0];
        const docs = vc.documents as Record<string, any>;
        const credentialSubject = docs['credentialSubject'];
        const cs = Array.isArray(credentialSubject)
            ? (credentialSubject[0] as Record<string, any>)
            : null;
        if (!cs) return;

        const rawType: string = cs['type'] ?? '';
        const vcUuid = rawType.split('&')[0].trim().replace(/^#/, '');
        if (!vcUuid) return;

        // Resolve the schema entry for this VC type.
        const schemaEntry = await this.resolveSchemaEntry(vcUuid, vc.topicId);
        if (!schemaEntry) return;

        const subject: Record<string, any> | null = schemaEntry.section
            ? (cs[schemaEntry.section] as Record<string, any> | null) ?? null
            : cs;
        if (!subject || typeof subject !== 'object') return;

        // Geo extraction (mirrors improved-heuristic.mapper inner loop).
        // A missing or unparseable geo value is non-fatal — produce a PROJECT row
        // with lat/lng = null rather than discarding the VC entirely.
        let lngLat: [number, number] | null = null;
        if (schemaEntry.geoKey) {
            let geoVal = subject[schemaEntry.geoKey] as unknown;
            if (Array.isArray(geoVal) && geoVal.length > 0) geoVal = geoVal[0];
            if (geoVal && typeof geoVal === 'object') {
                const geoObj = geoVal as Record<string, any>;
                if ('type' in geoObj) {
                    lngLat = extractLatLng(geoObj);
                } else {
                    lngLat = extractLatLngStrings(geoObj);
                }
            }
        }

        const lng = lngLat?.[0] ?? null;
        const lat = lngLat?.[1] ?? null;
        const fm = schemaEntry.fieldMap;
        const rf = schemaEntry.resolvedFields ?? resolveFieldPaths(fm);

        const getRaw = (key: string | null | undefined): string =>
            key ? unwrapValue(subject[key]) : '';

        // Drive all field extractions from PROJECT_EXTRACT_FIELDS.
        // 'geo' is handled separately via schemaEntry.geoKey — skip it here.
        const extracted: Record<string, string> = {};
        for (const field of PROJECT_EXTRACT_FIELDS) {
            if (field.key === 'geo') continue;
            const rfKey = field.key as keyof ResolvedFieldPaths;
            if (rf && rf[rfKey] !== undefined) {
                extracted[field.key] = getRaw(rf[rfKey]);
            } else {
                extracted[field.key] = field.exclude
                    ? findFieldByTitleOrDescExcluding(subject, fm, field.keywords, field.exclude)
                    : findFieldByTitleOrDesc(subject, fm, ...field.keywords);
            }
        }

        const name = extracted['name'];
        if (!name) return;

        const country = extracted['country'];
        const developer = extracted['developer'];
        const category = extracted['category'];
        const scale = extracted['scale'];
        const rawSector = extracted['sector'];
        const vintageRaw = extracted['vintageRaw'];

        let createdAt: string | null = null;
        let creditingPeriodEnd: string | null = null;
        const cpKey = rf?.creditingPeriod
            ?? Object.entries(fm).find(([, fd]) => fd.title.toLowerCase().includes('crediting period'))?.[0];
        if (cpKey) {
            const f = subject[cpKey];
            if (f && typeof f === 'object') {
                createdAt = typeof f['from'] === 'string' ? f['from'] : null;
                creditingPeriodEnd = typeof f['to'] === 'string' ? f['to'] : null;
            }
        }
        if (!createdAt) createdAt = vintageRaw || null;
        const rawDateForYear = createdAt ?? vintageRaw ?? null;
        const vintage: string | null = rawDateForYear
            ? (rawDateForYear.match(/\b(19|20)\d{2}\b/)?.[0] ?? null)
            : null;

        const sdgKey = rf?.sdgOrCobenefits
            ?? Object.entries(fm).find(([, fd]) => {
                const t = fd.title.toLowerCase();
                return t.includes('co-benefit') || t.includes('sustainable') || t.includes('sdg');
            })?.[0];
        const field25Raw = sdgKey ? String(subject[sdgKey] ?? '').trim() : '';
        const field25Tokens = field25Raw.split(',').map((s: string) => s.trim()).filter(Boolean);
        const allNumeric = field25Tokens.length > 0 && field25Tokens.every((t: string) => /^\d+$/.test(t));
        const sdgs: number[] = allNumeric
            ? field25Tokens.map(Number).filter((n: number) => n >= 1 && n <= 17)
            : extractSdgsFromText(field25Raw);
        const cobenefits: string | null = !allNumeric && field25Raw ? field25Raw : null;

        const emissionReduction = cs['emission_reduction'] as Record<string, any> | undefined;
        const erY = emissionReduction ? parseFloat(String(emissionReduction['ER_y'] ?? '0')) : 0;
        const creditsToAdd = erY > 0 ? erY : 0;

        const { maps, methodScopeMap } = await loadResolutionMaps(this.dataSource);
        const resolved = resolveMethod(vc.topicId, developer, maps);
        const methScopes = resolved.policyTopicId
            ? (methodScopeMap[resolved.policyTopicId] ?? [])
            : [];
        const sectoralScope = methScopes[0] ?? '';
        const sector = normalizeSector(methScopes)
            || (rawSector ? normalizeSector([rawSector]) : '')
            || '';

        // When lat/lng are available use geo-precision dedup; otherwise fall back to
        // name + country so two distinct projects sharing a name don't get merged.
        const dedupKey = (lat !== null && lng !== null)
            ? `${name}|${Math.round(lat * 10000) / 10000}|${Math.round(lng * 10000) / 10000}`
            : `${name}|${country ?? '_'}`;

        // Load schema UUIDs for this policy to populate projectSchemaUuids.
        const schemaUuidRows: Array<{ schemaId: string }> = await this.dataSource.query(
            `SELECT "schemaId" FROM policy_schema WHERE "policyTopicId" = $1 AND "schemaId" IS NOT NULL`,
            [schemaEntry.policyTopicId],
        );
        const projectSchemaUuids = schemaUuidRows.map(r => r.schemaId);

        const businessData = {
            name,
            country: country || null,
            lat,
            lng,
            methodology: resolved.name,
            methodologyId: slugify(resolved.name),
            developer,
            credits: creditsToAdd,
            status: 'Issuing',
            vintage,
            sdgs,
            cobenefits,
            scale: scale || null,
            category: category || null,
            sector,
            sectoralScope,
            createdAt,
            creditingPeriodEnd,
            topicId: vc.topicId,
            policyTopicId: resolved.policyTopicId,
            vcCount: 1,
            projectSchemaUuids,
        };

        const searchText = [
            name,
            developer,
            country ?? '',
            resolved.name,
            category ?? '',
            cobenefits ?? '',
        ]
            .filter(Boolean)
            .join(' ');

        // Upsert by (viewType='PROJECT', projectKey). When the same project key
        // already exists (same dedupKey from an earlier VC), accumulate credits
        // and increment vcCount rather than overwriting the row.
        await this.dataSource.query(
            `INSERT INTO business_view (
                "sourceTimestamp",
                "viewType",
                "displayName",
                "registryDid",
                "relatedTopicId",
                "businessData",
                "searchText",
                "projectKey",
                "lastUpdate",
                "createdAt",
                "updatedAt"
            ) VALUES ($1, 'PROJECT', $2, $3, $4, $5, $6, $7, EXTRACT(EPOCH FROM NOW())::bigint, NOW(), NOW())
            ON CONFLICT ("projectKey")
            WHERE "viewType" = 'PROJECT' AND "projectKey" IS NOT NULL
            DO UPDATE SET
                "displayName"    = EXCLUDED."displayName",
                "registryDid"    = COALESCE(EXCLUDED."registryDid", business_view."registryDid"),
                "relatedTopicId" = EXCLUDED."relatedTopicId",
                "businessData"   = business_view."businessData" || jsonb_build_object(
                    'credits', COALESCE((business_view."businessData"->>'credits')::numeric, 0)
                               + COALESCE((EXCLUDED."businessData"->>'credits')::numeric, 0),
                    'vcCount',  COALESCE((business_view."businessData"->>'vcCount')::int, 0) + 1
                ) || EXCLUDED."businessData" - 'credits' - 'vcCount',
                "searchText"     = EXCLUDED."searchText",
                "lastUpdate"     = EXCLUDED."lastUpdate",
                "updatedAt"      = NOW()`,
            [
                vc.consensusTimestamp,
                name,
                resolved.registryDid || null,
                vc.topicId,
                JSON.stringify(businessData),
                searchText,
                dedupKey,
            ],
        );

        this.logger.debug(
            `Upserted PROJECT row for vc=${messageConsensusTimestamp} key="${dedupKey}"`,
        );
    }

    /**
     * Resolves the SchemaEntry for a VC type UUID.
     *
     * Priority order:
     *   1. policy_decode_status.projectFieldMap + projectGeoKey/Section (decode-time resolved)
     *   2. policy_schema.projectSchemaConfig (fast path — stored config)
     *   3. Parse document via buildSchemaEntryImproved (slow path)
     */
    private async resolveSchemaEntry(vcUuid: string, _topicId: string): Promise<SchemaEntry | null> {
        const rows: Array<{
            schemaId: string;
            policyTopicId: string;
            document: unknown;
            isProjectSchema: boolean | null;
            projectSchemaConfig: Record<string, unknown> | null;
            pds_projectFieldMap: Record<string, string | null> | null;
            pds_projectGeoKey: string | null;
            pds_projectGeoSection: string | null;
        }> = await this.dataSource.query(
            `SELECT
                ps."schemaId",
                ps."policyTopicId",
                ps.document,
                ps."isProjectSchema",
                ps."projectSchemaConfig",
                pds."projectFieldMap"    AS pds_projectFieldMap,
                pds."projectGeoKey"      AS pds_projectGeoKey,
                pds."projectGeoSection"  AS pds_projectGeoSection
             FROM policy_schema ps
             LEFT JOIN policy_decode_status pds
               ON pds."policyTopicId" = ps."policyTopicId"
              AND pds.status = 'success'
             WHERE ps."schemaId" = $1
             LIMIT 1`,
            [vcUuid],
        );

        if (rows.length === 0) return null;

        const row = rows[0];

        // Path 1: decode-time data from policy_decode_status
        if (row.pds_projectGeoKey && row.pds_projectFieldMap) {
            // We need the fieldMap from the stored config to enable unwrap lookups.
            let fieldMap: Record<string, FieldDef> = {};
            if (row.projectSchemaConfig) {
                fieldMap = (row.projectSchemaConfig['fieldMap'] as Record<string, FieldDef>) ?? {};
            } else if (row.document) {
                const doc = parseSchemaDoc(row.document);
                const entry = buildSchemaEntryImproved(row.schemaId, row.policyTopicId, doc);
                if (entry) fieldMap = entry.fieldMap;
            }
            return {
                schemaUuid: row.schemaId,
                policyTopicId: row.policyTopicId,
                geoKey: row.pds_projectGeoKey,
                section: row.pds_projectGeoSection ?? null,
                fieldMap,
                resolvedFields: row.pds_projectFieldMap as unknown as ResolvedFieldPaths,
            };
        }

        // Path 2: stored config in policy_schema
        if (row.isProjectSchema === true && row.projectSchemaConfig) {
            const cfg = row.projectSchemaConfig;
            return {
                schemaUuid: row.schemaId,
                policyTopicId: row.policyTopicId,
                geoKey: cfg['geoKey'] as string,
                section: (cfg['section'] as string | null) ?? null,
                fieldMap: cfg['fieldMap'] as Record<string, FieldDef>,
                resolvedFields: cfg['resolvedFields'] as ResolvedFieldPaths | undefined,
            };
        }

        // Path 3: parse the document
        if (!row.document) return null;
        const doc = parseSchemaDoc(row.document);
        const entry = buildSchemaEntryImproved(row.schemaId, row.policyTopicId, doc);
        return entry;
    }
}

// ---------------------------------------------------------------------------
// Shared internal helpers
// ---------------------------------------------------------------------------

function unwrapValue(val: unknown): string {
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) {
        for (const item of val) {
            const s = unwrapValue(item);
            if (s) return s;
        }
        return '';
    }
    if (val && typeof val === 'object') {
        for (const v of Object.values(val as Record<string, unknown>)) {
            if (typeof v === 'string') {
                const s = v.trim();
                if (s && s.toLowerCase() !== 'not specified') return s;
            }
        }
        return '';
    }
    return String(val ?? '').trim();
}

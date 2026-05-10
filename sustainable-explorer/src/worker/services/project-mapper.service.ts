import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
    slugify,
    normalizeSector,
    resolveMethod,
    loadResolutionMaps,
    extractLatLng,
} from '../project-mapper/helpers';
import {
    extractLatLngStrings,
    extractSdgsFromText,
} from '../project-mapper/improved-heuristic.mapper';
import { PROJECT_EXTRACT_FIELDS } from '../project-mapper/project-fields';

/**
 * Per-VC project upsert service.
 *
 * Called from IpfsFetchProcessor when a VC-Document's IPFS content lands.
 * Drops the "project anchor schema" notion: every VC of every successfully-decoded
 * policy is processed, and contributes whatever fields its schema is mapped to
 * in the policy's cross-schema fieldMap (policy_decode_status.fieldMap).
 *
 * Project identity:
 *   - VCs that carry credentialSubject.id (regular project-data VCs): keyed by cs.id.
 *   - VCs without cs.id (MintToken, system VCs): attributed to the most recent
 *     prior cs.id in the same topicId. Acts as the credit source for that project.
 *
 * Merge strategy on conflict:
 *   - Descriptive fields (name, country, sector, …): COALESCE — first non-empty wins.
 *   - credits: SUM. Prefers MintToken amounts; falls back to emission_reduction.ER_y.
 *   - vcCount: incremented per VC.
 */
@Injectable()
export class ProjectMapperService {
    private readonly logger = new Logger(ProjectMapperService.name);

    constructor(private readonly dataSource: DataSource) {}

    async upsertProjectFromVc(messageConsensusTimestamp: string): Promise<void> {
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

        const rawType: string = String(cs['type'] ?? '');
        const vcSchemaUuid = rawType.split('&')[0].trim().replace(/^#/, '');
        const csId: string | null = typeof cs['id'] === 'string' ? cs['id'] : null;
        const isMintToken = vcSchemaUuid === 'MintToken';

        // Resolve the policy this VC belongs to.
        const policyTopicId = await this.resolvePolicyTopicId(vc.topicId);
        if (!policyTopicId) return;

        const pdsRows: Array<{
            status: string;
            fieldMap: Record<string, string> | null;
            registryDid: string | null;
            policyName: string | null;
        }> = await this.dataSource.query(
            `SELECT
                pds.status                   AS status,
                pds."fieldMap"               AS "fieldMap",
                ip.owner                     AS "registryDid",
                ip.options->>'name'          AS "policyName"
             FROM policy_decode_status pds
             LEFT JOIN message ip
                ON ip.type = 'Instance-Policy'
               AND ip.action = 'publish-policy'
               AND ip."topicId" = pds."policyTopicId"
             WHERE pds."policyTopicId" = $1
             LIMIT 1`,
            [policyTopicId],
        );
        if (pdsRows.length === 0 || pdsRows[0].status !== 'success') return;
        const pds = pdsRows[0];
        const crossSchemaFieldMap = pds.fieldMap ?? {};

        // ── Determine project key (cs.id, or look up recent cs.id for MintToken) ──
        let projectKey: string;
        if (csId) {
            projectKey = csId;
        } else if (isMintToken) {
            const ancestor = await this.findRecentCsIdInTopic(vc.topicId, vc.consensusTimestamp);
            if (!ancestor) {
                this.logger.debug(
                    `MintToken vc=${messageConsensusTimestamp} has no prior cs.id in topic=${vc.topicId}, skipping`,
                );
                return;
            }
            projectKey = ancestor;
        } else {
            // VC has neither cs.id nor is a MintToken — nothing to attribute to.
            return;
        }

        // ── Per-VC field extraction from cross-schema fieldMap ────────────────────
        // For each entry in PROJECT_EXTRACT_FIELDS, check if the cross-schema map
        // routes that field to *this* VC's schema. If so, extract the value at the
        // path. Otherwise skip — that field will land later from a sibling VC.
        const extracted: Record<string, string | null> = {};
        let geoLngLat: [number, number] | null = null;

        for (const field of PROJECT_EXTRACT_FIELDS) {
            const mapping = crossSchemaFieldMap[field.label];
            if (!mapping) continue;
            const firstDot = mapping.indexOf('.');
            if (firstDot < 0) continue;
            const targetSchemaId = mapping.slice(0, firstDot);
            const path = mapping.slice(firstDot + 1);
            if (targetSchemaId !== vcSchemaUuid) continue;

            const raw = getByPath(cs, path);
            if (field.key === 'geo') {
                geoLngLat = parseGeoValue(raw);
            } else {
                const s = unwrapValue(raw);
                if (s) extracted[field.key] = s;
            }
        }

        // Common credit sources (independent of fieldMap):
        //   1. MintToken.amount — preferred.
        //   2. credentialSubject.emission_reduction.ER_y on data VCs.
        let creditsToAdd = 0;
        if (isMintToken) {
            const amt = parseFloat(String(cs['amount'] ?? '0'));
            if (!isNaN(amt) && amt > 0) creditsToAdd = amt;
        } else {
            const er = cs['emission_reduction'] as Record<string, any> | undefined;
            if (er) {
                const ery = parseFloat(String(er['ER_y'] ?? '0'));
                if (!isNaN(ery) && ery > 0) creditsToAdd = ery;
            }
        }

        // SDGs / co-benefits — parse comma-separated SDG numbers, fall back to free text.
        let sdgs: number[] = [];
        let cobenefits: string | null = null;
        if (extracted['sdgOrCobenefits']) {
            const raw = extracted['sdgOrCobenefits']!;
            const tokens = raw.split(',').map(s => s.trim()).filter(Boolean);
            const allNumeric = tokens.length > 0 && tokens.every(t => /^\d+$/.test(t));
            sdgs = allNumeric ? tokens.map(Number).filter(n => n >= 1 && n <= 17) : extractSdgsFromText(raw);
            cobenefits = !allNumeric && raw ? raw : null;
        }

        // Crediting period (object {from, to}) — try the geo-path approach but our
        // current fieldMap stores only top-level keys. Fall back: scan cs values.
        let createdAt: string | null = extracted['vintageRaw'] ?? null;
        let creditingPeriodEnd: string | null = null;
        for (const v of Object.values(cs)) {
            if (v && typeof v === 'object' && !Array.isArray(v)
                && 'from' in (v as object) && 'to' in (v as object)) {
                const obj = v as Record<string, unknown>;
                if (typeof obj['from'] === 'string') createdAt = obj['from'] as string;
                if (typeof obj['to'] === 'string') creditingPeriodEnd = obj['to'] as string;
                break;
            }
        }
        const vintage = createdAt
            ? (createdAt.match(/\b(19|20)\d{2}\b/)?.[0] ?? null)
            : null;

        // Methodology / sector resolution.
        const developer = extracted['developer'] ?? '';
        const { maps, methodScopeMap } = await loadResolutionMaps(this.dataSource);
        const resolved = resolveMethod(vc.topicId, developer, maps);
        const methScopes = resolved.policyTopicId
            ? (methodScopeMap[resolved.policyTopicId] ?? [])
            : [];
        const sectoralScope = methScopes[0] ?? '';
        const rawSector = extracted['sector'] ?? '';
        const sector = normalizeSector(methScopes)
            || (rawSector ? normalizeSector([rawSector]) : '')
            || '';

        const lng = geoLngLat?.[0] ?? null;
        const lat = geoLngLat?.[1] ?? null;
        const name = extracted['name'] ?? null;
        const country = extracted['country'] ?? null;

        // Display name: VC-supplied name when present, else project key (so a row
        // exists even before the registration VC lands).
        const displayName = name ?? projectKey;

        // Build the businessData jsonb. Only set fields we have on this VC; the
        // upsert merges with existing values via COALESCE in the SQL.
        const newFields: Record<string, unknown> = {
            topicId: vc.topicId,
            policyTopicId,
            policyName: pds.policyName ?? resolved.name ?? null,
        };
        if (name) newFields.name = name;
        if (country) newFields.country = country;
        if (lat !== null && lng !== null) {
            newFields.lat = lat;
            newFields.lng = lng;
        }
        if (resolved.name) {
            newFields.methodology = resolved.name;
            newFields.methodologyId = slugify(resolved.name);
        }
        if (developer) newFields.developer = developer;
        if (vintage) newFields.vintage = vintage;
        if (sdgs.length > 0) newFields.sdgs = sdgs;
        if (cobenefits) newFields.cobenefits = cobenefits;
        if (extracted['scale']) newFields.scale = extracted['scale'];
        if (extracted['category']) newFields.category = extracted['category'];
        if (sector) newFields.sector = sector;
        if (sectoralScope) newFields.sectoralScope = sectoralScope;
        if (createdAt) newFields.createdAt = createdAt;
        if (creditingPeriodEnd) newFields.creditingPeriodEnd = creditingPeriodEnd;
        newFields.status = 'Issuing';

        const searchText = [
            name ?? '',
            developer,
            country ?? '',
            resolved.name ?? '',
            extracted['category'] ?? '',
            cobenefits ?? '',
        ].filter(Boolean).join(' ');

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
            ) VALUES ($1, 'PROJECT', $2, $3, $4,
                      jsonb_build_object('credits', $7::numeric, 'vcCount', 1) || $5::jsonb,
                      $6, $8,
                      EXTRACT(EPOCH FROM NOW())::bigint, NOW(), NOW())
            ON CONFLICT ("projectKey")
            WHERE "viewType" = 'PROJECT' AND "projectKey" IS NOT NULL
            DO UPDATE SET
                -- COALESCE for displayName: keep existing unless null/empty.
                "displayName"    = COALESCE(NULLIF(business_view."displayName", ''), EXCLUDED."displayName"),
                "registryDid"    = COALESCE(business_view."registryDid", EXCLUDED."registryDid"),
                "relatedTopicId" = COALESCE(business_view."relatedTopicId", EXCLUDED."relatedTopicId"),
                "businessData"   = (
                    -- Start with existing data; overlay with EXCLUDED's new fields
                    -- (which only contain non-null values from this VC); then
                    -- recompute credits/vcCount as SUM.
                    business_view."businessData" || EXCLUDED."businessData"
                ) || jsonb_build_object(
                    'credits',
                        COALESCE((business_view."businessData"->>'credits')::numeric, 0)
                      + $7::numeric,
                    'vcCount',
                        COALESCE((business_view."businessData"->>'vcCount')::int, 0) + 1
                ),
                "searchText"     = COALESCE(NULLIF(business_view."searchText", ''), EXCLUDED."searchText"),
                "lastUpdate"     = EXCLUDED."lastUpdate",
                "updatedAt"      = NOW()`,
            [
                vc.consensusTimestamp,
                displayName,
                resolved.registryDid || pds.registryDid || null,
                vc.topicId,
                JSON.stringify(newFields),
                searchText,
                creditsToAdd,
                projectKey,
            ],
        );

        this.logger.debug(
            `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} key=${projectKey} ` +
            `fields=[${Object.keys(extracted).join(',')}] credits=${creditsToAdd}`,
        );
    }

    /**
     * Walks the topic parent chain to find the policy (Instance-Policy publish-policy)
     * topic this VC belongs to. Up to 12 hops. Mirrors MessageProcessProcessor's lookup.
     */
    private async resolvePolicyTopicId(topicId: string): Promise<string | null> {
        let current: string | null = topicId;
        const visited = new Set<string>();

        for (let i = 0; i < 12; i++) {
            if (!current || visited.has(current)) break;
            visited.add(current);

            const policyDirect: Array<{ topicId: string }> = await this.dataSource.query(
                `SELECT "topicId" FROM message
                 WHERE type='Instance-Policy' AND action='publish-policy' AND "topicId"=$1
                 LIMIT 1`,
                [current],
            );
            if (policyDirect.length > 0) return current;

            const policyByInstance: Array<{ topicId: string }> = await this.dataSource.query(
                `SELECT "topicId" FROM message
                 WHERE type='Instance-Policy' AND action='publish-policy'
                   AND options->>'instanceTopicId'=$1
                 LIMIT 1`,
                [current],
            );
            if (policyByInstance.length > 0) return policyByInstance[0].topicId;

            const parentRow: Array<{ parent_id: string | null }> = await this.dataSource.query(
                `SELECT options->>'parentId' AS parent_id
                 FROM message WHERE type='Topic' AND "topicId"=$1 LIMIT 1`,
                [current],
            );
            current = parentRow[0]?.parent_id ?? null;
        }
        return null;
    }

    /**
     * For VCs that don't carry their own cs.id (MintToken, etc.), find the most
     * recent prior cs.id in the same topic to attribute the credits to.
     */
    private async findRecentCsIdInTopic(topicId: string, beforeTs: string): Promise<string | null> {
        const rows: Array<{ cs_id: string }> = await this.dataSource.query(
            `SELECT documents->'credentialSubject'->0->>'id' AS cs_id
             FROM message
             WHERE type='VC-Document'
               AND "topicId"=$1
               AND documents IS NOT NULL
               AND "consensusTimestamp" < $2
               AND documents->'credentialSubject'->0->>'id' IS NOT NULL
             ORDER BY "consensusTimestamp" DESC
             LIMIT 1`,
            [topicId, beforeTs],
        );
        return rows[0]?.cs_id ?? null;
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walks a dotted path against an object. Returns undefined if any segment is missing.
 */
function getByPath(obj: any, path: string): unknown {
    if (!path) return obj;
    return path.split('.').reduce<any>((cur, key) => (cur == null ? cur : cur[key]), obj);
}

/**
 * Coerces a raw VC field value into a [lng, lat] pair if possible.
 * Handles standard GeoJSON, array-of-GeoJSON (VM0047), and lat/lng-string blocks.
 */
function parseGeoValue(raw: unknown): [number, number] | null {
    let v: unknown = raw;
    if (Array.isArray(v) && v.length > 0) v = v[0];
    if (!v || typeof v !== 'object') return null;
    const obj = v as Record<string, any>;
    if ('type' in obj) {
        return extractLatLng(obj);
    }
    return extractLatLngStrings(obj);
}

/**
 * Flattens nested-dict / list-of-dict values to a single string.
 */
function unwrapValue(val: unknown): string {
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
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

import { DataSource } from 'typeorm';
import {
    PolicySchemaRepository,
    PolicySchemaListQuery,
    PolicySchemaListResult,
    PolicySchemaRow,
} from './policy-schema.repository';
import { DecodedMethodologyRow, PolicySchemaSummaryRow } from '../dto/decoded-methodology.dto';

export class PgPolicySchemaRepository extends PolicySchemaRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    /**
     * Lists schemas for a policy, synthesised from policy.rawSchemaJson.
     *
     * rawSchemaJson is `{iri: schemaDoc}`. Each entry is returned as a
     * PolicySchemaRow with the iri as schemaId and a generated schemaFile name.
     * Pagination, search, and sort operate in-memory on the extracted rows
     * (schema counts per policy are small — typically < 50).
     */
    async findByPolicyTopicId(
        policyTopicId: string,
        query: PolicySchemaListQuery,
    ): Promise<PolicySchemaListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const policyRows: Array<{
            policyTopicId: string;
            sourceCid: string;
            rawSchemaJson: Record<string, unknown> | null;
            createdAt: Date;
            updatedAt: Date;
        }> = await this.dataSource.query(
            `SELECT "policyTopicId", "sourceCid", "rawSchemaJson", "createdAt", "updatedAt"
             FROM policy
             WHERE "policyTopicId" = $1
               AND "decodeStatus" = 'decoded'
             ORDER BY "updatedAt" DESC NULLS LAST
             LIMIT 1`,
            [policyTopicId],
        );

        if (policyRows.length === 0) return { rows: [], total: 0 };

        const policyRow = policyRows[0];
        const rawSchemaJson = (policyRow.rawSchemaJson ?? {}) as Record<string, unknown>;

        let allRows: PolicySchemaRow[] = Object.entries(rawSchemaJson).map(([iri, schemaDoc]) => {
            const doc = (schemaDoc ?? {}) as Record<string, unknown>;
            const name = typeof doc['name'] === 'string' ? doc['name'] : null;
            const description = typeof doc['description'] === 'string' ? doc['description'] : null;
            const version = typeof doc['version'] === 'string' ? doc['version'] : '';
            const document = typeof doc['document'] === 'object' && doc['document'] !== null
                ? (doc['document'] as Record<string, unknown>)
                : null;

            return {
                id: iri,
                policyTopicId,
                messageConsensusTimestamp: null,
                sourceCid: policyRow.sourceCid,
                schemaFile: `schemas/${iri}.json`,
                schemaId: iri,
                schemaVersion: version,
                name,
                description,
                document,
                rawSchema: doc,
                lastUpdate: String(policyRow.createdAt.getTime()),
                isProjectSchema: null,
                createdAt: policyRow.createdAt,
                updatedAt: policyRow.updatedAt,
            } satisfies PolicySchemaRow;
        });

        // Search filter
        if (search) {
            const term = search.toLowerCase();
            allRows = allRows.filter(r =>
                r.schemaId.toLowerCase().includes(term) ||
                (r.name ?? '').toLowerCase().includes(term) ||
                (r.description ?? '').toLowerCase().includes(term),
            );
        }

        // Additional filters from query
        if (query.schemaId) {
            const term = query.schemaId.toLowerCase();
            allRows = allRows.filter(r => r.schemaId.toLowerCase().includes(term));
        }
        if (query.name) {
            const term = query.name.toLowerCase();
            allRows = allRows.filter(r => (r.name ?? '').toLowerCase().includes(term));
        }
        if (query.version) {
            const term = query.version.toLowerCase();
            allRows = allRows.filter(r => r.schemaVersion.toLowerCase().includes(term));
        }

        // Sort
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'name') {
            allRows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') * dir);
        } else {
            // Default: sort by schemaId
            allRows.sort((a, b) => a.schemaId.localeCompare(b.schemaId) * dir);
        }

        const total = allRows.length;
        const rows = allRows.slice(offset, offset + limit);

        return { rows, total };
    }

    /**
     * Returns the decode status and project schema config for a methodology.
     *
     * Returns null when the methodology does not exist in business_view at all
     * (caller should 404). When the methodology exists but there is no policy row,
     * the returned row has decodeStatus = 'unknown'.
     */
    async findDecoded(idFromUrl: string): Promise<DecodedMethodologyRow | null> {
        // Resolve policyTopicId from the business_view. The URL param is the
        // instance topic (relatedTopicId); policy is keyed by policyTopicId
        // (businessData->>'topicId').
        const lookup: Array<{ instance_topic: string; policy_topic: string | null }> =
            await this.dataSource.query(
                `SELECT
                    bv."relatedTopicId"            AS instance_topic,
                    bv."businessData"->>'topicId'  AS policy_topic
                 FROM business_view bv
                 WHERE bv."viewType" = 'METHODOLOGY'
                   AND (bv."relatedTopicId" = $1 OR bv."businessData"->>'topicId' = $1)
                 ORDER BY bv."sourceTimestamp"::numeric DESC NULLS LAST, bv.id DESC
                 LIMIT 1`,
                [idFromUrl],
            );
        if (lookup.length === 0) return null;
        const policyTopicId = lookup[0].policy_topic ?? idFromUrl;

        // Fetch the policy row. LEFT join via anchor subquery so we always get
        // a result even when the policy has never been attempted.
        const rows: Array<{
            decode_status: string | null;
            decode_error: string | null;
            attempts: number | null;
            last_attempt_at: string | null;
            policy_mapping: Record<string, unknown> | null;
            raw_schema_json: Record<string, unknown> | null;
            schema_fields: unknown;
            mapping_source: string | null;
        }> = await this.dataSource.query(
            `SELECT
                p."decodeStatus"    AS decode_status,
                p.error             AS decode_error,
                p.attempts          AS attempts,
                p."lastAttemptAt"   AS last_attempt_at,
                p."policyMapping"   AS policy_mapping,
                p."rawSchemaJson"   AS raw_schema_json,
                p."schemaFields"    AS schema_fields,
                p."mappingSource"   AS mapping_source
             FROM (SELECT $1::varchar AS topic_id) q
             LEFT JOIN LATERAL (
                -- Multiple policy rows can share a policyTopicId (one per
                -- published version). Prefer the latest decoded row; fall back
                -- to the most-recently-updated row of any status.
                SELECT *
                FROM policy
                WHERE "policyTopicId" = q.topic_id
                ORDER BY ("decodeStatus" = 'decoded') DESC NULLS LAST,
                         "updatedAt" DESC NULLS LAST
                LIMIT 1
             ) p ON TRUE
             LIMIT 1`,
            [policyTopicId],
        );

        const raw = rows[0];

        // Map decodeStatus: 'decoded' → 'success', others pass through.
        const rawStatus = raw?.decode_status;
        let decodeStatus: DecodedMethodologyRow['decodeStatus'] = 'unknown';
        if (rawStatus === 'decoded') {
            decodeStatus = 'success';
        } else if (rawStatus === 'pending' || rawStatus === 'failed') {
            decodeStatus = rawStatus;
        }

        // Build allSchemas from rawSchemaJson.
        // isProjectSchema = true for schemas that appear in a policyMapping entry
        // with isProjectSchema=true.
        const rawSchemaJson = (raw?.raw_schema_json ?? {}) as Record<string, unknown>;
        const policyMapping = (raw?.policy_mapping ?? {}) as Record<string, unknown[]>;

        const projectSchemaIris = new Set<string>();
        for (const entries of Object.values(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (!entry || typeof entry !== 'object') continue;
                const e = entry as Record<string, unknown>;
                if (e['isProjectSchema'] === true && typeof e['schemaIri'] === 'string') {
                    projectSchemaIris.add(e['schemaIri'] as string);
                }
            }
        }

        const allSchemas: PolicySchemaSummaryRow[] = Object.entries(rawSchemaJson).map(([iri, schemaDoc]) => {
            const doc = (schemaDoc ?? {}) as Record<string, unknown>;
            const name = typeof doc['name'] === 'string' ? doc['name'] : null;
            const description = typeof doc['description'] === 'string' ? doc['description'] : null;
            const document = typeof doc['document'] === 'object' && doc['document'] !== null
                ? (doc['document'] as Record<string, unknown>)
                : null;

            return {
                schemaId: iri,
                name,
                description,
                isProjectSchema: projectSchemaIris.has(iri),
                document,
            } satisfies PolicySchemaSummaryRow;
        });

        // Build projectSchemaConfig from policyMapping entries flagged isProjectSchema=true.
        // Pick the schema with the most isProjectSchema entries.
        let projectSchemaConfig: Record<string, unknown> | null = null;
        let projectSchemaId: string | null = null;
        let projectSchemaName: string | null = null;
        let projectSchemaDescription: string | null = null;

        const schemaScores = new Map<string, number>();
        for (const entries of Object.values(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (!entry || typeof entry !== 'object') continue;
                const e = entry as Record<string, unknown>;
                if (e['isProjectSchema'] === true && typeof e['schemaIri'] === 'string') {
                    const iri = e['schemaIri'] as string;
                    schemaScores.set(iri, (schemaScores.get(iri) ?? 0) + 1);
                }
            }
        }
        if (schemaScores.size > 0) {
            let best = 0;
            for (const [iri, score] of schemaScores) {
                if (score > best) {
                    best = score;
                    projectSchemaId = iri;
                }
            }
        }

        if (projectSchemaId) {
            const schemaDoc = rawSchemaJson[projectSchemaId];
            const doc = (schemaDoc ?? {}) as Record<string, unknown>;
            const innerDoc = typeof doc['document'] === 'object' && doc['document'] !== null
                ? (doc['document'] as Record<string, unknown>)
                : {};
            projectSchemaName = typeof doc['name'] === 'string' ? doc['name'] : null;
            projectSchemaDescription = typeof doc['description'] === 'string' ? doc['description'] : null;

            // policyMapping.fieldPath values are nested paths like
            // "project_details.field6" — we need fieldMap to be keyed by the
            // same shape so DecodedMethodologyResponseDto.buildResolvedField
            // can look them up. Walk one level of nested properties from
            // inline `properties`, array `items.properties`, and `$ref`
            // targets resolved through the policy's other schemas.
            const schemaPropsByUuid = new Map<string, Record<string, unknown>>();
            for (const [iri, doc] of Object.entries(rawSchemaJson)) {
                const m = iri.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                if (!m) continue;
                const docObj = (doc ?? {}) as Record<string, unknown>;
                const inner = typeof docObj['document'] === 'object' && docObj['document'] !== null
                    ? (docObj['document'] as Record<string, unknown>)
                    : {};
                const ip = inner['properties'];
                if (ip && typeof ip === 'object') {
                    schemaPropsByUuid.set(m[1], ip as Record<string, unknown>);
                }
            }
            const refToProps = (ref: string): Record<string, unknown> | null => {
                if (!ref) return null;
                const m = ref.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                const uuid = m?.[1];
                return uuid ? (schemaPropsByUuid.get(uuid) ?? null) : null;
            };

            const NESTED_SKIP_KEYS = new Set(['@context', 'type', 'id', 'coordinates']);
            const isGeoJsonDef = (def: Record<string, unknown>): boolean => {
                const ref = String(def['$ref'] ?? '');
                const itemsRef = String(((def['items'] ?? {}) as Record<string, unknown>)['$ref'] ?? '');
                const format = String(def['format'] ?? '').toLowerCase();
                const innerProps = (def['properties'] ?? {}) as Record<string, unknown>;
                return (
                    ref.includes('GeoJSON') ||
                    itemsRef.includes('GeoJSON') ||
                    format === 'geojson' || format === 'geo-json' ||
                    ('type' in innerProps && 'coordinates' in innerProps)
                );
            };

            const props = (innerDoc['properties'] ?? {}) as Record<string, unknown>;
            const fieldMap: Record<string, { title: string; description: string; isGeoJson: boolean }> = {};
            for (const [k, v] of Object.entries(props)) {
                if (!v || typeof v !== 'object') continue;
                const vr = v as Record<string, unknown>;
                const topIsGeoJson = isGeoJsonDef(vr);
                const topTitle = typeof vr['title'] === 'string' ? vr['title'] : k;
                fieldMap[k] = {
                    title: topTitle,
                    description: typeof vr['description'] === 'string' ? vr['description'] : '',
                    isGeoJson: topIsGeoJson,
                };

                // Geo containers don't expose user-pickable nested fields.
                if (topIsGeoJson) continue;

                const innerProps = (vr['properties'] ?? {}) as Record<string, unknown>;
                const itemsObj = (vr['items'] ?? {}) as Record<string, unknown>;
                const itemsInline = (itemsObj['properties'] ?? null) as Record<string, unknown> | null;
                const refTarget = refToProps(String(vr['$ref'] ?? ''));
                const itemsRefTarget = refToProps(String(itemsObj['$ref'] ?? ''));

                const nestedSources: Array<Record<string, unknown>> = [];
                if (Object.keys(innerProps).length > 0) nestedSources.push(innerProps);
                if (itemsInline && Object.keys(itemsInline).length > 0) nestedSources.push(itemsInline);
                if (itemsRefTarget) nestedSources.push(itemsRefTarget);
                if (refTarget) nestedSources.push(refTarget);

                for (const nestedProps of nestedSources) {
                    for (const [nestedKey, nestedDefRaw] of Object.entries(nestedProps)) {
                        if (NESTED_SKIP_KEYS.has(nestedKey)) continue;
                        if (!nestedDefRaw || typeof nestedDefRaw !== 'object') continue;
                        const nd = nestedDefRaw as Record<string, unknown>;
                        const childTitle = typeof nd['title'] === 'string' ? nd['title'] : nestedKey;
                        const path = `${k}.${nestedKey}`;
                        if (path in fieldMap) continue;
                        fieldMap[path] = {
                            title: `${topTitle} › ${childTitle}`,
                            description: typeof nd['description'] === 'string' ? nd['description'] : '',
                            isGeoJson: isGeoJsonDef(nd),
                        };
                    }
                }
            }

            // Build resolvedFields from policyMapping entries. Prefer entries
            // on the project schema itself, but fall back to entries from
            // ANY non-mintToken/standardRegistry schema. This lets users map
            // fields like `country` to a sub-schema field (e.g.,
            // "1.8 Project Location.projectSiteCountryarea") and still see
            // it as the resolved mapping in the editor.
            //
            // Each resolved value carries its `schemaIri` alongside the bare
            // `fieldPath` — two different schemas can (and do) share the same
            // fieldPath (e.g. both have a top-level "name" property), so the
            // schemaIri is required downstream (DecodedMethodologyResponseDto)
            // to look up the correct schema's title instead of colliding with
            // the dominant project schema's own field of the same name.
            const resolvedFields: Record<string, { fieldPath: string; schemaIri: string } | null> = {};
            for (const [fieldKey, entries] of Object.entries(policyMapping)) {
                if (!Array.isArray(entries)) continue;
                let primary: { fieldPath: string; schemaIri: string } | null = null;
                let fallback: { fieldPath: string; schemaIri: string } | null = null;
                for (const entry of entries) {
                    if (!entry || typeof entry !== 'object') continue;
                    const e = entry as Record<string, unknown>;
                    const schemaType = e['schemaType'];
                    if (schemaType === 'mintToken' || schemaType === 'standardRegistry') continue;
                    if (typeof e['fieldPath'] !== 'string' || typeof e['schemaIri'] !== 'string') continue;
                    const ref = { fieldPath: e['fieldPath'] as string, schemaIri: e['schemaIri'] as string };
                    if (ref.schemaIri === projectSchemaId) {
                        primary = ref;
                        break;
                    }
                    if (fallback === null) fallback = ref;
                }
                if (primary !== null) {
                    resolvedFields[fieldKey] = primary;
                } else if (fallback !== null) {
                    resolvedFields[fieldKey] = fallback;
                }
            }

            // Determine geoKey: prefer manual override from policyMapping['geo'],
            // then auto-detect first isGeoJson field in the project schema.
            let geoKey = '';
            const geoEntries = Array.isArray(policyMapping['geo']) ? policyMapping['geo'] : [];
            let geoPrimary: string | null = null;
            let geoFallback: string | null = null;
            for (const entry of geoEntries) {
                if (!entry || typeof entry !== 'object') continue;
                const e = entry as Record<string, unknown>;
                const schemaType = e['schemaType'];
                if (schemaType === 'mintToken' || schemaType === 'standardRegistry') continue;
                if (typeof e['fieldPath'] !== 'string') continue;
                if (e['schemaIri'] === projectSchemaId) {
                    geoPrimary = e['fieldPath'] as string;
                    break;
                }
                if (geoFallback === null) geoFallback = e['fieldPath'] as string;
            }
            geoKey = geoPrimary ?? geoFallback ?? '';
            if (!geoKey) {
                for (const [k, v] of Object.entries(fieldMap)) {
                    if (v.isGeoJson) { geoKey = k; break; }
                }
            }

            projectSchemaConfig = { geoKey, section: null, fieldMap, resolvedFields };
        }

        return {
            policyTopicId,
            decodeStatus,
            decodeError: decodeStatus === 'success' ? null : (raw?.decode_error ?? null),
            attempts: raw?.attempts ?? 0,
            lastAttemptAt: raw?.last_attempt_at ?? null,
            mappingSource: raw?.mapping_source === 'manual' ? 'manual' : 'auto',
            schemaId: projectSchemaId,
            schemaName: projectSchemaName,
            schemaDescription: projectSchemaDescription,
            projectSchemaConfig,
            allSchemas,
            schemaFields: Array.isArray(raw?.schema_fields) ? raw!.schema_fields as Array<{
                path: string;
                title: string;
                description?: string;
                type?: string;
                isGeoJson?: boolean;
                schemaIri: string;
            }> : [],
        };
    }
}

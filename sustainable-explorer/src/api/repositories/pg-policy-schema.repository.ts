import { DataSource } from 'typeorm';
import {
    PolicySchemaRepository,
    PolicySchemaListQuery,
    PolicySchemaListResult,
    PolicySchemaRow,
} from './policy-schema.repository';
import { QueryBuilder } from './query-builder';
import { POLICY_SCHEMA_FIELD_SCHEMA } from './schemas/policy-schema.schema';
import { DecodedMethodologyRow, PolicySchemaSummaryRow } from '../dto/decoded-methodology.dto';

export class PgPolicySchemaRepository extends PolicySchemaRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findByPolicyTopicId(
        policyTopicId: string,
        query: PolicySchemaListQuery,
    ): Promise<PolicySchemaListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(POLICY_SCHEMA_FIELD_SCHEMA);
        builder.addFilter('ps."policyTopicId"', 'eq', policyTopicId);
        builder.addFilters({
            schemaId: query.schemaId,
            name: query.name,
            description: query.description,
            sourceCid: query.sourceCid,
            version: query.version,
        });

        if (search) {
            const likeParam = builder.nextParam(`%${search.trim()}%`);
            builder.addClause(`(
                ps."schemaId" ILIKE ${likeParam}
                OR ps.name ILIKE ${likeParam}
                OR ps.description ILIKE ${likeParam}
            )`);
        }

        const orderBy = builder.buildOrderBy({
            sortBy,
            sortDir,
            defaultExpr: 'ps."createdAt" DESC NULLS LAST',
        });

        const whereSql = builder.getWhereClause();
        const params = builder.getParams();

        const limitParam = `$${params.length + 1}`;
        const offsetParam = `$${params.length + 2}`;
        const rowParams = [...params, limit, offset];

        const rowsSql = `
            SELECT
                ps.id,
                ps."policyTopicId",
                ps."messageConsensusTimestamp",
                ps."sourceCid",
                ps."schemaFile",
                ps."schemaId",
                ps."schemaVersion",
                ps.name,
                ps.description,
                ps.document,
                ps."rawSchema",
                ps."lastUpdate",
                ps."createdAt",
                ps."updatedAt"
            FROM policy_schema ps
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM policy_schema ps
            WHERE ${whereSql}
        `;

        const [rows, countResult]: [PolicySchemaRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, rowParams),
            this.dataSource.query(countSql, params),
        ]);

        return {
            rows,
            total: countResult[0]?.total ?? 0,
        };
    }

    /**
     * Returns the decode status and resolved project schema config for a single
     * methodology identified by its policy topic ID.
     *
     * Returns null when the methodology does not exist in business_view at all
     * (caller should 404). When the methodology exists but there is no
     * policy_decode_status row, the returned row has decodeStatus = 'unknown'.
     */
    async findDecoded(idFromUrl: string): Promise<DecodedMethodologyRow | null> {
        // The frontend passes the methodology's `relatedTopicId` (the instance
        // topic) in the URL, but policy_decode_status and policy_schema are
        // keyed by the policy topic (businessData->>'topicId'). Resolve the
        // policy topic here, falling back to a direct match for callers that
        // already pass a policy topic ID.
        const lookup: Array<{ instance_topic: string; policy_topic: string | null }> =
            await this.dataSource.query(
                `SELECT
                    bv."relatedTopicId"            AS instance_topic,
                    bv."businessData"->>'topicId'  AS policy_topic
                 FROM business_view bv
                 WHERE bv."viewType" = 'METHODOLOGY'
                   AND (bv."relatedTopicId" = $1 OR bv."businessData"->>'topicId' = $1)
                 LIMIT 1`,
                [idFromUrl],
            );
        if (lookup.length === 0) return null;
        const policyTopicId = lookup[0].policy_topic ?? idFromUrl;

        // Join policy_decode_status (LEFT so we get a row even when not yet decoded)
        // with the confirmed project schema from policy_schema (keyed by projectSchemaId).
        // All decode-derived data (projectFieldMap, projectGeoKey/Section, schemaLabelMap)
        // now lives on policy_decode_status rather than policy_schema.projectSchemaConfig.
        const rows: Array<{
            decode_status: string | null;
            decode_error: string | null;
            attempts: number | null;
            last_attempt_at: string | null;
            project_schema_id: string | null;
            project_field_map: Record<string, string | null> | null;
            project_geo_key: string | null;
            project_geo_section: string | null;
            schema_label_map: Record<string, unknown> | null;
            field_map: Record<string, unknown> | null;
            schema_name: string | null;
            schema_description: string | null;
            schema_document: Record<string, unknown> | null;
            project_schema_config: Record<string, unknown> | null;
        }> = await this.dataSource.query(
            `SELECT
                pds.status               AS decode_status,
                pds.error                AS decode_error,
                pds.attempts             AS attempts,
                pds."lastAttemptAt"      AS last_attempt_at,
                pds."projectSchemaId"    AS project_schema_id,
                pds."projectFieldMap"    AS project_field_map,
                pds."projectGeoKey"      AS project_geo_key,
                pds."projectGeoSection"  AS project_geo_section,
                pds."schemaLabelMap"     AS schema_label_map,
                pds."fieldMap"           AS field_map,
                ps.name                  AS schema_name,
                ps.description           AS schema_description,
                ps.document              AS schema_document,
                ps."projectSchemaConfig" AS project_schema_config
             FROM (SELECT $1::varchar AS topic_id) q
             LEFT JOIN policy_decode_status pds
                 ON pds."policyTopicId" = q.topic_id
             LEFT JOIN policy_schema ps
                 ON ps."schemaId" = pds."projectSchemaId"
                AND ps."policyTopicId" = q.topic_id
             LIMIT 1`,
            [policyTopicId],
        );

        const raw = rows[0];

        // raw will always exist because of the (SELECT $1 AS topic_id) anchor,
        // but decode_status is null when there is no policy_decode_status row.
        const rawStatus = raw?.decode_status;
        let decodeStatus: DecodedMethodologyRow['decodeStatus'] = 'unknown';
        if (rawStatus === 'success' || rawStatus === 'failed' || rawStatus === 'pending') {
            decodeStatus = rawStatus;
        }

        // Build projectSchemaConfig in the format expected by DecodedMethodologyResponseDto.fromRow.
        // Prefer the decode-time data from policy_decode_status; fall back to the stored
        // projectSchemaConfig on policy_schema for backwards compatibility.
        let projectSchemaConfig: Record<string, unknown> | null = null;
        if (raw?.project_schema_id) {
            const geoKey = raw.project_geo_key ?? '';
            // Get fieldMap from projectSchemaConfig stored on policy_schema (has FieldDef shape)
            const storedConfig = raw.project_schema_config ?? {};
            const fieldMap = (storedConfig['fieldMap'] as Record<string, unknown>) ?? {};

            // If fieldMap is empty, try to reconstruct from schema document properties
            let resolvedFieldMap = fieldMap;
            if (Object.keys(resolvedFieldMap).length === 0 && raw.schema_document) {
                const doc = (raw.schema_document ?? {}) as Record<string, any>;
                const props = (doc['properties'] ?? {}) as Record<string, any>;
                resolvedFieldMap = {};
                for (const [k, v] of Object.entries(props)) {
                    if (v && typeof v === 'object') {
                        resolvedFieldMap[k] = {
                            title: typeof v['title'] === 'string' ? v['title'] : k,
                            description: typeof v['description'] === 'string' ? v['description'] : '',
                            isGeoJson: false,
                        };
                    }
                }
            }

            // resolvedFields comes from projectFieldMap on policy_decode_status
            const resolvedFields = raw.project_field_map ?? (storedConfig['resolvedFields'] as Record<string, unknown> | undefined);

            projectSchemaConfig = {
                geoKey,
                section: raw.project_geo_section ?? storedConfig['section'] ?? null,
                fieldMap: resolvedFieldMap,
                resolvedFields: resolvedFields ?? null,
            };
        }

        // All schemas imported for this policy — used by the API to surface
        // decoded info even when no project schema was confirmed.
        const allSchemas: PolicySchemaSummaryRow[] = await this.dataSource.query(
            `SELECT
                "schemaId"        AS "schemaId",
                name              AS name,
                description       AS description,
                "isProjectSchema" AS "isProjectSchema",
                document          AS document
             FROM policy_schema
             WHERE "policyTopicId" = $1
             ORDER BY "createdAt" ASC`,
            [policyTopicId],
        );

        return {
            policyTopicId,
            decodeStatus,
            decodeError: raw?.decode_error ?? null,
            attempts: raw?.attempts ?? 0,
            lastAttemptAt: raw?.last_attempt_at ?? null,
            schemaId: raw?.project_schema_id ?? null,
            schemaName: raw?.schema_name ?? null,
            schemaDescription: raw?.schema_description ?? null,
            projectSchemaConfig,
            allSchemas,
        };
    }
}

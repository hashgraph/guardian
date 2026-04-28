import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DataSource } from "typeorm";
import Redis from "ioredis";
import { QUEUE_NAMES } from "@shared/config/bullmq.config";

/**
 * Mapping from HCS message types to business domain view types.
 *
 * Note on methodologies: Guardian publishes a draft "Policy" message and a
 * canonical "Instance-Policy" message (with action='PublishPolicy'). The
 * existing Guardian indexer treats Instance-Policy as the canonical
 * methodology entity. We mirror that here by mapping ONLY Instance-Policy
 * messages to METHODOLOGY view rows.
 *
 * Note on projects: VC-Document messages are NOT handled here. Project rows
 * are built separately in buildProjectViews() because they require
 * multi-message aggregation, geo-coordinate deduplication, and methodology
 * resolution that cannot be expressed in a single INSERT … SELECT.
 */
const TYPE_MAPPINGS: Record<string, string> = {
    'Instance-Policy': 'METHODOLOGY',
    'Standard Registry': 'REGISTRY',
    'Token': 'CREDIT',
};

/**
 * Resolve the methodology name and registry DID for a VC by walking the topic
 * parent chain up to 12 hops. Checks instance-topic map first, then
 * policy-topic map, then user-topic map (with fuzzy developer-name matching
 * as a tie-breaker when multiple policies exist under the same user topic).
 */
type MethodEntry = { name: string; registryDid: string; policyTopicId: string };

function resolveMethod(
    topicId: string,
    developer: string,
    maps: {
        instToMethod: Record<string, MethodEntry>;
        policyTopicToMethod: Record<string, MethodEntry>;
        parentMap: Record<string, string>;
        userMethods: Record<string, MethodEntry[]>;
    },
): MethodEntry {
    let tid: string | undefined = topicId;
    const visited: string[] = [];
    for (let i = 0; i < 12; i++) {
        if (!tid) break;
        if (maps.instToMethod[tid]) return maps.instToMethod[tid];
        if (maps.policyTopicToMethod[tid]) return maps.policyTopicToMethod[tid];
        visited.push(tid);
        tid = maps.parentMap[tid];
    }
    for (const anc of visited) {
        const cands = maps.userMethods[anc] ?? [];
        if (cands.length > 0) {
            const devLower = developer.toLowerCase();
            for (const c of cands) {
                if (c.name && devLower.includes(c.name.toLowerCase())) return c;
            }
            if (cands.length === 1) return cands[0];
        }
    }
    return { name: '', registryDid: '', policyTopicId: '' };
}

/**
 * Converts a string to a URL-safe slug.
 */
function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const SECTOR_KEYWORD_MAP: Array<{ sector: string; keywords: string[] }> = [
    { sector: 'Energy', keywords: ['energy'] },
    { sector: 'Transport', keywords: ['transport'] },
    { sector: 'Waste', keywords: ['waste'] },
    {
        sector: 'Nature Based Solutions',
        keywords: [
            'afforestation', 'reforestation', 'redd', 'forest', 'agriculture',
            'land use', 'blue carbon', 'wetland', 'coastal', 'marine',
            'grassland', 'peatland', 'restoration',
        ],
    },
    {
        sector: 'Industrial Process',
        keywords: [
            'manufacturing', 'chemical', 'construction', 'mining',
            'metal', 'fugitive', 'solvent', 'industrial',
        ],
    },
];

function normalizeSector(inputs: string[]): string {
    for (const input of inputs) {
        const lower = input.toLowerCase();
        for (const { sector, keywords } of SECTOR_KEYWORD_MAP) {
            if (keywords.some(kw => lower.includes(kw))) return sector;
        }
    }
    return inputs.length > 0 ? 'Others' : '';
}

// ---------------------------------------------------------------------------
// Schema-first GeoJSON detection helpers
// ---------------------------------------------------------------------------

type FieldDef = { title: string; isGeoJson: boolean };

type SchemaEntry = {
    schemaUuid: string;
    policyTopicId: string;
    geoKey: string;
    section: string | null;   // wrapper key like 'project_details', or null if top-level
    fieldMap: Record<string, FieldDef>;
};

function parseSchemaDoc(doc: unknown): Record<string, any> {
    if (!doc) return {};
    if (typeof doc === 'string') {
        try { return JSON.parse(doc); } catch { return {}; }
    }
    return typeof doc === 'object' ? (doc as Record<string, any>) : {};
}

function findGeoJsonDefKey(doc: Record<string, any>): string | null {
    const defs = doc['$defs'] ?? doc['definitions'] ?? {};
    for (const [k, v] of Object.entries(defs)) {
        if (v && typeof v === 'object') {
            const props = (v as any).properties ?? {};
            if ('type' in props && 'coordinates' in props) return k;
        }
    }
    return null;
}

function isGeoJsonProperty(fdef: Record<string, any>, geoDefKey?: string | null): boolean {
    const ref: string = fdef['$ref'] ?? '';
    // Guardian uses "#GeoJSON" (non-standard) — check string directly
    if (ref && ref.includes('GeoJSON')) return true;
    if (geoDefKey && ref.includes(geoDefKey)) return true;
    if (['geojson', 'geo-json'].includes((fdef['format'] ?? '').toLowerCase())) return true;
    const props = fdef['properties'] ?? {};
    if ('type' in props && 'coordinates' in props) return true;
    for (const key of ['oneOf', 'anyOf'] as const) {
        for (const item of (fdef[key] ?? []) as Record<string, any>[]) {
            if (isGeoJsonProperty(item, geoDefKey)) return true;
        }
    }
    const comment: string = fdef['$comment'] ?? '';
    if (typeof comment === 'string' && comment.replace(/\s/g, '').includes('"customType":"geo"')) return true;
    return false;
}

/**
 * GeoJSON standard is [lng, lat], but some Guardian VCs store [lat, lng].
 * If the second element exceeds ±90 (impossible latitude) and the first does not,
 * the pair is [lat, lng] — swap it to canonical [lng, lat].
 */
function normaliseLngLat(c: [number, number]): [number, number] {
    if (Math.abs(c[1]) > 90 && Math.abs(c[0]) <= 90) return [c[1], c[0]];
    return c;
}

/**
 * Extracts a representative [lng, lat] pair from any GeoJSON geometry.
 * Point → coordinates directly.
 * Polygon / MultiLineString → centroid of the first ring.
 * MultiPolygon → centroid of the first polygon's outer ring.
 * LineString / MultiPoint → midpoint coordinate.
 */
function extractLatLng(geo: Record<string, any>): [number, number] | null {
    const type: string = geo['type'] ?? '';
    const coords: unknown = geo['coordinates'];

    if (type === 'Point') {
        const c = coords as number[];
        if (!Array.isArray(c) || c.length < 2) return null;
        return normaliseLngLat([c[0], c[1]]);
    }

    if (type === 'LineString' || type === 'MultiPoint') {
        const ring = coords as number[][];
        if (!Array.isArray(ring) || ring.length === 0) return null;
        const mid = ring[Math.floor(ring.length / 2)];
        if (!Array.isArray(mid) || mid.length < 2) return null;
        return normaliseLngLat([mid[0], mid[1]]);
    }

    if (type === 'Polygon' || type === 'MultiLineString') {
        const rings = coords as number[][][];
        if (!Array.isArray(rings) || rings.length === 0) return null;
        const c = ringCentroid(rings[0]);
        return c ? normaliseLngLat(c) : null;
    }

    if (type === 'MultiPolygon') {
        const polys = coords as number[][][][];
        if (!Array.isArray(polys) || polys.length === 0) return null;
        const c = ringCentroid(polys[0][0]);
        return c ? normaliseLngLat(c) : null;
    }

    return null;
}

function ringCentroid(ring: number[][]): [number, number] | null {
    if (!Array.isArray(ring) || ring.length === 0) return null;
    let sumLng = 0, sumLat = 0, count = 0;
    for (const pt of ring) {
        if (Array.isArray(pt) && pt.length >= 2) {
            sumLng += pt[0];
            sumLat += pt[1];
            count++;
        }
    }
    return count > 0 ? [sumLng / count, sumLat / count] : null;
}

/**
 * Builds a SchemaEntry for a schema document.
 * Handles two layout shapes:
 *   Shape A — GeoJSON field is directly in doc.properties
 *   Shape B — GeoJSON field is one level deeper inside a wrapper property (e.g. project_details)
 * Returns null if no GeoJSON field is found.
 */
function buildSchemaEntry(
    schemaUuid: string,
    policyTopicId: string,
    doc: Record<string, any>,
): SchemaEntry | null {
    const geoDefKey = findGeoJsonDefKey(doc);
    const topProps: Record<string, any> = doc['properties'] ?? {};

    // Shape A — GeoJSON at top level
    for (const [fk, fdef] of Object.entries(topProps)) {
        if (fdef && typeof fdef === 'object' && isGeoJsonProperty(fdef as Record<string, any>, geoDefKey)) {
            const fieldMap: Record<string, FieldDef> = {};
            for (const [k, v] of Object.entries(topProps)) {
                if (v && typeof v === 'object') {
                    fieldMap[k] = {
                        title: (v as any).title ?? k,
                        isGeoJson: isGeoJsonProperty(v as Record<string, any>, geoDefKey),
                    };
                }
            }
            return { schemaUuid, policyTopicId, geoKey: fk, section: null, fieldMap };
        }
    }

    // Shape B — GeoJSON one level deeper (handles credentialSubject / project_details wrapper)
    for (const [wrapKey, wrapDef] of Object.entries(topProps)) {
        if (!wrapDef || typeof wrapDef !== 'object') continue;
        const nested: Record<string, any> = (wrapDef as any).properties ?? {};
        for (const [fk, fdef] of Object.entries(nested)) {
            if (fdef && typeof fdef === 'object' && isGeoJsonProperty(fdef as Record<string, any>, geoDefKey)) {
                const fieldMap: Record<string, FieldDef> = {};
                for (const [k, v] of Object.entries(nested)) {
                    if (v && typeof v === 'object') {
                        fieldMap[k] = {
                            title: (v as any).title ?? k,
                            isGeoJson: isGeoJsonProperty(v as Record<string, any>, geoDefKey),
                        };
                    }
                }
                return { schemaUuid, policyTopicId, geoKey: fk, section: wrapKey, fieldMap };
            }
        }
    }

    return null;
}

/**
 * Returns true only when a schema has a GeoJSON field DIRECTLY in its top-level
 * properties (Shape A). Shape B schemas — where GeoJSON is nested one level deeper
 * inside a wrapper property like project_details — return false.
 *
 * This distinction is used for project-schema confirmation: wrapper/form schemas
 * that embed a project sub-schema also declare GeoJSON (via their nested
 * properties), which would create false ambiguity if we counted them. Only the
 * leaf "Project Details" schema has a direct Shape A declaration and should count
 * toward the "exactly 1 GeoJSON schema per methodology" check.
 */
function hasDirectGeoJson(doc: Record<string, any>): boolean {
    const geoDefKey = findGeoJsonDefKey(doc);
    const topProps: Record<string, any> = doc['properties'] ?? {};
    for (const fdef of Object.values(topProps)) {
        if (fdef && typeof fdef === 'object' &&
            isGeoJsonProperty(fdef as Record<string, any>, geoDefKey)) {
            return true;
        }
    }
    return false;
}

/**
 * Finds the first field in fieldMap whose title contains any of the given keywords
 * (case-insensitive) and whose value in subject is non-empty.
 */
function findFieldByTitle(
    subject: Record<string, any>,
    fieldMap: Record<string, FieldDef>,
    ...keywords: string[]
): string {
    for (const [fk, fd] of Object.entries(fieldMap)) {
        const titleLower = fd.title.toLowerCase();
        if (keywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
            const val = subject[fk];
            if (val !== null && val !== undefined) {
                const s = String(val).trim();
                if (s) return s;
            }
        }
    }
    return '';
}

/**
 * Like findFieldByTitle but also accepts a list of words that must NOT appear
 * in the field title. Useful to avoid false matches (e.g. "participant country").
 */
function findFieldByTitleExcluding(
    subject: Record<string, any>,
    fieldMap: Record<string, FieldDef>,
    keywords: string[],
    exclude: string[],
): string {
    for (const [fk, fd] of Object.entries(fieldMap)) {
        const titleLower = fd.title.toLowerCase();
        if (
            keywords.some(kw => titleLower.includes(kw.toLowerCase())) &&
            !exclude.some(ex => titleLower.includes(ex.toLowerCase()))
        ) {
            const val = subject[fk];
            if (val !== null && val !== undefined) {
                const s = String(val).trim();
                if (s) return s;
            }
        }
    }
    return '';
}

@Processor(QUEUE_NAMES.BUSINESS_VIEW_BUILD)
export class BusinessViewBuilderProcessor extends WorkerHost {
    private readonly logger = new Logger(BusinessViewBuilderProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @Inject("REDICT_PUB") private readonly redis: Redis,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        this.logger.log("Building business views from raw messages...");

        const caseClauses = Object.entries(TYPE_MAPPINGS)
            .map(
                ([msgType, viewType]) =>
                    `WHEN m.type = '${msgType}' THEN '${viewType}'`,
            )
            .join(" ");
        const typeFilter = Object.keys(TYPE_MAPPINGS)
            .map((t) => `'${t}'`)
            .join(", ");

        const result = await this.dataSource.query(`
            INSERT INTO business_view (
                "sourceTimestamp",
                "viewType",
                "displayName",
                "registryDid",
                "relatedTopicId",
                "businessData",
                "searchText",
                "lastUpdate",
                "createdAt",
                "updatedAt"
            )
            SELECT
                m."consensusTimestamp",
                CASE ${caseClauses} END,
                COALESCE(
                    m.options->>'name',
                    m.options->>'tokenName',
                    CASE WHEN m.type = 'Standard Registry' THEN (
                        SELECT vc.documents -> 'credentialSubject' -> 0 ->> 'OrganizationName'
                        FROM message vc
                        WHERE vc."topicId" = m.options->>'topicId'
                          AND vc.type = 'VC-Document'
                          AND vc.documents -> 'credentialSubject' -> 0 ->> 'OrganizationName' IS NOT NULL
                        ORDER BY vc."consensusTimestamp" DESC
                        LIMIT 1
                    ) END
                ),
                COALESCE(m.owner, m.options->>'did'),
                CASE
                    WHEN m.type = 'Instance-Policy' THEN m.options->>'instanceTopicId'
                    WHEN m.type = 'Token'           THEN m."topicId"
                    ELSE m.options->>'topicId'
                END,
                jsonb_build_object(
                    'description', m.options->>'description',
                    'status', m.status,
                    'topicId', m."topicId",
                    'tokenId', COALESCE(m.options->>'tokenId', tc."tokenId"),
                    'owner', m.owner,
                    'options', m.options,
                    'documents', m.documents
                ),
                -- searchText: concatenation of all searchable fields. Picked up
                -- by the searchVector tsvector generated column for full-text search.
                CONCAT_WS(' ',
                    m.options->>'name',
                    m.options->>'description',
                    m.options->>'tags',
                    m.options->>'geography',
                    m.options->>'law',
                    m.options->>'tokenName',
                    m.options->>'tokenSymbol',
                    m.owner
                ),
                EXTRACT(EPOCH FROM NOW())::bigint,
                NOW(),
                NOW()
            FROM message m
            LEFT JOIN token_cache tc
                ON tc."tokenId" = m.options->>'tokenId'
            WHERE m.type IN (${typeFilter})
              -- For Instance-Policy, only canonical 'publish-policy' actions
              -- count as a real methodology. Other types pass through.
              AND (m.type != 'Instance-Policy' OR m.action = 'publish-policy')
            ON CONFLICT ("sourceTimestamp", "viewType") DO UPDATE SET
                "displayName"    = COALESCE(EXCLUDED."displayName", business_view."displayName"),
                "registryDid"    = EXCLUDED."registryDid",
                "relatedTopicId" = EXCLUDED."relatedTopicId",
                "lastUpdate"     = EXCLUDED."lastUpdate",
                "updatedAt"      = NOW()
        `);

        const totalUpserted = result?.rowCount ?? result?.length ?? 0;

        await this.buildProjectViews();

        await this.redis.publish(
            "se:events",
            JSON.stringify({
                type: "business-views-updated",
                totalUpserted,
                timestamp: new Date().toISOString(),
            }),
        );

        this.logger.log(
            `Business views built: ${totalUpserted} records upserted`,
        );
    }

    /**
     * Builds PROJECT rows in business_view from VC-Document messages whose
     * credentialSubject type UUID matches a confirmed project-registration schema
     * (i.e. a schema from policy_schema that is the ONLY schema in its
     * methodology with a GeoJSON field). Field names are resolved from the
     * schema's JSON-Schema title annotations — no hardcoded field positions.
     */
    private async buildProjectViews(): Promise<void> {
        this.logger.log("Building project views from VC-Document messages...");

        // Step A — per methodology, confirm the ONE schema that declares a GeoJSON field.
        // Exactly 1 GeoJSON schema per policy topic → confirmed project registration schema.
        // 0 or >1 → skip that methodology entirely (no fallback to raw VC scanning).
        const allSchemaRows: Array<{
            schemaId: string;
            policyTopicId: string;
            document: unknown;
        }> = await this.dataSource.query(`
            SELECT "schemaId", "policyTopicId", document
            FROM policy_schema
            WHERE "schemaId" IS NOT NULL AND document IS NOT NULL
        `);

        // Confirmation uses Shape A only: a schema counts toward the "exactly 1"
        // check only if its GeoJSON field is directly in top-level properties.
        // Wrapper/form schemas that embed a project sub-schema also declare GeoJSON
        // one level deeper (Shape B), which would otherwise create false ambiguity.
        const directGeoByTopic = new Map<string, SchemaEntry[]>();
        for (const row of allSchemaRows) {
            const doc = parseSchemaDoc(row.document);
            if (!hasDirectGeoJson(doc)) continue;          // Shape B → skip for confirmation
            const entry = buildSchemaEntry(row.schemaId, row.policyTopicId, doc);
            if (!entry) continue;
            const list = directGeoByTopic.get(row.policyTopicId) ?? [];
            list.push(entry);
            directGeoByTopic.set(row.policyTopicId, list);
        }

        // Confirmed: exactly 1 direct-GeoJSON schema per policy topic
        const confirmedByTopic = new Map<string, SchemaEntry>();  // policyTopicId → entry
        const confirmedTopics = new Set<string>();
        for (const [topicId, entries] of directGeoByTopic) {
            if (entries.length === 1) {
                confirmedByTopic.set(topicId, entries[0]);
                confirmedTopics.add(topicId);
            }
        }

        if (confirmedTopics.size === 0) {
            this.logger.warn('No confirmed project schemas found in policy_schema — no project views built.');
            await this.dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
            return;
        }

        this.logger.log(`Confirmed project schemas: ${confirmedTopics.size}`);

        // Step B — build sibling-schema map: every schema on a confirmed policy topic
        // whose structure allows us to extract GeoJSON coordinates from a VC.
        // Three shapes are handled:
        //   Shape A — GeoJSON directly in top-level properties (confirmed leaf schema)
        //   Shape B — GeoJSON one level deeper inside a wrapper property
        //   Shape C — wrapper property is $ref to the confirmed (Shape A) schema UUID;
        //             the fieldMap/geoKey is borrowed from the confirmed entry with the
        //             wrapper property name as the section.
        //
        // Shape C covers the Guardian pattern where the project registration VC carries
        // the UUID of a form wrapper schema whose project_details property references the
        // leaf schema via $ref rather than inlining the field definitions.
        const siblingSchemaMap = new Map<string, SchemaEntry>(); // schemaUuid → entry
        for (const row of allSchemaRows) {
            if (!confirmedTopics.has(row.policyTopicId)) continue;
            const doc = parseSchemaDoc(row.document);

            // Shape A or B
            const entry = buildSchemaEntry(row.schemaId, row.policyTopicId, doc);
            if (entry) {
                siblingSchemaMap.set(row.schemaId, entry);
                continue;
            }

            // Shape C — look for wrapper properties whose $ref points to the confirmed schema
            const confirmedEntry = confirmedByTopic.get(row.policyTopicId)!;
            const topProps: Record<string, any> = doc['properties'] ?? {};
            for (const [wrapKey, wrapDef] of Object.entries(topProps)) {
                if (!wrapDef || typeof wrapDef !== 'object') continue;
                const ref: string = (wrapDef as Record<string, any>)['$ref'] ?? '';
                if (ref && ref.includes(confirmedEntry.schemaUuid)) {
                    siblingSchemaMap.set(row.schemaId, {
                        schemaUuid: row.schemaId,
                        policyTopicId: row.policyTopicId,
                        geoKey: confirmedEntry.geoKey,
                        section: wrapKey,
                        fieldMap: confirmedEntry.fieldMap,
                    });
                    break;
                }
            }
        }

        const acceptableUuids = Array.from(siblingSchemaMap.keys());
        const projectVcs: Array<{
            consensusTimestamp: string;
            topicId: string;
            documents: Record<string, any>;
        }> = await this.dataSource.query(`
            SELECT "consensusTimestamp", "topicId", documents
            FROM message
            WHERE type = 'VC-Document'
              AND documents IS NOT NULL
              AND split_part(
                    documents -> 'credentialSubject' -> 0 ->> 'type',
                    '&', 1
                  ) = ANY($1)
            ORDER BY "consensusTimestamp"
        `, [acceptableUuids]);

        if (projectVcs.length === 0) {
            await this.dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
            this.logger.log('No project VCs found matching confirmed schemas; cleared stale PROJECT rows.');
            return;
        }

        // Step C — fetch methodology resolution maps (unchanged)
        const [instPolicies, parentRows]: [
            Array<{
                instance_topic: string | null;
                policy_topic: string;
                policy_name: string | null;
                registry_did: string | null;
            }>,
            Array<{ topicId: string; parent_id: string | null }>,
        ] = await Promise.all([
            this.dataSource.query(`
                SELECT
                    options->>'instanceTopicId' AS instance_topic,
                    "topicId"                   AS policy_topic,
                    options->>'name'            AS policy_name,
                    owner                       AS registry_did
                FROM message
                WHERE type = 'Instance-Policy' AND action = 'publish-policy'
            `),
            this.dataSource.query(`
                SELECT "topicId", options->>'parentId' AS parent_id
                FROM message
                WHERE type = 'Topic' AND options->>'parentId' IS NOT NULL
            `),
        ]);

        const instToMethod: Record<string, MethodEntry> = {};
        const policyTopicToMethod: Record<string, MethodEntry> = {};
        const parentMap: Record<string, string> = {};
        const userMethods: Record<string, MethodEntry[]> = {};

        for (const r of instPolicies) {
            const entry: MethodEntry = {
                name: r.policy_name ?? '',
                registryDid: r.registry_did ?? '',
                policyTopicId: r.policy_topic,
            };
            if (r.instance_topic) instToMethod[r.instance_topic] = entry;
            if (r.policy_topic) policyTopicToMethod[r.policy_topic] = entry;
        }
        for (const r of parentRows) {
            if (r.parent_id) parentMap[r.topicId] = r.parent_id;
        }
        for (const r of instPolicies) {
            const ut = r.policy_topic ? parentMap[r.policy_topic] : undefined;
            if (ut) {
                if (!userMethods[ut]) userMethods[ut] = [];
                userMethods[ut].push({
                    name: r.policy_name ?? '',
                    registryDid: r.registry_did ?? '',
                    policyTopicId: r.policy_topic,
                });
            }
        }

        const maps = { instToMethod, policyTopicToMethod, parentMap, userMethods };

        // Step D — sectoralScopes map from METHODOLOGY rows (unchanged)
        const methScopeRows: Array<{ topicId: string; sectoralScopes: unknown }> =
            await this.dataSource.query(`
                SELECT
                    "businessData"->>'topicId'       AS "topicId",
                    "businessData"->'sectoralScopes' AS "sectoralScopes"
                FROM business_view
                WHERE "viewType" = 'METHODOLOGY'
                  AND "businessData"->>'topicId' IS NOT NULL
                  AND "businessData"->'sectoralScopes' IS NOT NULL
            `);

        const methodScopeMap: Record<string, string[]> = {};
        for (const row of methScopeRows) {
            if (!row.topicId) continue;
            try {
                const parsed = typeof row.sectoralScopes === 'string'
                    ? JSON.parse(row.sectoralScopes)
                    : row.sectoralScopes;
                if (Array.isArray(parsed)) {
                    methodScopeMap[row.topicId] = parsed.filter(
                        (s): s is string => typeof s === 'string',
                    );
                }
            } catch { /* ignore malformed */ }
        }

        // Step F — deduplicate and build project records
        type ProjectRecord = {
            key: string;
            sourceTimestamp: string;
            topicId: string;
            policyTopicId: string;
            name: string;
            country: string | null;
            lat: number;
            lng: number;
            methodology: string;
            methodologyId: string;
            registryDid: string | null;
            developer: string;
            credits: number;
            vintage: string | null;
            createdAt: string | null;
            creditingPeriodEnd: string | null;
            cobenefits: string | null;
            sdgs: number[];
            scale: string | null;
            category: string | null;
            sector: string;
            sectoralScope: string;
            vcCount: number;
        };

        const projectMap = new Map<string, ProjectRecord>();

        for (const vc of projectVcs) {
            const docs = vc.documents as Record<string, any>;
            const cs = Array.isArray(docs.credentialSubject)
                ? (docs.credentialSubject[0] as Record<string, any>)
                : null;
            if (!cs) continue;

            // Resolve schema entry from the VC's type UUID
            const rawType: string = cs['type'] ?? '';
            const vcUuid = rawType.split('&')[0].trim().replace(/^#/, '');
            const schemaEntry = siblingSchemaMap.get(vcUuid);
            if (!schemaEntry) continue;

            // Subject is either directly cs (Shape A) or cs[section] (Shape B)
            const subject: Record<string, any> | null = schemaEntry.section
                ? (cs[schemaEntry.section] as Record<string, any> | null) ?? null
                : cs;
            if (!subject || typeof subject !== 'object') continue;

            // Extract a representative coordinate from any GeoJSON geometry type
            const geoVal = subject[schemaEntry.geoKey] as Record<string, any> | undefined;
            if (!geoVal || typeof geoVal !== 'object' || !('type' in geoVal)) continue;

            const lngLat = extractLatLng(geoVal);
            if (!lngLat) continue;

            const lng = lngLat[0];
            const lat = lngLat[1];

            // Field extraction via schema title keywords — no hardcoded positions
            const fm = schemaEntry.fieldMap;

            const name = findFieldByTitle(subject, fm, 'project name', 'name', 'title');
            if (!name) continue;

            // Exclude "participant country" / "applicant country" — those hold the
            // developer's home country, not the project host country.
            const country = findFieldByTitleExcluding(subject, fm, ['country'], ['participant', 'applicant']);
            const developer = findFieldByTitle(subject, fm,
                'developer', 'proponent', 'organization', 'project developer', 'applicant');
            const category = findFieldByTitle(subject, fm, 'category', 'project type');
            const scale = findFieldByTitle(subject, fm, 'scale', 'project scale');
            const rawSector = findFieldByTitle(subject, fm, 'sector', 'activity');
            const vintageRaw = findFieldByTitle(subject, fm, 'start date', 'commencement');

            // Crediting period — find field whose title contains "crediting period"
            let createdAt: string | null = null;
            let creditingPeriodEnd: string | null = null;
            for (const [fk, fd] of Object.entries(fm)) {
                if (fd.title.toLowerCase().includes('crediting period')) {
                    const f = subject[fk];
                    if (f && typeof f === 'object') {
                        createdAt = typeof f['from'] === 'string' ? f['from'] : null;
                        creditingPeriodEnd = typeof f['to'] === 'string' ? f['to'] : null;
                    }
                    break;
                }
            }
            if (!createdAt) createdAt = vintageRaw || null;
            const vintage: string | null = (createdAt ?? vintageRaw)?.slice(0, 4) ?? null;

            // SDGs when all-numeric tokens, else cobenefits
            const field25Key = Object.entries(fm).find(([, fd]) =>
                fd.title.toLowerCase().includes('co-benefit') ||
                fd.title.toLowerCase().includes('sustainable') ||
                fd.title.toLowerCase().includes('sdg')
            )?.[0];
            const field25Raw = field25Key ? String(subject[field25Key] ?? '').trim() : '';
            const field25Tokens = field25Raw.split(',').map(s => s.trim()).filter(Boolean);
            const allNumeric = field25Tokens.length > 0 && field25Tokens.every(t => /^\d+$/.test(t));
            const sdgs: number[] = allNumeric
                ? field25Tokens.map(Number).filter(n => n >= 1 && n <= 17)
                : [];
            const cobenefits: string | null = !allNumeric && field25Raw ? field25Raw : null;

            // emission_reduction
            const emissionReduction = cs['emission_reduction'] as Record<string, any> | undefined;
            const erY = emissionReduction
                ? parseFloat(String(emissionReduction['ER_y'] ?? '0'))
                : 0;
            const creditsToAdd = erY > 0 ? erY : 0;

            const resolved = resolveMethod(vc.topicId, developer, maps);

            const methScopes = resolved.policyTopicId
                ? (methodScopeMap[resolved.policyTopicId] ?? [])
                : [];
            const sectoralScope = methScopes[0] ?? '';
            const sector = normalizeSector(methScopes)
                || (rawSector ? normalizeSector([rawSector]) : '')
                || '';

            const dedupKey = `${name}|${Math.round(lat * 10000) / 10000}|${Math.round(lng * 10000) / 10000}`;

            const existing = projectMap.get(dedupKey);
            if (!existing) {
                projectMap.set(dedupKey, {
                    key: dedupKey,
                    sourceTimestamp: vc.consensusTimestamp,
                    topicId: vc.topicId,
                    policyTopicId: resolved.policyTopicId,
                    name,
                    country: country || null,
                    lat,
                    lng,
                    methodology: resolved.name,
                    methodologyId: slugify(resolved.name),
                    registryDid: resolved.registryDid || null,
                    developer,
                    credits: creditsToAdd,
                    vintage,
                    createdAt,
                    creditingPeriodEnd,
                    cobenefits,
                    sdgs,
                    scale: scale || null,
                    category: category || null,
                    sector,
                    sectoralScope,
                    vcCount: 1,
                });
            } else {
                existing.credits += creditsToAdd;
                existing.vcCount += 1;
                if (!existing.methodology && resolved.name) {
                    existing.methodology = resolved.name;
                    existing.methodologyId = slugify(resolved.name);
                    existing.registryDid = resolved.registryDid || null;
                    existing.policyTopicId = resolved.policyTopicId;
                }
            }
        }

        // Step G — upsert each project row and delete stale PROJECT rows (unchanged)
        const validTimestamps: string[] = [];

        for (const proj of projectMap.values()) {
            const businessData = {
                name: proj.name,
                country: proj.country,
                lat: proj.lat,
                lng: proj.lng,
                methodology: proj.methodology,
                methodologyId: proj.methodologyId,
                developer: proj.developer,
                credits: proj.credits,
                status: 'Issuing',
                vintage: proj.vintage,
                sdgs: proj.sdgs,
                cobenefits: proj.cobenefits,
                scale: proj.scale,
                category: proj.category,
                sector: proj.sector,
                sectoralScope: proj.sectoralScope,
                createdAt: proj.createdAt,
                creditingPeriodEnd: proj.creditingPeriodEnd,
                topicId: proj.topicId,
                policyTopicId: proj.policyTopicId,
                vcCount: proj.vcCount,
            };

            const searchText = [
                proj.name,
                proj.developer,
                proj.country ?? '',
                proj.methodology,
                proj.category ?? '',
                proj.cobenefits ?? '',
            ]
                .filter(Boolean)
                .join(' ');

            await this.dataSource.query(
                `
                INSERT INTO business_view (
                    "sourceTimestamp",
                    "viewType",
                    "displayName",
                    "registryDid",
                    "relatedTopicId",
                    "businessData",
                    "searchText",
                    "lastUpdate",
                    "createdAt",
                    "updatedAt"
                ) VALUES ($1, 'PROJECT', $2, $3, $4, $5, $6, EXTRACT(EPOCH FROM NOW())::bigint, NOW(), NOW())
                ON CONFLICT ("sourceTimestamp", "viewType") DO UPDATE SET
                    "displayName"    = EXCLUDED."displayName",
                    "registryDid"    = EXCLUDED."registryDid",
                    "relatedTopicId" = EXCLUDED."relatedTopicId",
                    "businessData"   = EXCLUDED."businessData",
                    "searchText"     = EXCLUDED."searchText",
                    "lastUpdate"     = EXCLUDED."lastUpdate",
                    "updatedAt"      = NOW()
                `,
                [
                    proj.sourceTimestamp,
                    proj.name,
                    proj.registryDid,
                    proj.topicId,
                    JSON.stringify(businessData),
                    searchText,
                ],
            );

            validTimestamps.push(proj.sourceTimestamp);
        }

        if (validTimestamps.length > 0) {
            const placeholders = validTimestamps.map((_, i) => `$${i + 1}`).join(', ');
            await this.dataSource.query(
                `DELETE FROM business_view WHERE "viewType" = 'PROJECT' AND "sourceTimestamp" NOT IN (${placeholders})`,
                validTimestamps,
            );
        } else {
            await this.dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
        }

        this.logger.log(
            `Project views built: ${projectMap.size} project(s) upserted from ${projectVcs.length} VC(s).`,
        );
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job, error: Error): void {
        this.logger.error(
            `Business view builder job ${job.id} failed: ${error.message}`,
            error.stack,
        );
    }
}

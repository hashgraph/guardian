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
function resolveMethod(
    topicId: string,
    developer: string,
    maps: {
        instToMethod: Record<string, { name: string; registryDid: string }>;
        policyTopicToMethod: Record<string, { name: string; registryDid: string }>;
        parentMap: Record<string, string>;
        userMethods: Record<string, Array<{ name: string; registryDid: string }>>;
    },
): { name: string; registryDid: string } {
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
    return { name: '', registryDid: '' };
}

/**
 * Converts a string to a URL-safe slug.
 */
function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
                COALESCE(m.options->>'name', m.options->>'tokenName'),
                COALESCE(m.owner, m.options->>'did'),
                CASE
                    WHEN m.type = 'Instance-Policy' THEN m.options->>'instanceTopicId'
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
                "registryDid" = EXCLUDED."registryDid",
                "relatedTopicId" = EXCLUDED."relatedTopicId",
                "lastUpdate" = EXCLUDED."lastUpdate",
                "updatedAt" = NOW()
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
     * Builds PROJECT rows in business_view from VC-Document messages that
     * carry geo-coordinates. Each unique (name, lat, lng) tuple produces one
     * row. Methodology and registry are resolved by walking the topic parent
     * chain so that multiple VC versions of the same project collapse into a
     * single, up-to-date row.
     */
    private async buildProjectViews(): Promise<void> {
        this.logger.log("Building project views from VC-Document messages...");

        // Step A — fetch all project VCs that contain a Point geometry
        const projectVcs: Array<{
            consensusTimestamp: string;
            topicId: string;
            documents: Record<string, any>;
        }> = await this.dataSource.query(`
            SELECT "consensusTimestamp", "topicId", documents
            FROM message
            WHERE type = 'VC-Document'
              AND documents IS NOT NULL
              AND documents::text LIKE '%"Point"%'
              AND documents -> 'credentialSubject' -> 0 -> 'project_details' -> 'field6' ->> 'type' = 'Point'
            ORDER BY "consensusTimestamp"
        `);

        if (projectVcs.length === 0) {
            // Remove any stale PROJECT rows if there are no project VCs
            await this.dataSource.query(
                `DELETE FROM business_view WHERE "viewType" = 'PROJECT'`,
            );
            this.logger.log("No project VCs found; cleared stale PROJECT rows.");
            return;
        }

        // Step B — fetch methodology resolution maps
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

        // Step C — build resolution maps
        const instToMethod: Record<string, { name: string; registryDid: string }> = {};
        const policyTopicToMethod: Record<string, { name: string; registryDid: string }> = {};
        const parentMap: Record<string, string> = {};
        const userMethods: Record<string, Array<{ name: string; registryDid: string }>> = {};

        for (const r of instPolicies) {
            if (r.instance_topic) {
                instToMethod[r.instance_topic] = {
                    name: r.policy_name ?? '',
                    registryDid: r.registry_did ?? '',
                };
            }
            if (r.policy_topic) {
                policyTopicToMethod[r.policy_topic] = {
                    name: r.policy_name ?? '',
                    registryDid: r.registry_did ?? '',
                };
            }
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
                });
            }
        }

        const maps = { instToMethod, policyTopicToMethod, parentMap, userMethods };

        // Step F — deduplicate and build project records
        // Key: name|lat(4dp)|lng(4dp) — collapses multiple VC versions of the same project
        type ProjectRecord = {
            key: string;
            sourceTimestamp: string;
            topicId: string;
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
            cobenefits: string | null;
            category: string | null;
            sector: string | null;
            vcCount: number;
        };

        const projectMap = new Map<string, ProjectRecord>();

        for (const vc of projectVcs) {
            const docs = vc.documents as Record<string, any>;
            const cs = Array.isArray(docs.credentialSubject)
                ? (docs.credentialSubject[0] as Record<string, any>)
                : null;
            if (!cs) continue;

            const pd = cs['project_details'] as Record<string, any> | undefined;
            if (!pd) continue;

            const geoField = pd['field6'] as Record<string, any> | undefined;
            if (!geoField || geoField['type'] !== 'Point') continue;

            const coords = geoField['coordinates'] as [number, number] | undefined;
            if (!Array.isArray(coords) || coords.length < 2) continue;

            const lat = coords[1] as number;
            const lng = coords[0] as number;
            const name: string = typeof pd['field0'] === 'string' ? pd['field0'] : '';

            if (!name) continue;

            const dedupKey = `${name}|${Math.round(lat * 10000) / 10000}|${Math.round(lng * 10000) / 10000}`;

            // country: field12 is always the country name; field11 is address in MECD schema
            const country: string | null =
                typeof pd['field12'] === 'string' && pd['field12']
                    ? pd['field12']
                    : typeof pd['field11'] === 'string' && pd['field11']
                      ? pd['field11']
                      : null;

            const developer: string = typeof pd['field8'] === 'string' ? pd['field8'] : '';
            const vintageRaw: string = typeof pd['field20'] === 'string' ? pd['field20'] : '';
            const vintage: string | null = vintageRaw ? vintageRaw.slice(0, 4) : null;

            const createdAt: string | null =
                pd['field28'] && typeof (pd['field28'] as Record<string, any>)['from'] === 'string'
                    ? (pd['field28'] as Record<string, any>)['from']
                    : vintageRaw || null;

            const cobenefits: string | null =
                typeof pd['field25'] === 'string' && pd['field25'] ? pd['field25'] : null;

            const category: string | null =
                typeof pd['field1'] === 'string' && pd['field1'] ? pd['field1'] : null;

            const sector: string | null =
                typeof pd['field2'] === 'string' && pd['field2'] ? pd['field2'] : null;

            // ER_y from emission_reduction — only count if > 1
            const emissionReduction = cs['emission_reduction'] as Record<string, any> | undefined;
            const erY = emissionReduction
                ? parseFloat(String(emissionReduction['ER_y'] ?? '0'))
                : 0;
            const creditsToAdd = erY > 1 ? erY : 0;

            const resolved = resolveMethod(vc.topicId, developer, maps);

            const existing = projectMap.get(dedupKey);
            if (!existing) {
                projectMap.set(dedupKey, {
                    key: dedupKey,
                    sourceTimestamp: vc.consensusTimestamp,
                    topicId: vc.topicId,
                    name,
                    country,
                    lat,
                    lng,
                    methodology: resolved.name,
                    methodologyId: slugify(resolved.name),
                    registryDid: resolved.registryDid || null,
                    developer,
                    credits: creditsToAdd,
                    vintage,
                    createdAt,
                    cobenefits,
                    category,
                    sector,
                    vcCount: 1,
                });
            } else {
                // Accumulate credits; keep earliest consensusTimestamp; bump vc count
                existing.credits += creditsToAdd;
                existing.vcCount += 1;
                // Freshen methodology resolution if we got a better match
                if (!existing.methodology && resolved.name) {
                    existing.methodology = resolved.name;
                    existing.methodologyId = slugify(resolved.name);
                    existing.registryDid = resolved.registryDid || null;
                }
            }
        }

        // Step G — upsert each project row and then delete stale PROJECT rows
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
                sdgs: [] as number[],
                cobenefits: proj.cobenefits,
                category: proj.category,
                sector: proj.sector,
                sectoralScope: '',
                createdAt: proj.createdAt,
                topicId: proj.topicId,
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

        // Targeted cleanup: remove PROJECT rows whose source timestamp is no
        // longer represented in the current VC set (e.g. after a re-index).
        if (validTimestamps.length > 0) {
            const placeholders = validTimestamps.map((_, i) => `$${i + 1}`).join(', ');
            await this.dataSource.query(
                `DELETE FROM business_view WHERE "viewType" = 'PROJECT' AND "sourceTimestamp" NOT IN (${placeholders})`,
                validTimestamps,
            );
        } else {
            await this.dataSource.query(
                `DELETE FROM business_view WHERE "viewType" = 'PROJECT'`,
            );
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

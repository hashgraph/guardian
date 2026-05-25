import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
    slugify,
    normalizeSector,
    resolveMethod,
    loadResolutionMaps,
    extractLatLng,
    resolveCountryName,
} from '../project-mapper/helpers';
import {
    extractLatLngStrings,
    extractSdgsFromText,
} from '../project-mapper/improved-heuristic.mapper';
import { PROJECT_EXTRACT_FIELDS } from '../project-mapper/project-fields';
import { isNonProjectCsType } from '../project-mapper/non-project-credential';
import { ReverseGeoService } from './reverse-geo.service';

/**
 * Per-VC project upsert service.
 *
 * Called from IpfsFetchProcessor when a VC-Document's IPFS content lands.
 * Resolves the owning policy via `message.policyId → policy.policyId` (a single
 * indexed join) instead of the old 12-hop topic-parent walk. VCs without a stamped
 * policyId (MintToken, StandardRegistry) are skipped via early return.
 *
 * Project identity:
 *   - VCs that carry credentialSubject.id (regular project-data VCs): keyed by cs.id.
 *   - VCs without cs.id: skipped (MintToken handling is separate in the credit pipeline).
 *
 * Merge strategy on conflict:
 *   - Descriptive fields (name, country, sector, …): COALESCE — first non-empty wins.
 *   - credits: SUM. Prefers MintToken amounts; falls back to emission_reduction.ER_y.
 *   - vcCount: incremented per VC.
 */
@Injectable()
export class ProjectMapperService {
    private readonly logger = new Logger(ProjectMapperService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly reverseGeoService: ReverseGeoService,
    ) {}

    async upsertProjectFromVc(messageConsensusTimestamp: string): Promise<void> {
        const rows: Array<{
            consensusTimestamp: string;
            topicId: string;
            policyId: string | null;
            documents: Record<string, unknown>;
        }> = await this.dataSource.query(
            `SELECT "consensusTimestamp", "topicId", "policyId", documents
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

        // Skip content-level types that are never projects (role assignments,
        // registry profiles, mint receipts, etc.). Done BEFORE the policyId
        // check so these legitimately-policyless VCs skip silently instead of
        // tripping the "no policy id" warning below.
        if (isNonProjectCsType(rawType)) {
            this.logger.debug(
                `vc=${messageConsensusTimestamp} type=${rawType} is a non-project credential — skipping`,
            );
            return;
        }

        // A project VC missing a policyId IS unexpected — the policy decoder
        // couldn't link this VC to its owning policy. Warn so it surfaces.
        if (!vc.policyId) {
            this.logger.warn(
                `vc=${messageConsensusTimestamp} type=${rawType} has no policyId — cannot resolve owning policy`,
            );
            return;
        }

        
        // Resolve the policy row.
        //   Fast path : modern policies serialize Guardian's _id into policy.json.id
        //               and VCs carry the same value as credentialSubject[0].policyId,
        //               so a direct policyId join hits in one round trip.
        //   Fallback  : older policies never wrote that _id into the zip, so
        //               policy.policyId is NULL (or holds the legacy `policyTag`).
        //               In that case walk the topic-parent chain to find the
        //               policyTopicId, pick the version active when the VC was
        //               minted, and backfill its policyId so subsequent VCs from
        //               the same policy hit the fast path.
        let policyRows = await this.queryPolicyByPolicyId(vc.policyId);

        if (policyRows.length === 0) {
            const resolved = await this.findPolicyVersionByTopicWalk(vc.topicId, vc.consensusTimestamp);
            if (resolved) {
                await this.dataSource.query(
                    `UPDATE policy
                     SET "policyId" = $1, "updatedAt" = now()
                     WHERE "sourceCid" = $2 AND ("policyId" IS NULL OR "policyId" LIKE 'Tag_%')`,
                    [vc.policyId, resolved.sourceCid],
                );
                policyRows = await this.queryPolicyByPolicyId(vc.policyId);
            }
        }
        if (policyRows.length === 0 || policyRows[0].decodeStatus !== 'decoded') return;

        const policyRow = policyRows[0];
        const { policyTopicId, instanceTopicId } = policyRow;
        const policyMapping = (policyRow.policyMapping ?? {}) as Record<string, Array<{
            source: string;
            schemaIri?: string;
            schemaType?: string;
            fieldPath?: string;
            isProjectSchema?: boolean;
            score?: number;
        }>>;

        // Build the cross-schema field map from policyMapping entries.
        // For each project extract field, pick the highest-scoring entry whose
        // schemaType is NOT 'mintToken' or 'standardRegistry' and whose schemaIri
        // suffix matches this VC's schema UUID. Prefer entries flagged
        // isProjectSchema=true so a downstream verification/monitoring VC
        // can't poison the project's country / name / etc. with its own
        // host_countries[].country (the root cause of "US, India" appearing
        // on projects whose project schema doesn't even define country).
        const crossSchemaFieldMap: Record<string, string> = {};
        for (const [fieldKey, entries] of Object.entries(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            let fallback: string | null = null;
            for (const entry of entries) {
                if (entry.schemaType === 'mintToken' || entry.schemaType === 'standardRegistry') continue;
                if (entry.source !== 'schema' || !entry.schemaIri || !entry.fieldPath) continue;
                const schemaUuidFromIri = entry.schemaIri.split('&')[0].trim().replace(/^#/, '');
                if (schemaUuidFromIri !== vcSchemaUuid) continue;
                if (entry.isProjectSchema === true) {
                    crossSchemaFieldMap[fieldKey] = entry.fieldPath;
                    fallback = null;
                    break;
                }
                if (fallback === null) fallback = entry.fieldPath;
            }
            if (!(fieldKey in crossSchemaFieldMap) && fallback !== null) {
                crossSchemaFieldMap[fieldKey] = fallback;
            }
        }

        // Every other contributing VC must carry a cs.id.
        if (!csId) return;

        // Project identity comes from content-level links carried by the VC:
        //
        //   - `cs.ref` (when present) is an intra-policy pointer to the
        //     project's identifying DID. Monitoring / verification / emissions
        //     VCs use it to attach to their parent project, regardless of how
        //     the HCS relationship graph branches.
        //   - On the project schema's own VCs, `cs.id` IS the project's DID.
        //     Multiple registration VCs for the same logical project share
        //     this DID even when issued by different signers.
        //
        // Non-project schemas with neither cs.ref nor isProjectSchema status
        // (e.g. VVB / Validator / Verifier registration VCs) do not seed a
        // project row — they're standalone entities, not project artifacts.
        const csRef = typeof cs['ref'] === 'string' ? (cs['ref'] as string).trim() : '';

        // Does THIS VC's schema look like THE project schema for its policy?
        // The decode pipeline flags one schema per policy as isProjectSchema=true
        // across its mapping entries — we mirror that lookup here. Also track
        // whether the policy as a whole has *any* project-schema classification,
        // so we can be strict in the non-project branch below for classified
        // policies and permissive (legacy walk) for unclassified ones.
        let isProjectSchemaVc = false;
        let policyHasProjectSchemaClassification = false;
        for (const entries of Object.values(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (entry?.isProjectSchema !== true || !entry.schemaIri) continue;
                policyHasProjectSchemaClassification = true;
                const schemaUuidFromIri = entry.schemaIri.split('&')[0].trim().replace(/^#/, '');
                if (schemaUuidFromIri === vcSchemaUuid) {
                    isProjectSchemaVc = true;
                }
            }
        }

        let projectKey: string;
        if (csRef) {
            // Downstream VC pointing at a parent VC's cs.id via `cs.ref`.
            // That parent may itself carry a `cs.ref` (multi-hop chains
            // happen when registration / monitoring / verification VCs each
            // reference the previous one). Walk hop-by-hop to the chain root
            // — its cs.id is the project's canonical identity. Using the raw
            // `cs.ref` here would split one project into N rows (one per
            // intermediate parent).
            const refWalked = await this.resolveProjectKeyViaRef(vc.consensusTimestamp, csId);
            projectKey = refWalked?.projectKey ?? csRef;
        } else if (isProjectSchemaVc) {
            // Project registration VC. A single logical project sometimes has
            // MULTIPLE project-schema VCs in the same topic with different
            // cs.id values (re-registration, DID rotation, replay during
            // testing). To collapse them, find the cs.id of the LATEST
            // project-schema VC of the same schema in this topic and use it
            // as the canonical projectKey for every project-schema VC in the
            // topic — regardless of whether this VC's own cs.id matches.
            //
            // The query is bounded by topicId (indexed) and is a single round
            // trip per VC. No JSONB cross-join, no N² scan.
            const canonical = await this.findCanonicalProjectSchemaCsIdInTopic(
                vc.topicId, vcSchemaUuid,
            );
            projectKey = canonical ?? csId;
        } else if (policyHasProjectSchemaClassification) {
            // Strict mode for classified policies: the decode pipeline knows
            // which schema is the project schema, and this VC isn't on it
            // (handled above) and carries no `cs.ref` to one. Therefore it's
            // not a project artifact — drop without consulting the relationship
            // walk. The walk would otherwise happily return another non-project
            // ancestor's cs.id (e.g. a VVB chain that walks to another VVB),
            // seeding a phantom row.
            this.logger.debug(
                `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} not project schema, ` +
                `no cs.ref; policy has a classified project schema → skipping`,
            );
            return;
        } else {
            // Legacy / unclassified policy. Try the relationship walk for
            // policies whose schemas weren't classified (older decodes or
            // schemas that don't carry isProjectSchema markers). If that
            // doesn't find an ancestor project, drop this VC.
            const resolved =
                await this.resolveProjectKeyViaRelationships(vc.consensusTimestamp, csId);

            if (!resolved.walked) {
                if (resolved.hadRelationships) {
                    this.logger.debug(
                        `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} has relationships but no VC parent → skipping`,
                    );
                    return;
                }
                if (await this.isDownstreamTopic(vc.topicId)) {
                    this.logger.debug(
                        `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} in downstream topic ${vc.topicId} with no relationships → skipping`,
                    );
                    return;
                }
                this.logger.debug(
                    `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} is not a project schema and carries no ref/ancestor → skipping`,
                );
                return;
            }
            projectKey = resolved.projectKey;
        }

        // ── Per-VC field extraction from policyMapping ───────────────────────────
        // crossSchemaFieldMap[fieldKey] = fieldPath (only entries for this VC's
        // schema are included, filtered above). Extract each mapped field from cs.
        const extracted: Record<string, string | null> = {};
        let geoLngLat: [number, number] | null = null;

        for (const field of PROJECT_EXTRACT_FIELDS) {
            const path = crossSchemaFieldMap[field.key];
            if (!path) continue;

            const raw = getByPath(cs, path);
            if (field.key === 'geo') {
                geoLngLat = parseGeoValue(raw);
            } else {
                const s = unwrapValue(raw);
                if (s) extracted[field.key] = s;
            }
        }

        // Credits sourced from this VC's emission_reduction.ER_y when present.
        // MintToken-driven crediting is intentionally not handled here — it
        // would require linking the MintToken to a project, which is done by
        // the credit query, not the project mapper.
        let creditsToAdd = 0;
        {
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
        let creditingPeriodStart: string | null = extracted['creditingPeriodStart'] ?? null;
        let creditingPeriodEnd: string | null = null;
        for (const v of Object.values(cs)) {
            if (v && typeof v === 'object' && !Array.isArray(v)
                && 'from' in (v as object) && 'to' in (v as object)) {
                const obj = v as Record<string, unknown>;
                if (typeof obj['from'] === 'string') {
                    createdAt = obj['from'] as string;
                    if (!creditingPeriodStart) creditingPeriodStart = obj['from'] as string;
                }
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
        // Country sanity check + single-value invariant.
        //
        // `unwrapValue` comma-joins array results (used for SDG/cobenefits etc.),
        // which produces strings like "US, India" when a VC has multiple
        // `locations[].country`. The dashboard country field is single-valued
        // (one marker, one cell), so we take the FIRST non-empty token and
        // store the rest in `countries[]` for future multi-country UI work.
        // The 200-char guard still rejects mis-mapped narrative paragraphs.
        const rawCountry = extracted['country'];
        let countries: string[] = [];
        if (rawCountry && rawCountry.length <= 200) {
            countries = rawCountry
                .split(',')
                .map(s => resolveCountryName(s.trim()))
                .filter(s => s.length > 0);
        }
        let country = countries[0] ?? null;

        // Geo fallback: if no country was extracted from the schema but the VC
        // carries valid coordinates, derive the country via point-in-polygon
        // against bundled country borders. Lets us fill in country for
        // methodologies whose project schema has no country field (or whose
        // mapping was incorrect / rejected).
        if (!country && geoLngLat) {
            const [lng, latVal] = geoLngLat;
            const lookup = await this.reverseGeoService.lookupCountry(latVal, lng);
            if (lookup) country = lookup.name;
        }

        // Display name: VC-supplied name when present, else project key (so a row
        // exists even before the registration VC lands).
        const displayName = name ?? projectKey;

        // Build the businessData jsonb. Only set fields we have on this VC; the
        // upsert merges with existing values via COALESCE in the SQL.
        const newFields: Record<string, unknown> = {
            topicId: vc.topicId,
            policyTopicId,
            instanceTopicId,
            policyName: policyRow.policyName ?? resolved.name ?? null,
        };
        if (name) newFields.name = name;
        // Country: write the resolved value when truthy. Also explicitly write
        // null when this VC's schema is the configured Country source but the
        // extracted value was rejected (length guard above) — that way a stale
        // bad country left over from a previous mapping gets cleared on
        // re-extract instead of silently sticking around.
        const sourcesCountry = 'country' in crossSchemaFieldMap;
        if (country) {
            newFields.country = country;
            if (countries.length > 1) newFields.countries = countries;
        } else if (sourcesCountry && rawCountry) {
            newFields.country = null;
        }
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
        if (extracted['description']) newFields.description = extracted['description'];
        if (createdAt) newFields.createdAt = createdAt;
        if (creditingPeriodStart) newFields.creditingPeriodStart = creditingPeriodStart;
        if (creditingPeriodEnd) newFields.creditingPeriodEnd = creditingPeriodEnd;
        newFields.status = 'Issuing';

        // Track this VC's contribution. The SQL UPDATE below dedupes by
        // consensusTimestamp so re-running upsert for the same VC is idempotent.
        newFields.linkedVcs = [{
            consensusTimestamp: vc.consensusTimestamp,
            topicId: vc.topicId,
            schemaUuid: vcSchemaUuid,
            csId,
        }];

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
                    -- (excluding linkedVcs, which needs append+dedupe semantics
                    -- rather than overwrite); then recompute credits/vcCount as SUM
                    -- and rebuild linkedVcs as the deduped union of old + new.
                    business_view."businessData" || (EXCLUDED."businessData" - 'linkedVcs')
                ) || jsonb_build_object(
                    -- Only add credits/vcCount when this VC isn't already linked.
                    -- Makes reparse-all idempotent — clicking it twice doesn't double credits.
                    'credits',
                        COALESCE((business_view."businessData"->>'credits')::numeric, 0)
                      + CASE WHEN business_view."businessData"->'linkedVcs' @>
                                  jsonb_build_array(jsonb_build_object('consensusTimestamp', $1::text))
                             THEN 0 ELSE $7::numeric END,
                    'vcCount',
                        COALESCE((business_view."businessData"->>'vcCount')::int, 0)
                      + CASE WHEN business_view."businessData"->'linkedVcs' @>
                                  jsonb_build_array(jsonb_build_object('consensusTimestamp', $1::text))
                             THEN 0 ELSE 1 END,
                    'linkedVcs', (
                        SELECT COALESCE(jsonb_agg(elem ORDER BY elem->>'consensusTimestamp'), '[]'::jsonb)
                        FROM (
                            SELECT DISTINCT ON (e->>'consensusTimestamp') e AS elem
                            FROM jsonb_array_elements(
                                COALESCE(business_view."businessData"->'linkedVcs', '[]'::jsonb)
                                || COALESCE(EXCLUDED."businessData"->'linkedVcs', '[]'::jsonb)
                            ) e
                            ORDER BY e->>'consensusTimestamp'
                        ) deduped
                    )
                ),
                "searchText"     = COALESCE(NULLIF(business_view."searchText", ''), EXCLUDED."searchText"),
                "lastUpdate"     = EXCLUDED."lastUpdate",
                "updatedAt"      = NOW()`,
            [
                vc.consensusTimestamp,
                displayName,
                resolved.registryDid || policyRow.registryDid || null,
                vc.topicId,
                JSON.stringify(newFields),
                searchText,
                creditsToAdd,
                projectKey,
            ],
        );

        // Orphan-registration cleanup.
        //
        // During fresh ingest IPFS fetches arrive in order, so an early
        // project-schema VC (e.g. cs.id=Yn886) gets processed BEFORE the
        // newer canonical (cs.id=A9oX7) lands. At that moment
        // findCanonicalProjectSchemaCsIdInTopic returns Yn886 (the only
        // project-schema VC in the topic so far) and seeds a Yn886 row.
        // When A9oX7 arrives later, its row is created — but the Yn886
        // orphan stays behind. Sweep it here, scoped to project-schema VCs
        // only: delete any sibling PROJECT row in the same topic whose
        // projectKey is NOT referenced by any VC's cs.ref. Genuinely
        // distinct chain roots in the same topic (e.g. Regenerating
        // Rajasthan's 554b459b + c21ef213) both have downstream refs, so
        // neither is deleted.
        if (isProjectSchemaVc) {
            await this.dataSource.query(
                `DELETE FROM business_view bv
                 WHERE bv."viewType" = 'PROJECT'
                   AND bv."relatedTopicId" = $1
                   AND bv."projectKey" <> $2
                   AND NOT EXISTS (
                     SELECT 1 FROM message m
                     WHERE m.type = 'VC-Document'
                       AND m.documents->'credentialSubject'->0->>'ref' = bv."projectKey"
                   )`,
                [vc.topicId, projectKey],
            );
        }

        this.logger.debug(
            `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} key=${projectKey} ` +
            `fields=[${Object.keys(extracted).join(',')}] credits=${creditsToAdd}`,
        );
    }

    /**
     * Follows `credentialSubject[0].ref` (a DID pointing to the project's
     * identity VC) to find the canonical project key. Each hop: find the VC
     * whose `cs.id` equals the current ref, take ITS `cs.id` as the new
     * candidate, and if THAT VC also carries a ref, recurse. Stops at the
     * first VC without a `ref` (the project root).
     *
     * Returns null when:
     *   - The starting VC has no `ref` (caller falls back to the HCS walk),
     *   - The ref points to a cs.id that hasn't been ingested yet (defer to
     *     HCS walk so we still produce *some* projectKey).
     *
     * Loop guard via visited refs; capped at 8 hops.
     */
    private async resolveProjectKeyViaRef(
        startTs: string,
        startCsId: string,
    ): Promise<{ projectKey: string } | null> {
        const startRow: Array<{ ref: string | null }> = await this.dataSource.query(
            `SELECT documents->'credentialSubject'->0->>'ref' AS ref
             FROM message
             WHERE "consensusTimestamp" = $1
             LIMIT 1`,
            [startTs],
        );
        const startRef = startRow[0]?.ref;
        if (!startRef || typeof startRef !== 'string') return null;
        if (startRef === startCsId) return null;     // self-ref → no useful pointer

        let currentRef = startRef;
        const visited = new Set<string>([startCsId, currentRef]);

        for (let i = 0; i < 8; i++) {
            const targetRow: Array<{ cs_id: string | null; next_ref: string | null }> =
                await this.dataSource.query(
                    `SELECT documents->'credentialSubject'->0->>'id'  AS cs_id,
                            documents->'credentialSubject'->0->>'ref' AS next_ref
                     FROM message
                     WHERE type = 'VC-Document'
                       AND documents->'credentialSubject'->0->>'id' = $1
                     ORDER BY "consensusTimestamp" ASC
                     LIMIT 1`,
                    [currentRef],
                );
            if (targetRow.length === 0 || !targetRow[0].cs_id) {
                // Ref doesn't resolve to any ingested VC. Let the HCS walk
                // produce a fallback projectKey rather than returning a
                // dangling ref.
                return null;
            }
            const { cs_id, next_ref } = targetRow[0];
            if (!next_ref || typeof next_ref !== 'string' || visited.has(next_ref)) {
                return { projectKey: cs_id };
            }
            visited.add(next_ref);
            currentRef = next_ref;
        }
        return { projectKey: currentRef };
    }

    /**
     * Returns true when any OTHER VC's `credentialSubject[0].ref` equals the
     * given csId. The presence of such a reference means downstream VCs
     * explicitly treat this cs.id as the project's identity — we should not
     * walk past it via HCS relationships to an older sibling.
     */
    private async isCsIdReferencedByOtherVcs(
        csId: string,
        selfTs: string,
    ): Promise<boolean> {
        const row: Array<{ exists: boolean }> = await this.dataSource.query(
            `SELECT 1 AS exists
             FROM message
             WHERE type = 'VC-Document'
               AND documents->'credentialSubject'->0->>'ref' = $1
               AND "consensusTimestamp" <> $2
             LIMIT 1`,
            [csId, selfTs],
        );
        return row.length > 0;
    }

    /**
     * Returns the cs.id of the LATEST project-schema VC (matched by schema
     * UUID prefix on cs.type) in the given topic. Used as the canonical
     * projectKey when multiple project-schema VCs in the same topic carry
     * different cs.id values — they all collapse onto the latest registration's
     * DID. Returns null when no project-schema VC exists in the topic.
     *
     * Query is bounded by the topicId index, then filters cs.type by prefix
     * on the already-narrow result set. One round trip per project-schema VC.
     */
    private async findCanonicalProjectSchemaCsIdInTopic(
        topicId: string,
        schemaUuid: string,
    ): Promise<string | null> {
        const rows: Array<{ cs_id: string | null }> = await this.dataSource.query(
            `SELECT documents->'credentialSubject'->0->>'id' AS cs_id
             FROM message
             WHERE type = 'VC-Document'
               AND "topicId" = $1
               AND documents->'credentialSubject'->0->>'type' LIKE $2 || '&%'
               AND documents->'credentialSubject'->0->>'id' IS NOT NULL
             ORDER BY "consensusTimestamp" DESC
             LIMIT 1`,
            [topicId, schemaUuid],
        );
        return rows[0]?.cs_id ?? null;
    }

    /**
     * Walk `message.options.relationships` backwards from a VC to find the root
     * cs.id-carrying VC in the chain. The root is treated as the project's
     * identity, so monitoring / verification VCs merge into the project rather
     * than creating phantom rows keyed by their own cs.id.
     *
     * Stops at the first ancestor that has no relationships (or no cs.id-
     * carrying VC among its relationships). Up to 12 hops. Skips
     * Role-Documents and other non-VC referenced messages.
     */
    private async resolveProjectKeyViaRelationships(
        startTs: string,
        startCsId: string,
    ): Promise<{ projectKey: string; walked: boolean; hadRelationships: boolean }> {
        // Content-level link (preferred). Many Guardian VCs (monitoring,
        // verification, etc.) carry `credentialSubject[0].ref` pointing to the
        // project's identity DID. That's a deterministic intra-policy link
        // independent of HCS message relationships, which can branch through
        // registry-side artifacts and produce sibling cs.id winners on
        // different walks of the same logical project.
        const refResolved = await this.resolveProjectKeyViaRef(startTs, startCsId);
        if (refResolved) {
            return {
                projectKey: refResolved.projectKey,
                walked: refResolved.projectKey !== startCsId,
                hadRelationships: true,
            };
        }

        // If THIS VC's cs.id is the target of other VCs' `ref` fields, it is
        // the canonical project root — other monitoring/verification VCs in
        // the policy explicitly point to it as the project identity. Don't
        // walk past it to an older sibling registration just because the HCS
        // relationship graph has one (Guardian sometimes publishes multiple
        // registration VCs with different DIDs for the same logical project).
        if (await this.isCsIdReferencedByOtherVcs(startCsId, startTs)) {
            return { projectKey: startCsId, walked: false, hadRelationships: false };
        }

        // Fall back to BFS the ancestor tree via `options.relationships`. We
        // must walk THROUGH cs.id-less intermediate VCs (e.g. wrapper / system
        // VCs in some Guardian policies) — they don't claim a project
        // identity but their parents do. Stopping at the first cs.id-less hop
        // misses the real Project Registration VC further up.
        //
        // The winner is the OLDEST cs.id-carrying VC found anywhere in the
        // reachable tree (oldest == closest to chain root == Project VC).
        let oldestTs = startTs;
        let oldestCsId = startCsId;
        let walked = false;
        let hadRelationships = false;

        const visited = new Set<string>([startTs]);
        const queue: string[] = [startTs];
        let hops = 0;

        while (queue.length > 0 && hops < 24) {
            const currentTs = queue.shift()!;
            hops++;

            const relsRow: Array<{ rels: string[] | null }> = await this.dataSource.query(
                `SELECT
                    CASE
                        WHEN jsonb_typeof(options->'relationships') = 'array'
                            THEN ARRAY(SELECT jsonb_array_elements_text(options->'relationships'))
                        ELSE NULL
                    END AS rels
                 FROM message
                 WHERE "consensusTimestamp" = $1
                 LIMIT 1`,
                [currentTs],
            );
            const rels = relsRow[0]?.rels ?? [];
            if (currentTs === startTs) hadRelationships = rels.length > 0;
            if (rels.length === 0) continue;

            const fresh = rels.filter(r => !visited.has(r));
            if (fresh.length === 0) continue;

            // Fetch all VC-Document parents in this hop (with or without
            // cs.id) so we can both record candidates AND continue walking
            // through cs.id-less ones.
            const parents: Array<{ consensusTimestamp: string; cs_id: string | null }> =
                await this.dataSource.query(
                    `SELECT "consensusTimestamp",
                            documents->'credentialSubject'->0->>'id' AS cs_id
                     FROM message
                     WHERE "consensusTimestamp" = ANY($1::text[])
                       AND type = 'VC-Document'
                     ORDER BY "consensusTimestamp" ASC`,
                    [fresh],
                );

            for (const p of parents) {
                visited.add(p.consensusTimestamp);
                queue.push(p.consensusTimestamp);
                if (p.cs_id && p.consensusTimestamp < oldestTs) {
                    oldestTs = p.consensusTimestamp;
                    oldestCsId = p.cs_id;
                    walked = true;
                }
            }
        }

        return { projectKey: oldestCsId, walked, hadRelationships };
    }

    /**
     * Downstream topic-name conventions used across Guardian policies. VCs in
     * these topics describe monitoring / verification / minting artifacts and
     * should not seed a project keyed by their own cs.id when they carry no
     * `options.relationships` to walk back to a Project VC.
     */
    private static readonly DOWNSTREAM_TOPIC_NAMES = new Set<string>([
        'Token_Minting',
        'Verification',
        'Validation',
    ]);


    private async isDownstreamTopic(topicId: string): Promise<boolean> {
        const rows: Array<{ name: string | null }> = await this.dataSource.query(
            `SELECT options->>'name' AS name
             FROM message
             WHERE type='Topic' AND "topicId"=$1
             ORDER BY "consensusTimestamp" ASC
             LIMIT 1`,
            [topicId],
        );
        const name = rows[0]?.name;
        return !!name && ProjectMapperService.DOWNSTREAM_TOPIC_NAMES.has(name);
    }

    private async queryPolicyByPolicyId(policyId: string): Promise<Array<{
        policyTopicId: string;
        instanceTopicId: string | null;
        decodeStatus: string;
        policyMapping: Record<string, unknown> | null;
        registryDid: string | null;
        policyName: string | null;
    }>> {
        return this.dataSource.query(
            `SELECT
                p."policyTopicId"    AS "policyTopicId",
                p."instanceTopicId" AS "instanceTopicId",
                p."decodeStatus"    AS "decodeStatus",
                p."policyMapping"   AS "policyMapping",
                ip.owner            AS "registryDid",
                ip.options->>'name' AS "policyName"
             FROM policy p
             LEFT JOIN message ip
                ON ip.type = 'Instance-Policy'
               AND ip.action = 'publish-policy'
               AND ip."topicId" = p."policyTopicId"
             WHERE p."policyId" = $1
             LIMIT 1`,
            [policyId],
        );
    }

    /**
     * Walks the topic-parent chain from a VC's topic up to the nearest
     * Instance-Policy publish topic, then picks the policy version that was
     * active when the VC was minted (latest publish-policy message on that
     * topic with consensusTimestamp <= vcConsensusTimestamp).
     *
     * Returns the matching policy row's sourceCid so the caller can backfill
     * its policyId column.
     */
    private async findPolicyVersionByTopicWalk(
        vcTopicId: string,
        vcConsensusTimestamp: string,
    ): Promise<{ policyTopicId: string; sourceCid: string } | null> {
        let currentTopicId: string | null = vcTopicId;
        const visited = new Set<string>();

        for (let i = 0; i < 12; i++) {
            if (!currentTopicId || visited.has(currentTopicId)) break;
            visited.add(currentTopicId);

            // Is this topic itself an Instance-Policy publish topic?
            const policyRow: Array<{ sourceCid: string }> = await this.dataSource.query(
                `SELECT p."sourceCid"
                 FROM message ip
                 JOIN policy p ON p."policyTopicId" = ip."topicId"
                 WHERE ip.type = 'Instance-Policy'
                   AND ip.action = 'publish-policy'
                   AND ip."topicId" = $1
                   AND ip."consensusTimestamp" <= $2
                 ORDER BY ip."consensusTimestamp" DESC
                 LIMIT 1`,
                [currentTopicId, vcConsensusTimestamp],
            );
            if (policyRow.length > 0) {
                return { policyTopicId: currentTopicId, sourceCid: policyRow[0].sourceCid };
            }

            // Walk one level up via Topic.parentId
            const parentRows: Array<{ parent_id: string | null }> = await this.dataSource.query(
                `SELECT options->>'parentId' AS parent_id
                 FROM message
                 WHERE type = 'Topic' AND "topicId" = $1
                 LIMIT 1`,
                [currentTopicId],
            );
            currentTopicId = parentRows[0]?.parent_id ?? null;
        }

        return null;
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walks a dotted path against an object. Returns undefined if any segment is missing.
 */
/**
 * Walk a dotted path. Supports numeric indices (`locations.0.country`) and the
 * `*` wildcard (`locations.*.country`). When a path segment is a non-numeric,
 * non-wildcard key but the current node is an array (typical when the mapping
 * pipeline crosses an array-of-objects boundary like `locations.country`),
 * the array is iterated implicitly — equivalent to inserting `*`.
 */
function getByPath(obj: any, path: string): unknown {
    if (!path) return obj;
    return resolvePath(obj, path.split('.'));
}

function resolvePath(cur: any, parts: string[]): unknown {
    if (cur == null) return cur;
    if (parts.length === 0) return cur;
    const [key, ...rest] = parts;

    if (key === '*') {
        if (!Array.isArray(cur)) return null;
        return collectFromArray(cur, rest);
    }

    // Implicit array iteration: path crosses an array-of-objects boundary
    // without an explicit index or `*`. The mapping pipeline emits paths like
    // `locations.country` for schemas with `locations: { type: 'array', items: {…} }`,
    // and we still want to read every element's `.country`.
    if (Array.isArray(cur) && !/^\d+$/.test(key)) {
        return collectFromArray(cur, parts);
    }

    return resolvePath(cur[key], rest);
}

function collectFromArray(arr: any[], rest: string[]): unknown[] {
    const out: unknown[] = [];
    for (const item of arr) {
        const r = resolvePath(item, rest);
        if (r == null) continue;
        if (Array.isArray(r)) out.push(...r);
        else out.push(r);
    }
    return out;
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
        // Collect every distinct non-empty scalar across the array. When the
        // path used a `*` wildcard (e.g. `locations.*.country`), val arrives
        // here as a flat list of strings — we join them so the project gets
        // every country, not just the first one. Single-element arrays
        // collapse to that one value, preserving the original behavior.
        const unique: string[] = [];
        const seen = new Set<string>();
        for (const item of val) {
            const s = unwrapValue(item);
            if (!s) continue;
            const key = s.toLowerCase();
            if (key === 'not specified' || seen.has(key)) continue;
            seen.add(key);
            unique.push(s);
        }
        return unique.join(', ');
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

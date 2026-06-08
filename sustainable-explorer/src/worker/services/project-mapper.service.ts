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
import { ProjectKeyResolverChain } from '../project-mapper/resolvers/resolver-chain.service';
import { PolicyMapping } from '../mapping/policy-pipeline.types';

/**
 * Fields a "date-only" source VC (monitoring/verification report) is allowed to
 * contribute. All other PROJECT_EXTRACT_FIELDS are skipped for such VCs so their
 * noisy descriptive fields never seed/fill project descriptive data.
 */
const DATE_ONLY_FIELD_KEYS = new Set<string>([
    'vintageRaw', 'creditingPeriod', 'creditingPeriodStart', 'creditingPeriodEnd',
]);

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
        private readonly resolverChain: ProjectKeyResolverChain,
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
        const policyMapping = (policyRow.policyMapping ?? {}) as PolicyMapping;

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

        // Resolve the project key via the M1→M4 resolver chain (dynamic topic →
        // cs.ref → gated relationships → project schema). The chain returns null
        // when the VC is not a project artifact (rejected or all-pass) → skip it.
        const resolvedProject = await this.resolverChain.resolve({
            consensusTimestamp: vc.consensusTimestamp,
            topicId: vc.topicId,
            csId,
            csRef,
            isProjectSchemaVc,
            policyHasProjectSchemaClassification,
            policyMapping,
        });
        if (!resolvedProject) {
            this.logger.debug(
                `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} → no projectKey resolved; skipping`,
            );
            return;
        }
        const projectKey = resolvedProject.projectKey;

        // Coarse document type of THIS VC's schema (stamped at decode time).
        // Validation reports contribute nothing; monitoring/verification reports
        // contribute only dates + credits (descriptive fields are suppressed).
        const vcDocType = this.docTypeForSchema(vcSchemaUuid, policyMapping);
        const isDateOnlySource = vcDocType === 'monitoringReport' || vcDocType === 'verificationReport';

        // ── Per-VC field extraction from policyMapping ───────────────────────────
        // crossSchemaFieldMap[fieldKey] = fieldPath (only entries for this VC's
        // schema are included, filtered above). Extract each mapped field from cs.
        const extracted: Record<string, string | null> = {};
        let geoLngLat: [number, number] | null = null;

        for (const field of PROJECT_EXTRACT_FIELDS) {
            if (vcDocType === 'validationReport') break;                          // contributes nothing
            if (isDateOnlySource && !DATE_ONLY_FIELD_KEYS.has(field.key)) continue; // only dates/credits
            const path = crossSchemaFieldMap[field.key];
            if (!path) continue;

            const raw = getByPath(cs, path);
            if (field.key === 'geo') {
                geoLngLat = parseGeoValue(raw);
            } else if (field.key === 'creditingPeriodStart' && raw && typeof raw === 'object' && !Array.isArray(raw) && 'from' in (raw as object)) {
                const from = (raw as Record<string, unknown>)['from'];
                if (typeof from === 'string') extracted[field.key] = from;
            } else if (field.key === 'creditingPeriodEnd' && raw && typeof raw === 'object' && !Array.isArray(raw) && 'to' in (raw as object)) {
                const to = (raw as Record<string, unknown>)['to'];
                if (typeof to === 'string') extracted[field.key] = to;
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
        if (vcDocType !== 'validationReport') {
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
        let creditingPeriodEnd: string | null = extracted['creditingPeriodEnd'] ?? null;

        // Fallback: scan top-level and nested {from, to} objects only when
        // the extracted fields are still empty. Collect ALL {from, to} pairs
        // and pick the one with the widest date span (most likely the
        // crediting period rather than a monitoring period).
        if (!creditingPeriodStart || !creditingPeriodEnd) {
            const dateRanges: Array<{ from: string; to: string }> = [];
            const collectDateRanges = (obj: Record<string, unknown>) => {
                for (const v of Object.values(obj)) {
                    if (v && typeof v === 'object' && !Array.isArray(v)) {
                        const o = v as Record<string, unknown>;
                        if ('from' in o && 'to' in o && typeof o['from'] === 'string' && typeof o['to'] === 'string') {
                            dateRanges.push({ from: o['from'] as string, to: o['to'] as string });
                        } else {
                            collectDateRanges(o);
                        }
                    }
                }
            };
            collectDateRanges(cs);

            if (dateRanges.length > 0) {
                // Pick the widest range (crediting period is typically years, monitoring is months)
                const best = dateRanges.reduce((a, b) => {
                    const spanA = new Date(a.to).getTime() - new Date(a.from).getTime();
                    const spanB = new Date(b.to).getTime() - new Date(b.from).getTime();
                    return (isNaN(spanA) ? -1 : spanA) >= (isNaN(spanB) ? -1 : spanB) ? a : b;
                });
                if (!creditingPeriodStart) creditingPeriodStart = best.from;
                if (!creditingPeriodEnd) creditingPeriodEnd = best.to;
                if (!createdAt) createdAt = best.from;
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
        // Priority system for descriptive fields:
        //   - Project-schema VCs: ALWAYS write (highest priority, overrides existing)
        //   - Non-project VCs: only fill gaps (never overwrite existing values)
        // This prevents non-project VCs with bad mappings (e.g., country → longitude)
        // from corrupting data set by the project VC.
        //
        // The priority is enforced via a `_priority` flag in businessData. When a
        // project-schema VC writes a field, it's authoritative. When a non-project
        // VC writes, the SQL uses COALESCE to keep existing values.
        if (isProjectSchemaVc) {
            newFields._fromProjectSchema = true;
        }

        if (name) newFields.name = name;
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
                -- Project-schema VCs override displayName; others fill gaps.
                "displayName"    = CASE WHEN (EXCLUDED."businessData"->>'_fromProjectSchema')::boolean IS TRUE
                                        THEN COALESCE(NULLIF(EXCLUDED."displayName", ''), business_view."displayName")
                                        ELSE COALESCE(NULLIF(business_view."displayName", ''), EXCLUDED."displayName")
                                   END,
                "registryDid"    = COALESCE(business_view."registryDid", EXCLUDED."registryDid"),
                "relatedTopicId" = COALESCE(business_view."relatedTopicId", EXCLUDED."relatedTopicId"),
                "businessData"   = (
                    -- Priority merge: project-schema VCs override existing values
                    -- (EXCLUDED wins via ||). Non-project VCs only fill gaps —
                    -- existing values are kept by reversing the operand order
                    -- so existing data takes precedence.
                    CASE WHEN (EXCLUDED."businessData"->>'_fromProjectSchema')::boolean IS TRUE
                         THEN business_view."businessData" || (EXCLUDED."businessData" - 'linkedVcs' - '_fromProjectSchema')
                         ELSE (EXCLUDED."businessData" - 'linkedVcs' - '_fromProjectSchema') || business_view."businessData"
                    END
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
        // newer canonical (cs.id=A9oX7) lands. At that moment a Yn886 row
        // gets seeded (the only project-schema VC in the topic so far).
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
            `vc=${messageConsensusTimestamp} schema=${vcSchemaUuid} key=${projectKey} via=${resolvedProject.method} ` +
            `fields=[${Object.keys(extracted).join(',')}] credits=${creditsToAdd}`,
        );
    }

    /**
     * Returns the coarse document type stamped (at decode time) on the policy
     * mapping entry for the given schema UUID, or 'unknown' if none.
     */
    private docTypeForSchema(schemaUuid: string, policyMapping: PolicyMapping): string {
        for (const entries of Object.values(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (entry.source !== 'schema' || !entry.schemaIri || !entry.docType) continue;
                const uuid = entry.schemaIri.split('&')[0].trim().replace(/^#/, '');
                if (uuid === schemaUuid) return entry.docType;
            }
        }
        return 'unknown';
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

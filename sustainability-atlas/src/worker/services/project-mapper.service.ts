import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
    slugify,
    normalizeSector,
    resolveMethod,
    loadResolutionMaps,
    extractLatLng,
    unwrapGeoJsonGeometry,
    resolveCountryName,
    findCountryInText,
    isKnownCountryName,
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
import { buildVcTitleMaps, structureVcData } from '@shared/vc-detail/vc-detail.decoder';

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

        // Precompute and store this VC's "Detailed Information" payload (decoded
        // with human-readable titles) so the API / frontend read it directly
        // instead of decoding live. Done here — before the resolver-chain
        // early-returns below — so project, monitoring and verification VCs all
        // get their per-VC detail stored. Non-fatal: a failure never blocks the
        // project upsert. Note this depends only on the policy's rawSchemaJson
        // (field titles), not the editable policyMapping, so field-map edits
        // don't change it; a redecode (which rewrites rawSchemaJson) does, and
        // the reparse flow re-runs this method to refresh stored details.
        await this.storeDecodedDetails(vc.consensusTimestamp, vc.policyId, cs, vcSchemaUuid);

        // Build the cross-schema field map from policyMapping entries.
        // For each project extract field, pick the highest-scoring entry whose
        // schemaType is NOT 'mintToken' or 'standardRegistry' and whose schemaIri
        // suffix matches this VC's schema UUID. Prefer entries flagged
        // isProjectSchema=true so a downstream verification/monitoring VC
        // can't poison the project's country / name / etc. with its own
        // host_countries[].country (the root cause of "US, India" appearing
        // on projects whose project schema doesn't even define country).
        // Field keys whose winning entry (for THIS VC's schema) was an explicit
        // admin override (updateMapping()'s manualOverride flag) — grants
        // per-field merge authority below, independent of isProjectSchema.
        const explicitOverrideFields = new Set<string>();
        const crossSchemaFieldMap: Record<string, string> = {};
        for (const [fieldKey, entries] of Object.entries(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            let fallback: string | null = null;
            let fallbackIsOverride = false;
            for (const entry of entries) {
                if (entry.schemaType === 'mintToken' || entry.schemaType === 'standardRegistry') continue;
                if (entry.source !== 'schema' || !entry.schemaIri || !entry.fieldPath) continue;
                const schemaUuidFromIri = entry.schemaIri.split('&')[0].trim().replace(/^#/, '');
                if (schemaUuidFromIri !== vcSchemaUuid) continue;
                if (entry.isProjectSchema === true) {
                    crossSchemaFieldMap[fieldKey] = entry.fieldPath;
                    if (entry.manualOverride === true) explicitOverrideFields.add(fieldKey);
                    fallback = null;
                    break;
                }
                if (fallback === null) {
                    fallback = entry.fieldPath;
                    fallbackIsOverride = entry.manualOverride === true;
                }
            }
            if (!(fieldKey in crossSchemaFieldMap) && fallback !== null) {
                crossSchemaFieldMap[fieldKey] = fallback;
                if (fallbackIsOverride) explicitOverrideFields.add(fieldKey);
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
        let geoPolygon: ParsedGeoPolygon | null = null;
        let estimatedAmount: number | null = null;
        // Kept as the raw (possibly array, one element per developer) value —
        // unwrapValue() below would join a multi-developer array into one
        // comma-joined string, which normalizeEmail/normalizePhone would then
        // reject wholesale. See extractContactList.
        let developerEmailRaw: unknown = null;
        let developerPhoneRaw: unknown = null;

        for (const field of PROJECT_EXTRACT_FIELDS) {
            // `name` is always allowed (it only ever GAP-FILLS via the merge SQL —
            // a non-project VC never overwrites an existing name). This lets a
            // project whose project-schema VC never landed still show a real
            // title from a data-bearing schema instead of falling back to the DID.
            const alwaysAllowed = field.key === 'name';
            if (vcDocType === 'validationReport' && !alwaysAllowed) continue;       // validation: only name
            if (isDateOnlySource && !DATE_ONLY_FIELD_KEYS.has(field.key) && !alwaysAllowed) continue; // else dates only
            const path = crossSchemaFieldMap[field.key];
            if (!path) continue;

            const raw = resolveFieldValue(cs, path);
            if (field.key === 'geo') {
                geoLngLat = parseGeoValue(raw);
                geoPolygon = parseGeoPolygon(raw);
            } else if (field.key === 'creditingPeriodStart' && raw && typeof raw === 'object' && !Array.isArray(raw) && 'from' in (raw as object)) {
                const from = (raw as Record<string, unknown>)['from'];
                if (typeof from === 'string') extracted[field.key] = from;
            } else if (field.key === 'creditingPeriodEnd' && raw && typeof raw === 'object' && !Array.isArray(raw) && 'to' in (raw as object)) {
                const to = (raw as Record<string, unknown>)['to'];
                if (typeof to === 'string') extracted[field.key] = to;
            } else if (field.key === 'estimatedAnnualCredits') {
                estimatedAmount = parseEstimatedAnnualCredits(raw);
            } else if (field.key === 'developerEmail') {
                developerEmailRaw = raw;
            } else if (field.key === 'developerPhone') {
                developerPhoneRaw = raw;
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
        // Reject values that are clearly not places — URLs, IPFS/file URIs, or a
        // raw CID — which leak in when the country field path lands on a geo/file
        // attribute (e.g. a KML file reference).
        const isNonLocation = (s: string): boolean =>
            /:\/\//.test(s) || /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{20,})$/i.test(s.trim());
        let countries: string[] = [];
        if (rawCountry && rawCountry.length <= 200 && !isNonLocation(rawCountry)) {
            countries = rawCountry
                .split(',')
                .map(s => resolveCountryName(s.trim()))
                .filter(s => s.length > 0 && !isNonLocation(s));
        }
        let country = countries[0] ?? null;

        // The raw value can be "<place>, <country>" — a specific forest/
        // reserve/district named before its country, common in localized
        // REDD+/forestry methodologies (e.g. "districts of Jaipur ... in
        // North-West India", or "Bangui, Central African Republic"). The
        // comma-split above keeps only the first segment, so a single-word
        // place name (no internal whitespace) would otherwise slip through
        // as `country` untouched. Whenever there's more than one segment and
        // the chosen one isn't itself a recognized country, scan the full
        // raw value for one instead. Skipped when `country` already IS a
        // recognized country (e.g. "US, India" → "United States"), so a
        // correct pick is never overwritten by another country name
        // mentioned elsewhere in the raw text. Runs before geo fallback
        // because text-based detection is cheaper and more accurate when the
        // country is explicitly named.
        if (rawCountry && countries.length > 1 && !isKnownCountryName(country)) {
            const fromText = findCountryInText(rawCountry);
            if (fromText) country = fromText;
        }

        // Geo fallback: when the extracted country isn't a real, recognized
        // country name — null/empty, a coordinate string like "90.3563° E" or
        // `-22° 24' 59.99" S` (a mis-mapped lat/lng field), or free text that
        // just isn't a country ("Valle de los Tigres Project Area", a site
        // name mapped to the wrong field) — and this same VC also carries its
        // own `geo` field, resolve the real country from those coordinates.
        //
        // This does NOT touch `country` itself — it's written to the sibling
        // `geoCountryCode` key instead (an ISO 3166-1 alpha-3 code), so the
        // original (if wrong) VC-sourced value is never overwritten/lost. See
        // docs/dashboard-map-country-shading-investigation.md and
        // PgProjectRepository.applyCountryFilter, which reads this key to pull
        // a project out of the "Other" bucket and make it selectable by its
        // recovered country once this is set.
        //
        // Only handles the case where the bad country and the good geo arrive
        // on the SAME VC. When they're split across different VCs for the
        // same project (arrival order isn't guaranteed), this can't resolve
        // it — that's what scripts/backfill-geo-country-code.ts is for.
        let geoCountryCode: string | null = null;
        if (!isKnownCountryName(country ?? '') && geoLngLat) {
            const [lng, latVal] = geoLngLat;
            const lookup = await this.reverseGeoService.lookupCountry(latVal, lng);
            if (lookup) geoCountryCode = lookup.code;
        }

        // Re-trim regardless of which path set `country` above — notably the
        // text-scan fallback a few lines up, which can pass through a raw
        // value with no trim of its own. JS's trim() strips whitespace a
        // plain SQL TRIM() doesn't (e.g. a non-breaking space), so a stray
        // char here would silently drop the project into PgProjectRepository
        // .applyCountryFilter's "Other" bucket despite displaying correctly.
        if (country) country = country.trim();

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

        // businessData keys an admin explicitly remapped for THIS field, tagged
        // at the same site the field's value is derived — avoids a second,
        // separately-maintained fieldKey→businessData-key table that could drift
        // from the translation logic below (several fields are not 1:1, e.g.
        // sdgOrCobenefits → sdgs+cobenefits, geo → lat+lng). Forces the upsert to
        // overwrite exactly these keys regardless of _fromProjectSchema, without
        // granting the whole VC blanket override authority.
        const overrideBusinessKeys = new Set<string>();

        if (name) {
            newFields.name = name;
            if (explicitOverrideFields.has('name')) overrideBusinessKeys.add('name');
        }
        const sourcesCountry = 'country' in crossSchemaFieldMap;
        if (country) {
            newFields.country = country;
            if (countries.length > 1) newFields.countries = countries;
            if (explicitOverrideFields.has('country')) {
                overrideBusinessKeys.add('country');
                if (countries.length > 1) overrideBusinessKeys.add('countries');
            }
        } else if (sourcesCountry && rawCountry) {
            newFields.country = null;
            if (explicitOverrideFields.has('country')) overrideBusinessKeys.add('country');
        }
        if (geoCountryCode) {
            newFields.geoCountryCode = geoCountryCode;
        }
        if (lat !== null && lng !== null) {
            newFields.lat = lat;
            newFields.lng = lng;
            if (explicitOverrideFields.has('geo')) {
                overrideBusinessKeys.add('lat');
                overrideBusinessKeys.add('lng');
            }
        }
        if (resolved.name) {
            newFields.methodology = resolved.name;
            newFields.methodologyId = slugify(resolved.name);
        }
        if (developer) {
            newFields.developer = developer;
            if (explicitOverrideFields.has('developer')) overrideBusinessKeys.add('developer');
        }
        // Project-participant contact details. Kept adjacent to `developer`
        // because they come off the same schema/VC; each candidate is
        // validated independently (shape guard: normalizeEmail/normalizePhone)
        // so a mis-mapped narrative field can't land here as a bogus contact,
        // and so one bad entry among several developers doesn't drop the good
        // ones (see extractContactList). Only the plural key is written —
        // rows written before this array support existed have a legacy
        // singular `developerEmail`/`developerPhone` key instead, which
        // ProjectDto falls back to reading; that fallback is the only place
        // the singular key still matters, so it's not written here anymore.
        const developerEmails = extractContactList(developerEmailRaw, normalizeEmail);
        if (developerEmails.length > 0) {
            newFields.developerEmails = developerEmails;
            if (explicitOverrideFields.has('developerEmail')) overrideBusinessKeys.add('developerEmails');
        }
        const developerPhones = extractContactList(developerPhoneRaw, normalizePhone);
        if (developerPhones.length > 0) {
            newFields.developerPhones = developerPhones;
            if (explicitOverrideFields.has('developerPhone')) overrideBusinessKeys.add('developerPhones');
        }
        // vintage/createdAt can also be seeded by the unrelated {from,to} fallback
        // scan above — only tag as an override when the value actually came from
        // the mapped vintageRaw field, otherwise an override on vintageRaw could
        // wrongly force-overwrite an unrelated fallback-derived value.
        if (vintage) {
            newFields.vintage = vintage;
            if (explicitOverrideFields.has('vintageRaw') && extracted['vintageRaw']) overrideBusinessKeys.add('vintage');
        }
        if (sdgs.length > 0) {
            newFields.sdgs = sdgs;
            if (explicitOverrideFields.has('sdgOrCobenefits')) overrideBusinessKeys.add('sdgs');
        }
        if (cobenefits) {
            newFields.cobenefits = cobenefits;
            if (explicitOverrideFields.has('sdgOrCobenefits')) overrideBusinessKeys.add('cobenefits');
        }
        if (extracted['scale']) {
            newFields.scale = extracted['scale'];
            if (explicitOverrideFields.has('scale')) overrideBusinessKeys.add('scale');
        }
        if (extracted['category']) {
            newFields.category = extracted['category'];
            if (explicitOverrideFields.has('category')) overrideBusinessKeys.add('category');
        }
        if (sector) {
            newFields.sector = sector;
            // Sector precedence unchanged: policy.json's methodology-derived
            // scope still wins over the admin-mapped field whenever present
            // (see the `sector = normalizeSector(methScopes) || ...` resolution
            // above) — only tag as an override when the value actually came
            // from the mapped field, i.e. policy.json had nothing.
            if (explicitOverrideFields.has('sector') && !normalizeSector(methScopes) && rawSector) {
                overrideBusinessKeys.add('sector');
            }
        }
        if (sectoralScope) newFields.sectoralScope = sectoralScope;
        if (extracted['description']) {
            newFields.description = extracted['description'];
            if (explicitOverrideFields.has('description')) overrideBusinessKeys.add('description');
        }
        if (createdAt) {
            newFields.createdAt = createdAt;
            if (explicitOverrideFields.has('vintageRaw') && extracted['vintageRaw']) overrideBusinessKeys.add('createdAt');
        }
        if (creditingPeriodStart) {
            newFields.creditingPeriodStart = creditingPeriodStart;
            if (explicitOverrideFields.has('creditingPeriodStart') && extracted['creditingPeriodStart']) {
                overrideBusinessKeys.add('creditingPeriodStart');
            }
        }
        if (creditingPeriodEnd) {
            newFields.creditingPeriodEnd = creditingPeriodEnd;
            if (explicitOverrideFields.has('creditingPeriodEnd') && extracted['creditingPeriodEnd']) {
                overrideBusinessKeys.add('creditingPeriodEnd');
            }
        }
        if (estimatedAmount !== null) {
            newFields.estimatedAnnualCredits = estimatedAmount;
            if (explicitOverrideFields.has('estimatedAnnualCredits')) overrideBusinessKeys.add('estimatedAnnualCredits');
        }
        newFields.decodeMethod = resolvedProject.method;
        // Method-specific resolution anchor (M1: dynamic topic id; M2/M3/M4: root
        // VC timestamp the cs.id key was derived from). Merge-friendly: only
        // non-empty keys are written so later VCs don't clobber it with {}.
        if (resolvedProject.metadata && Object.keys(resolvedProject.metadata).length > 0) {
            newFields.metadata = resolvedProject.metadata;
        }
        if (overrideBusinessKeys.size > 0) {
            newFields._explicitOverrideFields = [...overrideBusinessKeys];
        }

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
                -- Explicit admin field overrides (see below) also force displayName
                -- when the overridden field is the project's name.
                "displayName"    = CASE WHEN (EXCLUDED."businessData"->>'_fromProjectSchema')::boolean IS TRUE
                                        OR EXCLUDED."businessData"->'_explicitOverrideFields' @> '"name"'::jsonb
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
                         THEN business_view."businessData" || (EXCLUDED."businessData" - 'linkedVcs' - '_fromProjectSchema' - '_explicitOverrideFields')
                         ELSE (EXCLUDED."businessData" - 'linkedVcs' - '_fromProjectSchema' - '_explicitOverrideFields') || business_view."businessData"
                    END
                    -- Explicit per-field admin override: force-write exactly the
                    -- keys the admin remapped, regardless of which CASE branch ran
                    -- above. No-op when _explicitOverrideFields is absent (every VC
                    -- of every policy with no manual edits).
                    || (
                        SELECT COALESCE(jsonb_object_agg(key, EXCLUDED."businessData"->key), '{}'::jsonb)
                        FROM jsonb_array_elements_text(COALESCE(EXCLUDED."businessData"->'_explicitOverrideFields', '[]'::jsonb)) AS key
                        WHERE EXCLUDED."businessData" ? key
                    )
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

        // Full-precision project boundary, stored separately from businessData
        // (see upsertProjectGeometry doc) so it never bloats the hot business_view
        // row that every list/search query touches.
        if (geoPolygon) {
            await this.upsertProjectGeometry(projectKey, geoPolygon, isProjectSchemaVc);
        }

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

    /**
     * Upserts a project's full-precision GeoJSON boundary into the dedicated
     * `project_geometry` table (never into businessData — that jsonb blob is
     * read by every list/search query, and a boundary can run to hundreds of
     * KB). Stored and served at full precision — the project detail page's
     * map renders every vertex, no point is ever dropped.
     *
     * Mirrors businessData's priority system: a project-schema VC is
     * authoritative and always overwrites, while a non-project VC only fills
     * the gap for a project that doesn't have a boundary yet (the `WHERE`
     * clause gates the UPDATE branch only — the initial INSERT for a new
     * project_key always happens regardless of which VC supplied it).
     */
    private async upsertProjectGeometry(
        projectKey: string,
        geo: ParsedGeoPolygon,
        isProjectSchemaVc: boolean,
    ): Promise<void> {
        const polygons = (geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates) as number[][][][];
        if (!Array.isArray(polygons)) return;

        let pointCount = 0;
        for (const poly of polygons) {
            if (!Array.isArray(poly)) continue;
            for (const ring of poly) pointCount += ring.length;
        }

        await this.dataSource.query(
            `INSERT INTO project_geometry (project_key, geo_type, geojson, point_count, updated_at)
             VALUES ($1, $2, $3::jsonb, $4, NOW())
             ON CONFLICT (project_key) DO UPDATE SET
                 geo_type = EXCLUDED.geo_type,
                 geojson = EXCLUDED.geojson,
                 point_count = EXCLUDED.point_count,
                 updated_at = NOW()
             WHERE $5`,
            [projectKey, geo.type, JSON.stringify(geo), pointCount, isProjectSchemaVc],
        );
    }

    /**
     * Decode this VC's credentialSubject into the structured "Detailed
     * Information" payload and persist it on the message row. Best-effort:
     * swallows errors so it can never block project ingestion. `rawSchemaJson`
     * is fetched lazily here (not in the hot queryPolicyByPolicyId path) because
     * the schema JSON can be large and is only needed for the decode.
     */
    private async storeDecodedDetails(
        consensusTimestamp: string,
        policyId: string,
        cs: Record<string, any>,
        vcSchemaUuid: string,
    ): Promise<void> {
        try {
            const rows: Array<{ rawSchemaJson: Record<string, any> | null }> = await this.dataSource.query(
                `SELECT "rawSchemaJson" FROM policy WHERE "policyId" = $1 LIMIT 1`,
                [policyId],
            );
            const maps = buildVcTitleMaps(rows[0]?.rawSchemaJson ?? null);
            const decoded = structureVcData(cs, vcSchemaUuid, maps);
            await this.dataSource.query(
                `UPDATE message
                 SET "decodedDetails" = $2::jsonb, "decodedDetailsSchemaUuid" = $3
                 WHERE "consensusTimestamp" = $1`,
                [consensusTimestamp, JSON.stringify(decoded), vcSchemaUuid],
            );
        } catch (err) {
            this.logger.warn(`decodedDetails compute failed for vc=${consensusTimestamp}: ${err}`);
        }
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

/**
 * Same as getByPath, but when the path ends in a bare numeric index (e.g. a
 * mapping editor selection of "pick element 2" for an array-valued field), and
 * that index doesn't extract to anything USABLE on THIS VC's array — out of
 * range, an empty string, or an object with no usable string field — falls
 * back to resolving the base path instead — i.e. the current
 * join-all-values-with-commas behavior (see unwrapValue) rather than
 * silently dropping the field for that VC. Uses unwrapValue itself (rather
 * than a raw null/undefined check) to judge usability, since a present-but-
 * empty element (e.g. "") is neither null nor undefined but still extracts
 * to nothing. Paths without a trailing bare index (including the existing
 * `locations.0.country` / `locations.*.country` array-of-objects convention,
 * which always has a further key after the index) are unaffected.
 */
function resolveFieldValue(obj: any, path: string): unknown {
    const m = path.match(/^(.+)\.(\d+)$/);
    if (!m) return getByPath(obj, path);
    const indexed = getByPath(obj, path);
    if (unwrapValue(indexed)) return indexed;
    return getByPath(obj, m[1]);
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
 * Handles standard GeoJSON, array-of-GeoJSON (VM0047), Feature /
 * FeatureCollection wrappers (Guardian's map widget), and lat/lng-string blocks.
 */
function parseGeoValue(raw: unknown): [number, number] | null {
    const geom = unwrapGeoJsonGeometry(raw);
    if (geom) return extractLatLng(geom);

    // Not GeoJSON-shaped — fall back to a `{latitude, longitude}`-style block.
    let v: unknown = raw;
    if (Array.isArray(v) && v.length > 0) v = v[0];
    if (!v || typeof v !== 'object') return null;
    return extractLatLngStrings(v as Record<string, any>);
}

interface ParsedGeoPolygon {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
}

/**
 * Returns the full-precision `{ type, coordinates }` when the geo field value
 * resolves (after unwrapping any Feature / FeatureCollection container — see
 * unwrapGeoJsonGeometry) to a GeoJSON Polygon or MultiPolygon. Every other geometry (Point,
 * LineString, etc.) — and any non-GeoJSON lat/lng-string block — yields null,
 * since only an actual area has a shape worth persisting alongside the
 * centroid lat/lng. No size cap here: the full geometry is stored as-is in
 * `project_geometry` (see upsertProjectGeometry) and served as-is to the
 * frontend — every vertex is kept.
 */
function parseGeoPolygon(raw: unknown): ParsedGeoPolygon | null {
    const geom = unwrapGeoJsonGeometry(raw);
    if (!geom) return null;
    const type = geom['type'];
    if (type !== 'Polygon' && type !== 'MultiPolygon') return null;
    const coords = geom['coordinates'];
    if (!Array.isArray(coords)) return null;
    return { type, coordinates: coords };
}

/**
 * Coerces the mapped "Estimated Annual Credits" field into a flat annual rate
 * (a bare number/numeric string) — the only shape real VC schemas expose
 * (see project-fields.ts).
 */
function parseEstimatedAnnualCredits(raw: unknown): number | null {
    if (typeof raw === 'number' && isFinite(raw) && raw > 0) return raw;
    if (typeof raw === 'string') {
        const n = parseFloat(raw.replace(/[,\s]/g, ''));
        return isFinite(n) && n > 0 ? n : null;
    }
    return null;
}

/**
 * Accepts a mapped contact value only when it actually looks like an email.
 * The fuzzy mapper's low match threshold can land a narrative field here on
 * schemas that have no real email field — this is a defensive guard.
 */
function normalizeEmail(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const s = raw.trim();
    if (s.length > 254) return null;
    return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(s) ? s : null;
}

/**
 * Accepts a mapped contact value only when it plausibly is a phone number:
 * short, and at least 6 digits after stripping formatting characters.
 */
function normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s || s.length > 64) return null;
    const digits = s.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 20) return null;
    return /^[+()\d\s./ext-]+$/i.test(s) ? s : null;
}

/**
 * Validates a possibly-array contact value (one raw entry per developer)
 * element-by-element instead of joining then validating — joining first
 * (the old behavior) meant a single mis-mapped/narrative developer entry
 * made normalizeEmail/normalizePhone reject the whole comma-joined string,
 * silently dropping every developer's contact info whenever a project had
 * more than one. A scalar `raw` is treated as a single-element list, so the
 * single-developer path behaves exactly as before.
 */
function extractContactList(raw: unknown, normalize: (s: string | null | undefined) => string | null): string[] {
    const items = Array.isArray(raw) ? raw : [raw];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
        const normalized = normalize(unwrapValue(item) || null);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(normalized);
    }
    return out;
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

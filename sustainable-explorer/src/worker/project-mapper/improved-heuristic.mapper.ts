import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
    slugify,
    normalizeSector,
    resolveMethod,
    parseSchemaDoc,
    findGeoJsonDefKey,
    isGeoJsonProperty,
    extractLatLng,
    loadResolutionMaps,
    upsertProjectRows,
    persistSchemaClassification,
    resolveFieldPaths,
} from './helpers';
import { FieldDef, SchemaEntry, ProjectRecord, ResolvedFieldPaths } from './types';

// ---------------------------------------------------------------------------
// Helpers specific to the policy-based approach
// ---------------------------------------------------------------------------

/**
 * Extracts SDG numbers (1-17) from free-text co-benefits descriptions.
 * Handles two common Guardian patterns:
 *   1. Explicit "SDG N" references  → "contributions to SDG 1, SDG 13 …"
 *   2. Numbered list items          → "1 - Poverty reduction … 5 - Gender …"
 */
function extractSdgsFromText(text: string): number[] {
    if (!text) return [];
    const sdgs = new Set<number>();

    // "SDG N" / "SDG-N" (case-insensitive)
    for (const m of text.matchAll(/\bSDG[-\s]*(\d{1,2})\b/gi)) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 17) sdgs.add(n);
    }

    // Numbered list: "N - Capital…" or "N – Capital…"
    for (const m of text.matchAll(/(?<!\d)(\d{1,2})\s*[-–]\s+(?=[A-Z\d])/g)) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 17) sdgs.add(n);
    }

    return [...sdgs].sort((a, b) => a - b);
}

/**
 * Combines title + description into one searchable string.
 */
function fieldSearchable(fd: FieldDef): string {
    return `${fd.title} ${fd.description}`.toLowerCase();
}

/**
 * Extracts a plain string from a nested dict or list-of-dicts.
 * VM0047 stores proponent as {G5: org_name, G6: contact, G7: title, ...}.
 * Returns the first non-empty, non-"not specified" string value.
 */
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

/**
 * Shape D fallback: recursively find latitude/longitude string fields (ISO14064 pattern).
 * Handles: {"coordinates": {"latitude": "1.37", "longitude": "32.29"}}
 */
function extractLatLngStrings(obj: Record<string, any>, depth = 0): [number, number] | null {
    if (!obj || typeof obj !== 'object' || depth > 3) return null;
    const latV = obj['latitude'] ?? obj['Latitude'];
    const lngV = obj['longitude'] ?? obj['Longitude'];
    if (latV != null && lngV != null) {
        const lat = parseFloat(String(latV));
        const lng = parseFloat(String(lngV));
        if (!isNaN(lat) && !isNaN(lng)) return [lng, lat];
    }
    for (const v of Object.values(obj)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            const r = extractLatLngStrings(v as Record<string, any>, depth + 1);
            if (r) return r;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Improved schema detection
// ---------------------------------------------------------------------------

/**
 * Detects geo fields including array-of-GeoJSON (VM0047 pattern:
 * "type":"array","items":{"$ref":"#GeoJSON"}).
 */
function isGeoJsonPropertyImproved(fdef: Record<string, any>, geoDefKey?: string | null): boolean {
    if (fdef['type'] === 'array') {
        const items = (fdef['items'] as Record<string, any>) ?? {};
        if (isGeoJsonProperty(items, geoDefKey)) return true;
    }
    return isGeoJsonProperty(fdef, geoDefKey);
}

/**
 * Checks description in addition to title (fixes VM0047 where title is opaque "G5").
 */
function hasNameFieldImproved(doc: Record<string, any>): boolean {
    const topProps: Record<string, any> = doc['properties'] ?? {};
    for (const fdef of Object.values(topProps)) {
        if (!fdef || typeof fdef !== 'object') continue;
        const searchable = `${(fdef as any).title ?? ''} ${(fdef as any).description ?? ''}`.toLowerCase();
        if ((searchable.includes('name') || searchable.includes('title')) && !searchable.includes('site')) {
            return true;
        }
    }
    return false;
}

function hasDirectGeoJsonImproved(doc: Record<string, any>): boolean {
    const geoDefKey = findGeoJsonDefKey(doc);
    const topProps: Record<string, any> = doc['properties'] ?? {};
    for (const fdef of Object.values(topProps)) {
        if (fdef && typeof fdef === 'object' &&
            isGeoJsonPropertyImproved(fdef as Record<string, any>, geoDefKey)) {
            return true;
        }
    }
    return false;
}

/**
 * Builds SchemaEntry using improved geo detection; fieldMap stores
 * title + description + isGeoJson for each field.
 */
function buildSchemaEntryImproved(
    schemaUuid: string,
    policyTopicId: string,
    doc: Record<string, any>,
): SchemaEntry | null {
    const geoDefKey = findGeoJsonDefKey(doc);
    const topProps: Record<string, any> = doc['properties'] ?? {};

    const makeMap = (props: Record<string, any>): Record<string, FieldDef> => {
        const map: Record<string, FieldDef> = {};
        for (const [k, v] of Object.entries(props)) {
            if (v && typeof v === 'object') {
                map[k] = {
                    title: (v as any).title ?? k,
                    description: (v as any).description ?? '',
                    isGeoJson: isGeoJsonPropertyImproved(v as Record<string, any>, geoDefKey),
                };
            }
        }
        return map;
    };

    // Shape A — geo field directly in top-level properties
    for (const [fk, fdef] of Object.entries(topProps)) {
        if (fdef && typeof fdef === 'object' &&
            isGeoJsonPropertyImproved(fdef as Record<string, any>, geoDefKey)) {
            return { schemaUuid, policyTopicId, geoKey: fk, section: null, fieldMap: makeMap(topProps) };
        }
    }

    // Shape B — geo field one level deeper inside a wrapper property
    for (const [wrapKey, wrapDef] of Object.entries(topProps)) {
        if (!wrapDef || typeof wrapDef !== 'object') continue;
        const nested: Record<string, any> = (wrapDef as any).properties ?? {};
        for (const [fk, fdef] of Object.entries(nested)) {
            if (fdef && typeof fdef === 'object' &&
                isGeoJsonPropertyImproved(fdef as Record<string, any>, geoDefKey)) {
                return { schemaUuid, policyTopicId, geoKey: fk, section: wrapKey, fieldMap: makeMap(nested) };
            }
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Improved field lookup (title + description, with unwrapValue)
// ---------------------------------------------------------------------------

function findFieldByTitleOrDesc(
    subject: Record<string, any>,
    fieldMap: Record<string, FieldDef>,
    ...keywords: string[]
): string {
    for (const [fk, fd] of Object.entries(fieldMap)) {
        if (fd.isGeoJson) continue;
        const searchable = fieldSearchable(fd);
        if (keywords.some(kw => searchable.includes(kw.toLowerCase()))) {
            const val = subject[fk];
            if (val != null) {
                const s = unwrapValue(val);
                if (s) return s;
            }
        }
    }
    return '';
}

function findFieldByTitleOrDescExcluding(
    subject: Record<string, any>,
    fieldMap: Record<string, FieldDef>,
    keywords: string[],
    exclude: string[],
): string {
    for (const [fk, fd] of Object.entries(fieldMap)) {
        if (fd.isGeoJson) continue;
        const searchable = fieldSearchable(fd);
        if (keywords.some(kw => searchable.includes(kw.toLowerCase())) &&
            !exclude.some(ex => searchable.includes(ex.toLowerCase()))) {
            const val = subject[fk];
            if (val != null) {
                const s = unwrapValue(val);
                if (s) return s;
            }
        }
    }
    return '';
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Builds PROJECT rows in business_view using an improved schema-detection
 * approach that checks title + description for name-field detection, handles
 * array-of-GeoJSON fields (VM0047 pattern), nested dict proponent values, and
 * Shape-D lat/lng string fallback (ISO14064).
 *
 * Shares Steps C, D, and G with the geojson-heuristic mapper via helpers.ts.
 */
export async function buildProjectViewsPolicyBased(
    dataSource: DataSource,
    logger: Logger,
): Promise<void> {
    logger.log('Building project views from VC-Document messages (policy-based)...');

    // Step A — confirm the ONE project-registration schema per policy topic.
    //
    // Optimised two-pass approach:
    //   Pass 1 (fast): load topics already confirmed in a prior run (isProjectSchema = TRUE).
    //   Pass 2 (full): re-evaluate only topics that have at least one unprocessed schema
    //                  (isProjectSchema IS NULL). Results are persisted back to DB so
    //                  those topics are skipped on the next run.
    //
    // Net effect: once all policies are ingested the full scan never runs again.

    type SchemaRow = { schemaId: string; policyTopicId: string; document: unknown };
    type PreConfirmedRow = {
        schemaId: string;
        policyTopicId: string;
        projectSchemaConfig: Record<string, unknown> | null;
        document: unknown;
    };

    const [preConfirmedRows, nullTopicRows]: [PreConfirmedRow[], Array<{ policyTopicId: string }>] =
        await Promise.all([
            dataSource.query(`
                SELECT "schemaId", "policyTopicId", "projectSchemaConfig", document
                FROM policy_schema
                WHERE "isProjectSchema" = TRUE
                  AND "schemaId" IS NOT NULL
            `),
            dataSource.query(`
                SELECT DISTINCT "policyTopicId"
                FROM policy_schema
                WHERE "isProjectSchema" IS NULL
                  AND "schemaId" IS NOT NULL AND document IS NOT NULL
            `),
        ]);

    // Topics with NULL schemas must be re-evaluated; pre-confirmed topics for which
    // a new schema has been imported will also appear in nullTopicRows (because the
    // import processor resets isProjectSchema = NULL for the whole topic).
    const topicsNeedingEval = new Set(nullTopicRows.map(r => r.policyTopicId));

    // Seed confirmedByTopic from pre-confirmed rows.
    // Fast path: use stored projectSchemaConfig (no document parsing).
    // Migration fallback: if config is missing (rows confirmed before this column
    // was added), parse the document and persist the config immediately.
    const confirmedByTopic = new Map<string, SchemaEntry>();
    const needsConfigBackfill = new Map<string, SchemaEntry>();

    for (const row of preConfirmedRows) {
        if (topicsNeedingEval.has(row.policyTopicId)) continue;

        let entry: SchemaEntry | null = null;

        if (row.projectSchemaConfig) {
            const cfg = row.projectSchemaConfig;
            entry = {
                schemaUuid: row.schemaId,
                policyTopicId: row.policyTopicId,
                geoKey: cfg['geoKey'] as string,
                section: (cfg['section'] as string | null) ?? null,
                fieldMap: cfg['fieldMap'] as SchemaEntry['fieldMap'],
                resolvedFields: cfg['resolvedFields'] as ResolvedFieldPaths | undefined,
            };
        } else {
            // Config missing (rows confirmed before this column was added) —
            // parse document, resolve field paths, and backfill both.
            const doc = parseSchemaDoc(row.document);
            entry = buildSchemaEntryImproved(row.schemaId, row.policyTopicId, doc);
            if (entry) {
                entry.resolvedFields = resolveFieldPaths(entry.fieldMap);
                needsConfigBackfill.set(row.policyTopicId, entry);
            }
        }

        if (entry) confirmedByTopic.set(row.policyTopicId, entry);
    }

    // Persist any missing configs so the next run uses the fast path.
    if (needsConfigBackfill.size > 0) {
        for (const entry of needsConfigBackfill.values()) {
            const config = { geoKey: entry.geoKey, section: entry.section, fieldMap: entry.fieldMap };
            await dataSource.query(
                `UPDATE policy_schema SET "projectSchemaConfig" = $1 WHERE "schemaId" = $2`,
                [JSON.stringify(config), entry.schemaUuid],
            );
        }
        logger.log(`Backfilled projectSchemaConfig for ${needsConfigBackfill.size} pre-confirmed schema(s).`);
    }

    // Re-evaluate topics that have at least one NULL schema.
    if (topicsNeedingEval.size > 0) {
        const revalTopicIds = Array.from(topicsNeedingEval);
        const revalRows: SchemaRow[] = await dataSource.query(`
            SELECT "schemaId", "policyTopicId", document
            FROM policy_schema
            WHERE "policyTopicId" = ANY($1)
              AND "schemaId" IS NOT NULL AND document IS NOT NULL
        `, [revalTopicIds]);

        const directGeoByTopic = new Map<string, SchemaEntry[]>();
        for (const row of revalRows) {
            const doc = parseSchemaDoc(row.document);
            if (!hasDirectGeoJsonImproved(doc)) continue;
            if (!hasNameFieldImproved(doc)) continue;
            const entry = buildSchemaEntryImproved(row.schemaId, row.policyTopicId, doc);
            if (!entry) continue;
            const list = directGeoByTopic.get(row.policyTopicId) ?? [];
            list.push(entry);
            directGeoByTopic.set(row.policyTopicId, list);
        }

        const newlyConfirmed = new Map<string, SchemaEntry>();
        for (const [topicId, entries] of directGeoByTopic) {
            if (entries.length === 1) {
                const confirmed = entries[0];
                confirmed.resolvedFields = resolveFieldPaths(confirmed.fieldMap);
                newlyConfirmed.set(topicId, confirmed);
                confirmedByTopic.set(topicId, confirmed);
            }
        }

        // Persist TRUE/FALSE classification so these topics are skipped next run.
        await persistSchemaClassification(dataSource, newlyConfirmed, revalTopicIds);
        logger.log(
            `Schema classification: evaluated ${revalTopicIds.length} topic(s), ` +
            `confirmed ${newlyConfirmed.size} new project schema(s).`,
        );
    }

    const confirmedTopics = new Set(confirmedByTopic.keys());

    if (confirmedTopics.size === 0) {
        logger.warn('No confirmed project schemas found in policy_schema — no project views built.');
        await dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
        return;
    }

    logger.log(`Confirmed project schemas: ${confirmedTopics.size}`);

    // Step B — build sibling-schema map for confirmed topics only.
    // Loads schemas scoped to confirmed topics (far smaller than the full table scan).
    const confirmedTopicIds = Array.from(confirmedTopics);
    const siblingRows: SchemaRow[] = await dataSource.query(`
        SELECT "schemaId", "policyTopicId", document
        FROM policy_schema
        WHERE "policyTopicId" = ANY($1)
          AND "schemaId" IS NOT NULL AND document IS NOT NULL
    `, [confirmedTopicIds]);

    const siblingSchemaMap = new Map<string, SchemaEntry>();
    for (const row of siblingRows) {
        const doc = parseSchemaDoc(row.document);

        // Shape A or B (improved)
        const entry = buildSchemaEntryImproved(row.schemaId, row.policyTopicId, doc);
        if (entry) {
            siblingSchemaMap.set(row.schemaId, entry);
            continue;
        }

        // Shape C — wrapper property $ref points to the confirmed schema
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
                    resolvedFields: confirmedEntry.resolvedFields,
                });
                break;
            }
        }
    }

    const acceptableUuids = Array.from(siblingSchemaMap.keys());

    // Build policyTopicId → schema UUIDs map so each project record knows
    // which schema UUIDs were used to find its VCs. Used by findActivity()
    // to scope activity queries to this project's schemas only (avoiding
    // cross-contamination when multiple projects share the same instance topic).
    const policySchemaUuids = new Map<string, string[]>();
    for (const [uuid, entry] of siblingSchemaMap) {
        const list = policySchemaUuids.get(entry.policyTopicId) ?? [];
        list.push(uuid);
        policySchemaUuids.set(entry.policyTopicId, list);
    }
    const projectVcs: Array<{
        consensusTimestamp: string;
        topicId: string;
        documents: Record<string, any>;
    }> = await dataSource.query(`
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
        await dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
        logger.log('No project VCs found matching confirmed schemas; cleared stale PROJECT rows.');
        return;
    }

    // Steps C and D — load resolution maps (shared with geojson-heuristic mapper)
    const { maps, methodScopeMap } = await loadResolutionMaps(dataSource);

    // Step F — deduplicate and build project records
    const projectMap = new Map<string, ProjectRecord>();

    for (const vc of projectVcs) {
        const docs = vc.documents as Record<string, any>;
        const cs = Array.isArray(docs.credentialSubject)
            ? (docs.credentialSubject[0] as Record<string, any>)
            : null;
        if (!cs) continue;

        const rawType: string = cs['type'] ?? '';
        const vcUuid = rawType.split('&')[0].trim().replace(/^#/, '');
        const schemaEntry = siblingSchemaMap.get(vcUuid);
        if (!schemaEntry) continue;

        const subject: Record<string, any> | null = schemaEntry.section
            ? (cs[schemaEntry.section] as Record<string, any> | null) ?? null
            : cs;
        if (!subject || typeof subject !== 'object') continue;

        // Geo extraction with array-of-GeoJSON unwrap and Shape-D string fallback
        let geoVal = subject[schemaEntry.geoKey] as unknown;
        if (Array.isArray(geoVal) && geoVal.length > 0) geoVal = geoVal[0]; // array-of-GeoJSON (VM0047)
        if (!geoVal || typeof geoVal !== 'object') continue;
        const geoObj = geoVal as Record<string, any>;

        let lngLat: [number, number] | null = null;
        if ('type' in geoObj) {
            lngLat = extractLatLng(geoObj);           // standard GeoJSON
        } else {
            lngLat = extractLatLngStrings(geoObj);    // Shape D: plain lat/lng strings (ISO14064)
        }
        if (!lngLat) continue;

        const lng = lngLat[0];
        const lat = lngLat[1];

        const fm = schemaEntry.fieldMap;
        const rf = schemaEntry.resolvedFields;

        // Field extraction — fast path uses pre-resolved field keys (direct lookup);
        // fallback to runtime keyword search for sibling schemas without resolvedFields.
        const getRaw = (key: string | null | undefined): string =>
            key ? unwrapValue(subject[key]) : '';

        const name = rf
            ? getRaw(rf.name)
            : findFieldByTitleOrDescExcluding(subject, fm,
                ['project name', 'project title', 'name', 'title'],
                ['methodology', 'reference', 'pdd', 'section', 'table', 'site', 'document']);
        if (!name) continue;

        const country = rf
            ? getRaw(rf.country)
            : findFieldByTitleOrDescExcluding(subject, fm, ['country'], ['participant', 'applicant']);
        const developer = rf
            ? getRaw(rf.developer)
            : findFieldByTitleOrDesc(subject, fm, 'developer', 'proponent', 'organization', 'project developer', 'applicant');
        const category = rf
            ? getRaw(rf.category)
            : findFieldByTitleOrDesc(subject, fm, 'category', 'project type');
        const scale = rf
            ? getRaw(rf.scale)
            : findFieldByTitleOrDesc(subject, fm, 'scale', 'project scale');
        const rawSector = rf
            ? getRaw(rf.sector)
            : findFieldByTitleOrDesc(subject, fm, 'sector', 'activity');
        const vintageRaw = rf
            ? getRaw(rf.vintageRaw)
            : findFieldByTitleOrDesc(subject, fm, 'start date', 'commencement');

        // Crediting period
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

        // SDGs / co-benefits
        const sdgKey = rf?.sdgOrCobenefits
            ?? Object.entries(fm).find(([, fd]) => {
                const t = fd.title.toLowerCase();
                return t.includes('co-benefit') || t.includes('sustainable') || t.includes('sdg');
            })?.[0];
        const field25Raw = sdgKey ? String(subject[sdgKey] ?? '').trim() : '';
        const field25Tokens = field25Raw.split(',').map(s => s.trim()).filter(Boolean);
        const allNumeric = field25Tokens.length > 0 && field25Tokens.every(t => /^\d+$/.test(t));
        // Primary: comma-separated SDG numbers (e.g. "1,3,13").
        // Fallback: extract from free-text co-benefits using regex (two Guardian patterns).
        const sdgs: number[] = allNumeric
            ? field25Tokens.map(Number).filter(n => n >= 1 && n <= 17)
            : extractSdgsFromText(field25Raw);
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
                projectSchemaUuids: policySchemaUuids.get(resolved.policyTopicId) ?? [],
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

    // Step G — upsert each project row and delete stale PROJECT rows (shared)
    await upsertProjectRows(dataSource, projectMap);

    logger.log(
        `Project views built: ${projectMap.size} project(s) upserted from ${projectVcs.length} VC(s).`,
    );
}

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
} from './helpers';
import { FieldDef, SchemaEntry, ProjectRecord } from './types';

// ---------------------------------------------------------------------------
// Helpers specific to the policy-based approach
// ---------------------------------------------------------------------------

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

    // Step A — per methodology, confirm the ONE schema that declares a GeoJSON field.
    // Uses improved detection: array-of-GeoJSON counts, title+description checked.
    const allSchemaRows: Array<{
        schemaId: string;
        policyTopicId: string;
        document: unknown;
    }> = await dataSource.query(`
        SELECT "schemaId", "policyTopicId", document
        FROM policy_schema
        WHERE "schemaId" IS NOT NULL AND document IS NOT NULL
    `);

    const directGeoByTopic = new Map<string, SchemaEntry[]>();
    for (const row of allSchemaRows) {
        const doc = parseSchemaDoc(row.document);
        if (!hasDirectGeoJsonImproved(doc)) continue;
        if (!hasNameFieldImproved(doc)) continue;
        const entry = buildSchemaEntryImproved(row.schemaId, row.policyTopicId, doc);
        if (!entry) continue;
        const list = directGeoByTopic.get(row.policyTopicId) ?? [];
        list.push(entry);
        directGeoByTopic.set(row.policyTopicId, list);
    }

    // Confirmed: exactly 1 direct-GeoJSON schema per policy topic
    const confirmedByTopic = new Map<string, SchemaEntry>();
    const confirmedTopics = new Set<string>();
    for (const [topicId, entries] of directGeoByTopic) {
        if (entries.length === 1) {
            confirmedByTopic.set(topicId, entries[0]);
            confirmedTopics.add(topicId);
        }
    }

    if (confirmedTopics.size === 0) {
        logger.warn('No confirmed project schemas found in policy_schema — no project views built.');
        await dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
        return;
    }

    logger.log(`Confirmed project schemas: ${confirmedTopics.size}`);

    // Step B — build sibling-schema map using improved detection.
    // Same three shapes (A, B, C) as geojson-heuristic but with improved field detection.
    const siblingSchemaMap = new Map<string, SchemaEntry>();
    for (const row of allSchemaRows) {
        if (!confirmedTopics.has(row.policyTopicId)) continue;
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

        const name = findFieldByTitleOrDesc(subject, fm, 'project name', 'name', 'title');
        if (!name) continue;

        const country = findFieldByTitleOrDescExcluding(subject, fm, ['country'], ['participant', 'applicant']);
        const developer = findFieldByTitleOrDesc(subject, fm,
            'developer', 'proponent', 'organization', 'project developer', 'applicant');
        const category = findFieldByTitleOrDesc(subject, fm, 'category', 'project type');
        const scale = findFieldByTitleOrDesc(subject, fm, 'scale', 'project scale');
        const rawSector = findFieldByTitleOrDesc(subject, fm, 'sector', 'activity');
        const vintageRaw = findFieldByTitleOrDesc(subject, fm, 'start date', 'commencement');

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

    // Step G — upsert each project row and delete stale PROJECT rows (shared)
    await upsertProjectRows(dataSource, projectMap);

    logger.log(
        `Project views built: ${projectMap.size} project(s) upserted from ${projectVcs.length} VC(s).`,
    );
}

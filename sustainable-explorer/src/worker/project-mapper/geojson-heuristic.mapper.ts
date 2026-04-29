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
// Schema detection helpers (heuristic-specific — title only)
// ---------------------------------------------------------------------------

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
 * Returns true when a schema's top-level properties contain a field whose title
 * contains "name" or "title" — indicating it carries a project identity, not just
 * coordinates. Used to exclude utility schemas like "Coordinates", "Geographic Scope",
 * and "Site Registration Standard" from the project-schema confirmation count:
 * those schemas have GeoJSON but no project name field, so they should not count
 * toward the "exactly 1 GeoJSON schema per methodology" check.
 */
function hasNameField(doc: Record<string, any>): boolean {
    const topProps: Record<string, any> = doc['properties'] ?? {};
    for (const fdef of Object.values(topProps)) {
        if (!fdef || typeof fdef !== 'object') continue;
        const title: string = ((fdef as any).title ?? '').toLowerCase();
        // Accept "name" or "title" only when not qualified by "site" —
        // "Site Name" in Site Registration schemas should not count.
        if ((title.includes('name') || title.includes('title')) && !title.includes('site')) return true;
    }
    return false;
}

/**
 * Builds a SchemaEntry for a schema document.
 * Handles two layout shapes:
 *   Shape A — GeoJSON field is directly in doc.properties
 *   Shape B — GeoJSON field is one level deeper inside a wrapper property (e.g. project_details)
 * Returns null if no GeoJSON field is found.
 * The fieldMap entries carry description: '' (empty) to satisfy the shared FieldDef type.
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
                        description: '',
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
                            description: '',
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

// ---------------------------------------------------------------------------
// Field lookup (title only — original heuristic behaviour)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Builds PROJECT rows in business_view from VC-Document messages whose
 * credentialSubject type UUID matches a confirmed project-registration schema
 * (i.e. a schema from policy_schema that is the ONLY schema in its
 * methodology with a GeoJSON field). Field names are resolved from the
 * schema's JSON-Schema title annotations — no hardcoded field positions.
 *
 * This is the original GeoJSON-heuristic approach extracted verbatim from
 * BusinessViewBuilderProcessor. No behaviour changes.
 */
export async function buildProjectViewsGeojson(
    dataSource: DataSource,
    logger: Logger,
): Promise<void> {
    logger.log('Building project views from VC-Document messages...');

    // Step A — per methodology, confirm the ONE schema that declares a GeoJSON field.
    // Exactly 1 GeoJSON schema per policy topic → confirmed project registration schema.
    // 0 or >1 → skip that methodology entirely (no fallback to raw VC scanning).
    const allSchemaRows: Array<{
        schemaId: string;
        policyTopicId: string;
        document: unknown;
    }> = await dataSource.query(`
        SELECT "schemaId", "policyTopicId", document
        FROM policy_schema
        WHERE "schemaId" IS NOT NULL AND document IS NOT NULL
    `);

    // Confirmation uses Shape A only: a schema counts toward the "exactly 1"
    // check only if its GeoJSON field is directly in top-level properties AND
    // the schema has a name/title field — indicating it is a project identity
    // schema rather than a utility schema (Coordinates, Geographic Scope, Site
    // Registration) that incidentally carries GeoJSON.
    const directGeoByTopic = new Map<string, SchemaEntry[]>();
    for (const row of allSchemaRows) {
        const doc = parseSchemaDoc(row.document);
        if (!hasDirectGeoJson(doc)) continue;          // Shape B → skip for confirmation
        if (!hasNameField(doc)) continue;              // utility schema → skip for confirmation
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
        logger.warn('No confirmed project schemas found in policy_schema — no project views built.');
        await dataSource.query(`DELETE FROM business_view WHERE "viewType" = 'PROJECT'`);
        return;
    }

    logger.log(`Confirmed project schemas: ${confirmedTopics.size}`);

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

    // Steps C and D — load resolution maps
    const { maps, methodScopeMap } = await loadResolutionMaps(dataSource);

    // Step F — deduplicate and build project records
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

    // Step G — upsert each project row and delete stale PROJECT rows
    await upsertProjectRows(dataSource, projectMap);

    logger.log(
        `Project views built: ${projectMap.size} project(s) upserted from ${projectVcs.length} VC(s).`,
    );
}

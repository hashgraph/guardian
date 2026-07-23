/**
 * Schema classification helpers shared between PolicyDecodeProcessor (classify
 * at decode time) and improved-heuristic.mapper (consume the result).
 *
 * Extracted from improved-heuristic.mapper so both callers can import from one
 * place without circular dependencies.
 */

import {
    findGeoJsonDefKey,
    isGeoJsonProperty,
    parseSchemaDoc,
} from './helpers';
import { FieldDef, SchemaEntry } from './types';

// ---------------------------------------------------------------------------
// Internal geo detection (title + description + array-of-GeoJSON)
// ---------------------------------------------------------------------------

/**
 * Detects GeoJSON fields including the VM0047 array-of-GeoJSON pattern:
 *   "type":"array","items":{"$ref":"#GeoJSON"}
 */
export function isGeoJsonPropertyImproved(
    fdef: Record<string, unknown>,
    geoDefKey?: string | null,
): boolean {
    if ((fdef as Record<string, unknown>)['type'] === 'array') {
        const items = ((fdef as Record<string, unknown>)['items'] as Record<string, unknown>) ?? {};
        if (isGeoJsonProperty(items as Record<string, any>, geoDefKey)) return true;
    }
    return isGeoJsonProperty(fdef as Record<string, any>, geoDefKey);
}

/**
 * Returns true when any top-level property has a field whose title OR description
 * contains "name" or "title" (but not "site" — filters out Site Registration schemas).
 */
export function hasNameFieldImproved(doc: Record<string, unknown>): boolean {
    const topProps = (doc['properties'] ?? {}) as Record<string, unknown>;
    for (const fdef of Object.values(topProps)) {
        if (!fdef || typeof fdef !== 'object') continue;
        const f = fdef as Record<string, unknown>;
        const searchable = `${String(f['title'] ?? '')} ${String(f['description'] ?? '')}`.toLowerCase();
        if ((searchable.includes('name') || searchable.includes('title')) && !searchable.includes('site')) {
            return true;
        }
    }
    return false;
}

export function hasDirectGeoJsonImproved(doc: Record<string, unknown>): boolean {
    const geoDefKey = findGeoJsonDefKey(doc as Record<string, any>);
    const topProps = (doc['properties'] ?? {}) as Record<string, unknown>;
    for (const fdef of Object.values(topProps)) {
        if (fdef && typeof fdef === 'object' &&
            isGeoJsonPropertyImproved(fdef as Record<string, unknown>, geoDefKey)) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// SchemaEntry builder
// ---------------------------------------------------------------------------

/**
 * Builds a SchemaEntry for a schema document using improved geo detection.
 * fieldMap stores title + description + isGeoJson for each field.
 *
 * Shape A — geo field directly in top-level properties.
 * Shape B — geo field one level deeper inside a wrapper property.
 *
 * Returns null if no GeoJSON field is found.
 */
export function buildSchemaEntryImproved(
    schemaUuid: string,
    policyTopicId: string,
    doc: Record<string, unknown>,
): SchemaEntry | null {
    const geoDefKey = findGeoJsonDefKey(doc as Record<string, any>);
    const topProps = (doc['properties'] ?? {}) as Record<string, unknown>;

    const makeMap = (props: Record<string, unknown>): Record<string, FieldDef> => {
        const map: Record<string, FieldDef> = {};
        for (const [k, v] of Object.entries(props)) {
            if (v && typeof v === 'object') {
                const vr = v as Record<string, unknown>;
                map[k] = {
                    title: String(vr['title'] ?? k),
                    description: String(vr['description'] ?? ''),
                    isGeoJson: isGeoJsonPropertyImproved(vr, geoDefKey),
                };
            }
        }
        return map;
    };

    // Shape A — geo field directly in top-level properties
    for (const [fk, fdef] of Object.entries(topProps)) {
        if (fdef && typeof fdef === 'object' &&
            isGeoJsonPropertyImproved(fdef as Record<string, unknown>, geoDefKey)) {
            return { schemaUuid, policyTopicId, geoKey: fk, section: null, fieldMap: makeMap(topProps) };
        }
    }

    // Shape B — geo field one level deeper inside a wrapper property
    for (const [wrapKey, wrapDef] of Object.entries(topProps)) {
        if (!wrapDef || typeof wrapDef !== 'object') continue;
        const nested = ((wrapDef as Record<string, unknown>)['properties'] ?? {}) as Record<string, unknown>;
        for (const [fk, fdef] of Object.entries(nested)) {
            if (fdef && typeof fdef === 'object' &&
                isGeoJsonPropertyImproved(fdef as Record<string, unknown>, geoDefKey)) {
                return { schemaUuid, policyTopicId, geoKey: fk, section: wrapKey, fieldMap: makeMap(nested) };
            }
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Classification: identify ONE confirmed project schema per policy topic
// ---------------------------------------------------------------------------

export interface ClassifiedSchema {
    schemaUuid: string;
    policyTopicId: string;
    geoKey: string;
    section: string | null;
    fieldMap: Record<string, FieldDef>;
}

/**
 * Given an array of imported schemas for a single policy topic, finds the one
 * schema (if any) that qualifies as the project schema:
 *   - Has a direct-level GeoJSON field (Shape A or B)
 *   - Has at least one name/title field (not "site")
 *   - Exactly ONE such schema exists for this policy
 *
 * Returns the classified schema, or null if 0 or >1 candidates.
 */
export function classifyProjectSchema(
    schemas: Array<{ schemaId: string; policyTopicId: string; document: unknown }>,
): ClassifiedSchema | null {
    const candidates: ClassifiedSchema[] = [];

    for (const row of schemas) {
        const doc = parseSchemaDoc(row.document);
        if (!hasDirectGeoJsonImproved(doc)) continue;
        if (!hasNameFieldImproved(doc)) continue;
        const entry = buildSchemaEntryImproved(row.schemaId, row.policyTopicId, doc);
        if (!entry) continue;
        candidates.push({
            schemaUuid: entry.schemaUuid,
            policyTopicId: entry.policyTopicId,
            geoKey: entry.geoKey,
            section: entry.section,
            fieldMap: entry.fieldMap,
        });
    }

    return candidates.length === 1 ? candidates[0] : null;
}

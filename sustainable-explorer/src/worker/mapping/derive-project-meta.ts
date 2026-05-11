import { FieldMap, SchemaInfo } from './types';
import { PROJECT_EXTRACT_FIELDS } from '../project-mapper/project-fields';

export interface PerPolicyProjectMeta {
    projectSchemaId: string;
    projectFieldMap: Record<string, string | null>;
    projectGeoKey: string | null;
    projectGeoSection: string | null;
}

/**
 * Derives per-policy project meta from the cross-schema fuzzy field map.
 *
 * Algorithm:
 *  1. Parse each fieldMap[fieldKey] value into { schemaId, path }.
 *  2. Tally schemaId frequency. The schema with the most matched fields is
 *     the primary "project schema".
 *  3. Build projectFieldMap[fieldKey] = path (without schemaId prefix) for
 *     fields whose schemaId matches the primary schema.
 *  4. For the 'geo' field: derive projectGeoKey and projectGeoSection.
 *     - If the path is 'wrapper.geoKey', section = 'wrapper', geoKey = 'geoKey'
 *     - If the path is 'geoKey', section = null, geoKey = 'geoKey'
 *  5. Returns null when no field is mapped.
 */
export function derivePerPolicyProjectMeta(
    fieldMap: FieldMap,
    _schemas: SchemaInfo[],
): PerPolicyProjectMeta | null {
    // Step 1+2: tally schemaId frequency
    const tally = new Map<string, number>();
    const parsed = new Map<string, { schemaId: string; path: string }>();

    for (const [fieldLabel, value] of Object.entries(fieldMap)) {
        if (!value) continue;
        const dotIdx = value.indexOf('.');
        if (dotIdx === -1) continue;
        const schemaId = value.slice(0, dotIdx);
        const path = value.slice(dotIdx + 1);
        parsed.set(fieldLabel, { schemaId, path });
        tally.set(schemaId, (tally.get(schemaId) ?? 0) + 1);
    }

    if (tally.size === 0) return null;

    // Pick the schema with the most mapped fields
    let projectSchemaId = '';
    let maxCount = 0;
    for (const [schemaId, count] of tally) {
        if (count > maxCount) {
            maxCount = count;
            projectSchemaId = schemaId;
        }
    }

    // Step 3: build projectFieldMap for fields in the primary schema
    const projectFieldMap: Record<string, string | null> = {};
    for (const field of PROJECT_EXTRACT_FIELDS) {
        if (field.key === 'geo') continue; // handled separately
        const entry = parsed.get(field.label);
        if (entry && entry.schemaId === projectSchemaId) {
            projectFieldMap[field.key] = entry.path;
        } else {
            projectFieldMap[field.key] = null;
        }
    }

    // Step 4: geo key
    let projectGeoKey: string | null = null;
    let projectGeoSection: string | null = null;

    // Look up the geo field by its label from PROJECT_EXTRACT_FIELDS
    const geoField = PROJECT_EXTRACT_FIELDS.find(f => f.key === 'geo');
    if (geoField) {
        const geoEntry = parsed.get(geoField.label);
        if (geoEntry) {
            const geoPath = geoEntry.path;
            const dotIdx = geoPath.indexOf('.');
            if (dotIdx !== -1) {
                // Shape B: wrapper.geoKey
                projectGeoSection = geoPath.slice(0, dotIdx);
                projectGeoKey = geoPath.slice(dotIdx + 1);
            } else {
                // Shape A: direct geoKey
                projectGeoSection = null;
                projectGeoKey = geoPath;
            }
        }
    }

    return {
        projectSchemaId,
        projectFieldMap,
        projectGeoKey,
        projectGeoSection,
    };
}

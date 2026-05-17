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
    // Step 1+2: tally schemaId frequency.
    // Guardian schema IRIs contain dots (`#uuid&1.0.0`) so we match against
    // the known schema-id prefix list longest-first instead of indexOf('.').
    const tally = new Map<string, number>();
    const knownIds = _schemas.map(s => s.id).sort((a, b) => b.length - a.length);

    // fieldMap[label] is now an array of `${schemaId}.${path}` values
    // (one per source schema). We collect all parsed entries per label and
    // tally each schemaId so the project-schema heuristic uses every match.
    const parsedByLabel = new Map<string, Array<{ schemaId: string; path: string }>>();
    for (const [fieldLabel, values] of Object.entries(fieldMap)) {
        if (!Array.isArray(values) || values.length === 0) continue;
        const collected: Array<{ schemaId: string; path: string }> = [];
        for (const value of values) {
            if (!value) continue;
            let schemaId = '';
            let path = '';
            for (const id of knownIds) {
                if (value === id) { schemaId = id; break; }
                if (value.startsWith(id + '.')) {
                    schemaId = id;
                    path = value.slice(id.length + 1);
                    break;
                }
            }
            if (!schemaId) continue;
            collected.push({ schemaId, path });
            tally.set(schemaId, (tally.get(schemaId) ?? 0) + 1);
        }
        if (collected.length > 0) parsedByLabel.set(fieldLabel, collected);
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

    // Step 3: build projectFieldMap for fields in the primary schema.
    // Prefer the candidate whose schemaId matches projectSchemaId; fall back
    // to the top-scoring candidate when the primary schema has no entry.
    const projectFieldMap: Record<string, string | null> = {};
    for (const field of PROJECT_EXTRACT_FIELDS) {
        if (field.key === 'geo') continue; // handled separately
        const candidates = parsedByLabel.get(field.label);
        const onProject = candidates?.find(c => c.schemaId === projectSchemaId);
        projectFieldMap[field.key] = onProject?.path ?? null;
    }

    // Step 4: geo key
    let projectGeoKey: string | null = null;
    let projectGeoSection: string | null = null;

    // Look up the geo field by its label from PROJECT_EXTRACT_FIELDS
    const geoField = PROJECT_EXTRACT_FIELDS.find(f => f.key === 'geo');
    if (geoField) {
        const geoCandidates = parsedByLabel.get(geoField.label);
        const geoEntry = geoCandidates?.find(c => c.schemaId === projectSchemaId) ?? geoCandidates?.[0];
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

import { PolicyMappingSchemaType } from './policy-pipeline.types';

/**
 * Classifies a schema's coarse type by its name. Used to tag mapping entries
 * so downstream consumers know which schemas to include in their extraction.
 *
 *   - 'mintToken'        → issuance VCs only, never project data
 *   - 'standardRegistry' → registry profile VCs only, never project data
 *   - 'project' / 'other' → resolved by mapping confidence later;
 *                            the project-schema heuristic flips one of these
 *                            to 'project'.
 */
export function classifySchemaTypeByName(name: string | undefined | null): PolicyMappingSchemaType {
    if (!name) return 'other';
    const n = name.toLowerCase();
    if (n.includes('mint') && n.includes('token')) return 'mintToken';
    if (n.includes('standard') && n.includes('registry')) return 'standardRegistry';
    return 'other';
}

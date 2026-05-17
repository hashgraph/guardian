import { ProjectFieldKey } from '../project-mapper/project-fields';

/**
 * Source of a `PolicyMappingEntry`: either a schema field path or a path inside
 * the policy.json document.
 */
export type PolicyMappingSource = 'schema' | 'policyJson';

/**
 * Coarse classification used by consumers to filter mapping entries.
 *   - `project`           → produced by project workflow VCs
 *   - `mintToken`         → produced by MintToken VCs (issuance, not project)
 *   - `standardRegistry`  → produced by Standard Registry profile VCs
 *   - `other`             → policy.json or unclassified schema
 */
export type PolicyMappingSchemaType = 'project' | 'mintToken' | 'standardRegistry' | 'other';

export interface PolicyMappingEntry {
    source: PolicyMappingSource;

    // when source = 'schema'
    schemaIri?: string;
    schemaName?: string;
    schemaType?: PolicyMappingSchemaType;
    fieldPath?: string;          // path within the schema document, dot-separated
    isProjectSchema?: boolean;   // priority hint, not a filter

    // when source = 'policyJson'
    policyJsonPath?: string;

    title: string;
    description: string;
    score?: number;
}

/**
 * Final mapping grouped by `PROJECT_EXTRACT_FIELDS.key`. Each key may have
 * multiple candidates ordered by descending score.
 */
export type PolicyMapping = Partial<Record<ProjectFieldKey | string, PolicyMappingEntry[]>>;

/**
 * Flattened view of every field across every schema in the policy zip.
 * System-owned, regenerated on every decode, used by the UI to allow manual
 * mapping edits.
 */
export interface FlattenedSchemaField {
    schemaIri: string;
    schemaName: string;
    schemaType: PolicyMappingSchemaType;
    path: string;
    title: string;
    description: string;
    type: string;            // JSON-schema 'type' value or 'object'/'array'/etc.
    isGeoJson: boolean;
}

export interface PolicyPipelineInput {
    rawPolicyJson: Record<string, unknown>;
    /** { iri: schemaDoc } from the zip schemas/ folder */
    rawSchemas: Record<string, Record<string, unknown>>;
}

export interface PolicyPipelineOutput {
    policyMapping: PolicyMapping;
    schemaFields: FlattenedSchemaField[];
}

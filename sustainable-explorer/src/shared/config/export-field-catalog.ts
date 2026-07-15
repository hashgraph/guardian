/**
 * Single source of truth for exportable dataset columns in the ESG/compliance export engine (CSV / XLSX / PDF).
 * Each entry maps 1:1 to a snake_case `key` (the literal CSV header / XLSX column / PDF row label emitted by the
 * serializers) and an i18n `labelKey` (resolved by the frontend `FieldPicker` component). Pure config: no SQL,
 * no row-generation logic.
 */

/** The 4 datasets exposed by the export engine (mirrors the existing list-endpoint domains). */
export type ExportDataset = 'credits' | 'projects' | 'methodologies' | 'registries';

/** The 3 field groups from the "Export Data" mockup, in mockup display order. */
export type ExportFieldGroup =
    | 'PROJECT_IDENTIFIERS'
    | 'ESG_CLIMATE_DATA'
    | 'TRACEABILITY_REFERENCES';

export interface ExportFieldGroupDefinition {
    group: ExportFieldGroup;
    /** i18n label key for the group heading in the FieldPicker, e.g. `reports.fieldGroups.projectIdentifiers`. */
    labelKey: string;
    /** Display order in the FieldPicker (ascending). */
    order: number;
}

export interface ExportFieldDefinition {
    /** snake_case column key emitted in the exported file. Never renamed once shipped — it's a public export contract. */
    key: string;
    /** i18n label key for the field's display name/tooltip, e.g. `reports.fields.transactionId`. */
    labelKey: string;
    group: ExportFieldGroup;
    /** Required fields are always included and cannot be deselected in the FieldPicker. */
    required: boolean;
    /** Whether the field ships pre-checked in the FieldPicker. */
    defaultSelected: boolean;
}

/**
 * The 3 field groups, in mockup order. Dataset-agnostic — every dataset's
 * field rows are grouped under these same 3 headings.
 */
export const EXPORT_FIELD_GROUPS: readonly ExportFieldGroupDefinition[] = [
    { group: 'PROJECT_IDENTIFIERS', labelKey: 'reports.fieldGroups.projectIdentifiers', order: 1 },
    { group: 'ESG_CLIMATE_DATA', labelKey: 'reports.fieldGroups.esgClimateData', order: 2 },
    { group: 'TRACEABILITY_REFERENCES', labelKey: 'reports.fieldGroups.traceabilityReferences', order: 3 },
] as const;

/**
 * Dataset-agnostic fields: the same key, label, group, required/optional flag, and defaultSelected flag apply no
 * matter which dataset is being exported — only the underlying value-resolution (per-dataset repository code)
 * differs. These are all Traceability References, whose source/precedence is fixed across datasets, unlike
 * Project Identifiers / ESG Climate Data, whose field content varies per dataset:
 * - `transaction_id`     — the mint event consensus timestamp, never the token ID.
 * - `registry_record_id` — the Hedera `tokenId`.
 * - `verification_url`   — built via `buildVerificationUrl()` (see hashscan-url.ts).
 * - `source_system_id`   — `message.dataSource` mapped via `sourceSystemLabel()`; ships unchecked by default.
 */
export const DATASET_AGNOSTIC_FIELDS: readonly ExportFieldDefinition[] = [
    {
        key: 'transaction_id',
        labelKey: 'reports.fields.transactionId',
        group: 'TRACEABILITY_REFERENCES',
        required: false,
        defaultSelected: true,
    },
    {
        key: 'registry_record_id',
        labelKey: 'reports.fields.registryRecordId',
        group: 'TRACEABILITY_REFERENCES',
        required: false,
        defaultSelected: true,
    },
    {
        key: 'verification_url',
        labelKey: 'reports.fields.verificationUrl',
        group: 'TRACEABILITY_REFERENCES',
        required: false,
        defaultSelected: true,
    },
    {
        key: 'source_system_id',
        labelKey: 'reports.fields.sourceSystemId',
        group: 'TRACEABILITY_REFERENCES',
        required: false,
        defaultSelected: false,
    },
] as const;

/**
 * Extension point for per-dataset catalog rows. Each dataset starts seeded with the dataset-agnostic
 * Traceability fields above, plus its own field array (never mutating `DATASET_AGNOSTIC_FIELDS` itself, since
 * that array is shared by reference across all 4 datasets' seed spread).
 *
 * Per-dataset semantics:
 *   - `standard` = the resolved methodology's display name — joined for credits/projects, the methodology's own
 *     name for the methodologies dataset itself.
 *   - `mitigation_type` = `Methodology.emissionReductionApproach` (Avoidance | Removal | Avoidance & Removal),
 *     joined for credits/projects, direct for methodologies.
 *   - `vintage`/`emissions_reduced`/`reporting_year` only appear where they have a genuine per-row source
 *     (credits, projects); registries have no ESG Climate Data group at all (an organization, not a
 *     climate-data-bearing record).
 *   - `ipfs_document_ref`: joined via `business_view.sourceTimestamp` -> `message.consensusTimestamp` ->
 *     `message.files` -> `ipfs_files.cid`, the same join used elsewhere in this codebase. Added to all 4
 *     datasets, `defaultSelected: false`.
 */

const CREDIT_FIELDS: readonly ExportFieldDefinition[] = [
    // ── Project Identifiers ─────────────────────────────────────────────
    { key: 'project_name', labelKey: 'reports.fields.projectName', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'registry', labelKey: 'reports.fields.registry', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'developer', labelKey: 'reports.fields.developer', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'country', labelKey: 'reports.fields.country', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    // ── ESG Climate Data ────────────────────────────────────────────────
    { key: 'emissions_reduced', labelKey: 'reports.fields.emissionsReduced', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'reporting_year', labelKey: 'reports.fields.reportingYear', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'mitigation_type', labelKey: 'reports.fields.mitigationType', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'standard', labelKey: 'reports.fields.standard', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'vintage', labelKey: 'reports.fields.vintage', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    // ── Traceability References (dataset-specific addition) ───────
    { key: 'ipfs_document_ref', labelKey: 'reports.fields.ipfsDocumentRef', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
];

const PROJECT_FIELDS: readonly ExportFieldDefinition[] = [
    // ── Project Identifiers ─────────────────────────────────────────────
    { key: 'project_name', labelKey: 'reports.fields.projectName', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'registry', labelKey: 'reports.fields.registry', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'developer', labelKey: 'reports.fields.developer', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'country', labelKey: 'reports.fields.country', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    // ── ESG Climate Data ────────────────────────────────────────────────
    { key: 'emissions_reduced', labelKey: 'reports.fields.emissionsReduced', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'reporting_year', labelKey: 'reports.fields.reportingYear', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'mitigation_type', labelKey: 'reports.fields.mitigationType', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'standard', labelKey: 'reports.fields.standard', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'vintage', labelKey: 'reports.fields.vintage', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    // ── Traceability References (dataset-specific addition) ───────
    { key: 'ipfs_document_ref', labelKey: 'reports.fields.ipfsDocumentRef', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
];

const METHODOLOGY_FIELDS: readonly ExportFieldDefinition[] = [
    // ── Project Identifiers (methodology-appropriate identifiers) ──────
    { key: 'name', labelKey: 'reports.fields.name', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'registry', labelKey: 'reports.fields.registry', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'version', labelKey: 'reports.fields.version', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    // ── ESG Climate Data (only what applies at standard-level granularity) ──
    { key: 'mitigation_type', labelKey: 'reports.fields.mitigationType', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'standard', labelKey: 'reports.fields.standard', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    // ── Traceability References (dataset-specific addition) ───────
    { key: 'ipfs_document_ref', labelKey: 'reports.fields.ipfsDocumentRef', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
];

const REGISTRY_FIELDS: readonly ExportFieldDefinition[] = [
    // ── Project Identifiers (registry-appropriate identifiers) ─────────
    { key: 'name', labelKey: 'reports.fields.name', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'did', labelKey: 'reports.fields.did', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'geography', labelKey: 'reports.fields.geography', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'law', labelKey: 'reports.fields.law', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'project_count', labelKey: 'reports.fields.projectCount', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    // No ESG Climate Data group — a registry is an organization, not a climate-data-bearing record.
    // ── Traceability References (dataset-specific addition) ───────
    { key: 'ipfs_document_ref', labelKey: 'reports.fields.ipfsDocumentRef', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
];

export const EXPORT_FIELD_CATALOG: Record<ExportDataset, ExportFieldDefinition[]> = {
    credits: [...DATASET_AGNOSTIC_FIELDS, ...CREDIT_FIELDS],
    projects: [...DATASET_AGNOSTIC_FIELDS, ...PROJECT_FIELDS],
    methodologies: [...DATASET_AGNOSTIC_FIELDS, ...METHODOLOGY_FIELDS],
    registries: [...DATASET_AGNOSTIC_FIELDS, ...REGISTRY_FIELDS],
};

/** All catalog rows for a dataset (Project Identifiers + ESG Climate Data + Traceability References). */
export function getExportFields(dataset: ExportDataset): ExportFieldDefinition[] {
    return EXPORT_FIELD_CATALOG[dataset];
}

/** Convenience accessor for the snake_case keys of a dataset's catalog rows. */
export function getExportFieldKeys(dataset: ExportDataset): string[] {
    return getExportFields(dataset).map((field) => field.key);
}

/** Keys that ship pre-checked in the FieldPicker for a dataset. */
export function getDefaultSelectedFieldKeys(dataset: ExportDataset): string[] {
    return getExportFields(dataset)
        .filter((field) => field.defaultSelected)
        .map((field) => field.key);
}

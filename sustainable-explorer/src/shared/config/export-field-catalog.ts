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
 * Dataset-agnostic Traceability fields present on every dataset:
 * - `verification_url` — built via `buildVerificationUrl()` (see hashscan-url.ts).
 * - `source_system_id` — `message.dataSource` mapped via `sourceSystemLabel()`; ships unchecked by default.
 * (`transaction_id`/`registry_record_id` are Issuances-only — see CREDIT_FIELDS.)
 */
export const DATASET_AGNOSTIC_FIELDS: readonly ExportFieldDefinition[] = [
    { key: 'verification_url', labelKey: 'reports.fields.verificationUrl', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: true },
    { key: 'source_system_id', labelKey: 'reports.fields.sourceSystemId', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
] as const;

// Issuances: token metadata + mint amount; transaction_id/registry_record_id are meaningful only here.
const CREDIT_FIELDS: readonly ExportFieldDefinition[] = [
    { key: 'project_name', labelKey: 'reports.fields.projectName', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'registry', labelKey: 'reports.fields.registry', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'developer', labelKey: 'reports.fields.developer', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'country', labelKey: 'reports.fields.country', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'token_name', labelKey: 'reports.fields.tokenName', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'token_symbol', labelKey: 'reports.fields.tokenSymbol', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'token_type', labelKey: 'reports.fields.tokenType', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'emissions_reduced', labelKey: 'reports.fields.emissionsReduced', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'reporting_year', labelKey: 'reports.fields.reportingYear', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'standard', labelKey: 'reports.fields.standard', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'mint_amount', labelKey: 'reports.fields.mintAmount', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'transaction_id', labelKey: 'reports.fields.transactionId', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: true },
    { key: 'registry_record_id', labelKey: 'reports.fields.registryRecordId', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: true },
    { key: 'ipfs_document_ref', labelKey: 'reports.fields.ipfsDocumentRef', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
];

// Projects: keeps vintage, adds SDG contributions.
const PROJECT_FIELDS: readonly ExportFieldDefinition[] = [
    { key: 'project_name', labelKey: 'reports.fields.projectName', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'registry', labelKey: 'reports.fields.registry', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'developer', labelKey: 'reports.fields.developer', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'country', labelKey: 'reports.fields.country', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'emissions_reduced', labelKey: 'reports.fields.emissionsReduced', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'reporting_year', labelKey: 'reports.fields.reportingYear', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'standard', labelKey: 'reports.fields.standard', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'vintage', labelKey: 'reports.fields.vintage', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'sdg', labelKey: 'reports.fields.sdg', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'ipfs_document_ref', labelKey: 'reports.fields.ipfsDocumentRef', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
];

// Methodologies: adds project count.
const METHODOLOGY_FIELDS: readonly ExportFieldDefinition[] = [
    { key: 'name', labelKey: 'reports.fields.name', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'registry', labelKey: 'reports.fields.registry', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'version', labelKey: 'reports.fields.version', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'project_count', labelKey: 'reports.fields.projectCount', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'standard', labelKey: 'reports.fields.standard', group: 'ESG_CLIMATE_DATA', required: false, defaultSelected: true },
    { key: 'ipfs_document_ref', labelKey: 'reports.fields.ipfsDocumentRef', group: 'TRACEABILITY_REFERENCES', required: false, defaultSelected: false },
];

// Registries: adds methodology count + number of issuances.
const REGISTRY_FIELDS: readonly ExportFieldDefinition[] = [
    { key: 'name', labelKey: 'reports.fields.name', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'did', labelKey: 'reports.fields.did', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'geography', labelKey: 'reports.fields.geography', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'law', labelKey: 'reports.fields.law', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'project_count', labelKey: 'reports.fields.projectCount', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'methodology_count', labelKey: 'reports.fields.methodologyCount', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
    { key: 'number_of_issuances', labelKey: 'reports.fields.numberOfIssuances', group: 'PROJECT_IDENTIFIERS', required: false, defaultSelected: true },
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

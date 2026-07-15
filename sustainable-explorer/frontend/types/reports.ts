/** Hand-mirrored interfaces for the backend exports domain (kept in sync by hand with `export.dto.ts` / `export-field-catalog.ts`); exports are logged to `audit_log` rather than stored as files, so history is read-only. */

/** The 4 exportable datasets (mirrors `ExportDataset` in export-field-catalog.ts). */
export type ExportDataset = 'credits' | 'projects' | 'methodologies' | 'registries';

/** The 3 output formats the export engine supports (mirrors `EXPORT_FORMATS` in export.dto.ts). */
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

/** The 3 field groups from the "Export Data" mockup (mirrors `ExportFieldGroup`). */
export type ExportFieldGroup = 'PROJECT_IDENTIFIERS' | 'ESG_CLIMATE_DATA' | 'TRACEABILITY_REFERENCES';

/** Mirrors `ExportFieldGroupDefinition` (export-field-catalog.ts). */
export interface ExportFieldGroupDefinition {
    group: ExportFieldGroup;
    /** i18n label key for the group heading in the FieldPicker, e.g. `reports.fieldGroups.projectIdentifiers`. */
    labelKey: string;
    order: number;
}

/** Mirrors `ExportFieldDefinition` (export-field-catalog.ts) — one selectable FieldPicker row. */
export interface ExportFieldDefinition {
    /** snake_case column key emitted in the exported file (CSV header / XLSX column / PDF row label). */
    key: string;
    /** i18n label key for the field's display name/tooltip, e.g. `reports.fields.transactionId`. */
    labelKey: string;
    group: ExportFieldGroup;
    /** Required fields are always included and cannot be deselected in the FieldPicker. */
    required: boolean;
    /** Whether the field ships pre-checked in the FieldPicker. */
    defaultSelected: boolean;
}

/** Request params for `GET /api/v1/:network/exports/:dataset`, mirroring `ExportQueryDto`'s flattened union of per-dataset filter fields; only the fields relevant to the active `dataset` need to be populated. */
export interface ExportQueryParams {
    /** Output file format. Required. */
    format: ExportFormat;
    /** Selected export-field-catalog keys (snake_case). Omit to use the catalog's defaultSelected keys. */
    fields?: string[];
    /** Informational — the `:dataset` path segment is authoritative for the download route. */
    dataset?: ExportDataset;

    // ---- credits ----
    type?: string;
    registry?: string;
    registryDid?: string;
    tokenId?: string;
    projectKey?: string;
    methodologyId?: string;

    // ---- projects ----
    name?: string;
    country?: string;
    methodology?: string;
    developer?: string;
    vintage?: string;
    status?: string;
    policyTopicId?: string;
    instanceTopicId?: string;

    // ---- methodologies ----
    id?: string;
    description?: string;
    decodeStatus?: ('success' | 'failed' | 'pending' | 'unknown')[];

    // ---- registries ----
    displayName?: string;
    did?: string;
    tags?: string;
    geography?: string;
    law?: string;
    hideEmpty?: boolean;
    createdAtFrom?: string;
    createdAtTo?: string;
}

/** Query params for `GET /api/v1/:network/exports` (paginated Recent Exports); mirrors a plain `PaginationQueryDto`, with no dataset/format filter. */
export interface ExportHistoryQueryParams {
    page?: number;
    limit?: number;
}

/** One row of the current user's own export history, read from `audit_log` (mirrors `ExportHistoryItemDto`); nothing is persisted to re-download. */
export interface ExportHistoryItem {
    id: string;
    filename: string;
    format: ExportFormat;
    /** Rows in the generated file; null renders as "--" (e.g. curated PDF Impact Summary reports). */
    recordCount: number | null;
    /** Display name/email of the user who ran the export (denormalized onto the audit-log row). */
    exportedBy: string;
    createdAt: string;
}

export interface ExportHistoryMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/** Mirrors `PaginatedExportHistoryDto` (export.dto.ts). */
export interface ExportHistoryResponse {
    data: ExportHistoryItem[];
    meta: ExportHistoryMeta;
}

/** Hand-mirrored interfaces for the backend impact-summary domain, kept in sync by hand with `src/api/dto/impact-summary.dto.ts`. */

/** Mirrors `ImpactSummarySdgDto` (impact-summary.dto.ts). */
export interface ImpactSummarySdg {
    /** SDG number (1-17). */
    sdgId: number;
    /** Official SDG name. */
    name: string;
    /** Official SDG accent colour (hex). */
    color: string;
    /** Number of PROJECT rows tagged with this SDG. */
    projectCount: number;
    /** Total credits (self-reported ER_y) summed across projects tagged with this SDG. */
    credits: number;
}

/** Mirrors `ImpactSummaryGeoDto` (impact-summary.dto.ts). */
export interface ImpactSummaryGeo {
    /** Country label, or 'Unknown' when the project's country is blank/missing. */
    country: string;
    /** Number of PROJECT rows in this country. */
    projectCount: number;
    /** On-chain credits issued (mv_project_stats.total_issued) for this country. */
    creditsIssued: number;
    /** Share of totalCreditsIssued this country represents, 0-100. */
    percentage: number;
}

/** Mirrors `ImpactSummarySectorDto` (impact-summary.dto.ts). */
export interface ImpactSummarySector {
    /** Sector label, or 'Unknown'/'Others' for the explicit synthetic buckets. */
    sector: string;
    /** True when this row is the 'Unknown' bucket (project's sector is blank/missing). */
    isUnknown: boolean;
    /** True when this row is the 'Others' bucket (named sectors beyond the top TOP_SECTORS_LIMIT). */
    isOthers: boolean;
    /** Number of PROJECT rows in this sector (or bucket). */
    projectCount: number;
    /** On-chain credits issued for this sector (or bucket). */
    creditsIssued: number;
    /** Share of totalCreditsIssued this sector (or bucket) represents, 0-100. */
    percentage: number;
}

/** Mirrors `ImpactSummaryRegistryDto` (impact-summary.dto.ts). */
export interface ImpactSummaryRegistry {
    /** Registry DID. */
    registryDid: string | null;
    /** Registry display name. */
    displayName: string | null;
    /** Number of PROJECT rows published under this registry. */
    projectCount: number;
    /** Number of tokens with actual minting activity under this registry. */
    issuanceCount: number;
    /** Number of METHODOLOGY (policy) rows under this registry. */
    policyCount: number;
}

/** Mirrors `ImpactSummaryResponseDto` field-for-field — the combined aggregate returned by `GET /api/v1/:network/impact-summary`, backing the Reports page Impact Summary tab. */
export interface ImpactSummary {
    /** Hedera network this summary belongs to. */
    network: string;
    /** Total on-chain credits issued (tCO2e), summed from mv_project_stats.total_issued. */
    totalCreditsIssued: number;
    /** Total credits retired, inferred from Mirror-Node-deleted NFT serials since there is no on-chain retirement/burn record. */
    totalRetiredInferred: number;
    /** totalCreditsIssued minus totalRetiredInferred — credits still in circulation. */
    activeSupplyInferred: number;
    /** totalRetiredInferred as a percentage of totalCreditsIssued, 0-100. Inferred, see totalRetiredInferred. */
    retirementRateInferred: number;
    /** Explains the retirement-inference methodology, for direct reuse in UI disclosure copy. */
    retirementMethodologyNote: string;
    /** Number of PROJECT rows on this network. */
    activeProjects: number;
    /** Number of distinct countries across PROJECT rows (excludes the 'Unknown' bucket). */
    activeCountries: number;
    /** SDGs with at least one tagged project, sorted by SDG number. */
    sdgContributions: ImpactSummarySdg[];
    /** Credits issued per country, sorted descending. */
    geographicDistribution: ImpactSummaryGeo[];
    /** Credits issued per sector, sorted descending; named sectors beyond the top-N fold into 'Others', and sectorless projects form a separate 'Unknown' row. */
    sectorBreakdown: ImpactSummarySector[];
    /** Per-registry counts, deduped by registryDid, sorted by project count descending. */
    registryBreakdown: ImpactSummaryRegistry[];
    /**
     * Distinct methodology count, deduped by relatedTopicId (business_view is
     * per-message; republished methodology versions share a relatedTopicId).
     */
    methodologyCount: number;
    /** ISO timestamp this summary was computed (aggregates are computed live on each request). */
    generatedAt: string;
}

/** Output format for `GET /api/v1/:network/impact-summary/export?format=`; reuses `ExportFormat` since PDF is a curated report while CSV/XLSX carry the full datasets. */
export type ImpactSummaryDocumentFormat = ExportFormat;

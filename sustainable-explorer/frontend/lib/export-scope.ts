import type { ExportDataset } from '~/types/reports';

/** UI-facing scope filter state for ScopeRow (Date Range / Registry / Project / Vintage); `dateRange` uses `DataFilters`' own `{from,to}` shape. */
export interface ScopeFilters {
    registry?: string;
    /** Project name — only meaningful for the `projects` dataset. */
    project?: string;
    /** Vintage year — only meaningful for the `projects` dataset. */
    vintage?: string;
    /** Only meaningful for the `registries` dataset (createdAtFrom/createdAtTo). */
    dateRange?: { from?: string; to?: string };
}

/** Which of the 4 ScopeRow controls apply to a given dataset — drives `DataFilters`' `visible()` per field. */
export function scopeControlVisibility(dataset: ExportDataset): { registry: boolean; project: boolean; vintage: boolean; dateRange: boolean } {
    return {
        registry: true, // every dataset's list endpoint supports a registry-name filter (see buildListScopeQuery below)
        project: dataset === 'projects',
        vintage: dataset === 'projects',
        dateRange: dataset === 'registries',
    };
}

/** Query params accepted by the real per-dataset list endpoints, used for ScopeRow's live record count; narrower than `buildExportScopeParams` since the list DTOs reject undeclared fields. */
export function buildListScopeQuery(dataset: ExportDataset, filters: ScopeFilters): Record<string, string> {
    const q: Record<string, string> = {};
    const registry = filters.registry?.trim();
    switch (dataset) {
        case 'credits':
            if (registry) q.registry = registry;
            break;
        case 'projects':
            if (registry) q.registry = registry;
            if (filters.project?.trim()) q.name = filters.project.trim();
            if (filters.vintage?.trim()) q.vintage = filters.vintage.trim();
            break;
        case 'methodologies':
            // MethodologyQueryDto's list-endpoint field is `registryName`, not `registry`.
            if (registry) q.registryName = registry;
            break;
        case 'registries':
            if (registry) q.displayName = registry;
            if (filters.dateRange?.from) q.createdAtFrom = filters.dateRange.from;
            if (filters.dateRange?.to) q.createdAtTo = filters.dateRange.to;
            break;
    }
    return q;
}

/** Path segment for a dataset's list endpoint (`GET /api/v1/:network/{segment}`). */
export const DATASET_LIST_ENDPOINT: Record<ExportDataset, string> = {
    credits: 'credits',
    projects: 'projects',
    methodologies: 'methodologies',
    registries: 'registries',
};

/** Query params accepted by `ExportQueryDto`, used to build scope params for `useExportsApi().downloadExport()`; unused fields are simply ignored server-side. */
export function buildExportScopeParams(dataset: ExportDataset, filters: ScopeFilters): Record<string, string> {
    const q: Record<string, string> = {};
    const registry = filters.registry?.trim();
    switch (dataset) {
        case 'credits':
            if (registry) q.registry = registry;
            break;
        case 'projects':
            if (registry) q.registry = registry;
            if (filters.project?.trim()) q.name = filters.project.trim();
            if (filters.vintage?.trim()) q.vintage = filters.vintage.trim();
            break;
        case 'methodologies':
            // ExportQueryDto normalizes this to `registry` even though the list endpoint uses `registryName`.
            if (registry) q.registry = registry;
            break;
        case 'registries':
            if (registry) q.displayName = registry;
            if (filters.dateRange?.from) q.createdAtFrom = filters.dateRange.from;
            if (filters.dateRange?.to) q.createdAtTo = filters.dateRange.to;
            break;
    }
    return q;
}

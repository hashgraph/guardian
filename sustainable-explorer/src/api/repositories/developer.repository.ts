/**
 * Abstract repository for aggregating PROJECT business_view rows by developer.
 *
 * One row per businessData->>'developer' value. Storage-specific SQL lives
 * in concrete implementations; services depend on this interface so we can
 * swap backends without touching upstream code.
 */

export interface DeveloperRow {
    name: string;
    country: string | null;
    countries: number;
    projects: number;
    registries: string[];
    categories: string[];
    totalIssued: number;
    totalRetired: number;
}

export interface DeveloperListQuery {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    country?: string;
}

export interface DeveloperListResult {
    rows: DeveloperRow[];
    total: number;
}

export abstract class DeveloperRepository {
    abstract findAll(query: DeveloperListQuery): Promise<DeveloperListResult>;
}

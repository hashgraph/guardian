export interface QuickFilterCriteria {
    search?: string;
    filters: Record<string, string>;
    sort?: { key: string; dir: 'asc' | 'desc' };
}

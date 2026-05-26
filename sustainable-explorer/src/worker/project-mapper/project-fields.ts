/**
 * Canonical list of project fields extracted from VC credential subjects.
 *
 * This is the single source of truth consumed by:
 *   - PolicyDecodeProcessor  (classifies project schema + resolves field paths at decode time)
 *   - improved-heuristic.mapper  (drives per-VC field extraction)
 *   - project-mapper.service  (eager per-VC upsert from IpfsFetchProcessor)
 *   - resolveFieldPaths in helpers.ts  (keyword match loop)
 */

export interface ProjectExtractField {
    /** Stable key used everywhere (DB, API, frontend). */
    key: 'name' | 'description' | 'country' | 'developer' | 'category' | 'scale' | 'sector' | 'vintageRaw' | 'creditingPeriod' | 'creditingPeriodStart' | 'creditingPeriodEnd' | 'sdgOrCobenefits' | 'geo';
    /** Human-readable label shown in the UI. */
    label: string;
    /** Keywords matched against schema field title + description (lowercase). */
    keywords: string[];
    /** Words that, if present, disqualify a candidate. */
    exclude?: string[];
}

export const PROJECT_EXTRACT_FIELDS: ProjectExtractField[] = [
    {
        key: 'name',
        label: 'Project Title',
        keywords: ['project name', 'project title', 'name', 'title'],
        exclude: ['methodology', 'reference', 'pdd', 'section', 'table', 'document'],
    },
    {
        key: 'description',
        label: 'Description',
        keywords: ['description', 'project description', 'summary', 'project summary', 'abstract'],
        exclude: ['methodology', 'reference', 'pdd', 'section'],
    },
    {
        key: 'country',
        label: 'Country',
        // 'location' / 'project location' catches schemas where the country
        // field is titled "Project Location" / "Location" with a plain string
        // value (e.g. "India"). The geo field uses structural GeoJSON
        // detection, so non-GeoJSON Location-labeled fields land here without
        // double-matching.
        keywords: ['country', 'location', 'project location'],
        exclude: ['participant', 'applicant', 'coordinate', 'geojson', 'polygon', 'boundary'],
    },
    {
        key: 'developer',
        label: 'Developer',
        keywords: ['developer', 'proponent', 'organization', 'project developer', 'applicant'],
    },
    {
        key: 'category',
        label: 'Category',
        keywords: ['category', 'project type'],
    },
    {
        key: 'scale',
        label: 'Scale',
        keywords: ['scale', 'project scale'],
    },
    {
        key: 'sector',
        label: 'Sector',
        keywords: ['sector', 'activity'],
    },
    {
        key: 'vintageRaw',
        label: 'Vintage / Start Date',
        keywords: ['start date', 'commencement', 'vintage'],
    },
    {
        key: 'creditingPeriod',
        label: 'Crediting Period',
        keywords: ['crediting period'],
    },
    {
        key: 'creditingPeriodStart',
        label: 'Crediting Period Start',
        keywords: ['crediting period start', 'start date', 'commencement date'],
        exclude: ['end', 'expiry'],
    },
    {
        key: 'creditingPeriodEnd',
        label: 'Crediting Period End',
        keywords: ['crediting period end', 'end date', 'expiry date'],
        exclude: ['start', 'commencement'],
    },
    {
        key: 'sdgOrCobenefits',
        label: 'SDGs / Co-benefits',
        keywords: ['co-benefit', 'sustainable', 'sdg'],
    },
    {
        key: 'geo',
        label: 'Project Location',
        keywords: ['geo', 'location', 'coordinates', 'boundary', 'site location', 'project location', 'geometry', 'geojson', 'shape', 'polygon'],
    },
];

export type ProjectFieldKey = ProjectExtractField['key'];

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
    key: 'name' | 'description' | 'country' | 'developer' | 'developerEmail' | 'developerPhone' | 'category' | 'scale' | 'sector' | 'vintageRaw' | 'creditingPeriod' | 'creditingPeriodStart' | 'creditingPeriodEnd' | 'sdgOrCobenefits' | 'geo' | 'estimatedAnnualCredits';
    /** Human-readable label shown in the UI. */
    label: string;
    /** Keywords matched against schema field title + description (lowercase). */
    keywords: string[];
    /** Words that, if present, disqualify a candidate. */
    exclude?: string[];
    /** IWA DMRV v3 spec field path (comma-separated when one project field spans
     *  two IWA properties). CADTrust/CDOP paths derive from this via
     *  standard-field-mappings.generated.ts. */
    iwaField?: string;
}

export const PROJECT_EXTRACT_FIELDS: ProjectExtractField[] = [
    {
        key: 'name',
        label: 'Project Title',
        keywords: ['project name', 'project title', 'name', 'title'],
        exclude: ['methodology', 'reference', 'pdd', 'section', 'table', 'document'],
        iwaField: 'ActivityImpactModule.name',
    },
    {
        key: 'description',
        label: 'Description',
        keywords: ['description', 'project description', 'summary', 'project summary', 'abstract'],
        exclude: ['methodology', 'reference', 'pdd', 'section'],
        iwaField: 'ProjectModule.description',
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
        iwaField: 'ActivityImpactModule.country',
    },
    {
        key: 'developer',
        label: 'Developer',
        keywords: ['developer', 'proponent', 'organization', 'project developer', 'applicant'],
        iwaField: 'ActivityImpactModule.developers',
    },
    {
        key: 'developerEmail',
        label: 'Developer Email',
        // Guardian project schemas title this "Project Participant Email" /
        // "Contact Email" (e.g. field14, format: email). Kept off the
        // `developer` entry deliberately — that field must stay the org NAME.
        keywords: ['email', 'mail', 'e-mail', 'contact email', 'participant email', 'email address'],
        // Registry/VVB/auditor contact blocks live in the same policies and
        // would otherwise outscore the project participant's own contact info.
        exclude: ['vvb', 'validator', 'verifier', 'auditor', 'registry', 'standard registry', 'agent', 'phone', 'telephone'],
    },
    {
        key: 'developerPhone',
        label: 'Developer Phone',
        keywords: ['telephone', 'phone', 'phone number', 'contact number', 'mobile'],
        exclude: ['vvb', 'validator', 'verifier', 'auditor', 'registry', 'standard registry', 'agent', 'email', 'e-mail'],
    },
    {
        key: 'category',
        label: 'Category',
        keywords: ['category', 'project type'],
        iwaField: 'ActivityImpactModule.classificationCategory',
    },
    {
        key: 'scale',
        label: 'Scale',
        keywords: ['scale', 'project scale'],
        iwaField: 'ActivityImpactModule.projectScale',
    },
    {
        key: 'sector',
        label: 'Sector',
        keywords: ['sector', 'activity'],
        iwaField: 'ActivityImpactModule.projectScope',
    },
    {
        key: 'vintageRaw',
        label: 'Vintage / Start Date',
        keywords: ['start date', 'commencement', 'vintage', 'vintage year', 'first year issuance', 'baseline year', 'project start year'],
        iwaField: 'ActivityImpactModule.firstYearIssuance',
    },
    {
        key: 'creditingPeriod',
        label: 'Crediting Period',
        keywords: ['crediting period'],
        iwaField: 'ImpactClaim.startDate,ImpactClaim.endDate',
    },
    {
        key: 'creditingPeriodStart',
        label: 'Crediting Period Start',
        keywords: ['crediting period start', 'start date', 'commencement date', 'project start', 'crediting term start'],
        exclude: ['end', 'expiry'],
        iwaField: 'ImpactClaim.startDate',
    },
    {
        key: 'creditingPeriodEnd',
        label: 'Crediting Period End',
        keywords: ['crediting period end', 'end date', 'expiry date', 'crediting term end'],
        exclude: ['start', 'commencement'],
        iwaField: 'ImpactClaim.endDate',
    },
    {
        key: 'estimatedAnnualCredits',
        label: 'Estimated Annual Credits',
        keywords: [
            'estimated annual credit', 'estimated annual reduction', 'estimated annual issuance',
            'forecast annual issuance', 'projected annual credit', 'projected annual issuance',
            'projected annual emission reduction', 'estimated emission reduction', 'ex-ante estimate',
            'annual estimated credit',
        ],
        iwaField: 'OriginationProcessAgreement.estimatedAnnualCredits',
    },
    {
        key: 'sdgOrCobenefits',
        label: 'SDG / Co-benefits',
        keywords: ['co-benefit', 'sustainable', 'sdg'],
        iwaField: 'ActivityImpactModule.benefitCategory',
    },
    {
        key: 'geo',
        label: 'Project Location',
        keywords: ['geo', 'location', 'coordinates', 'boundary', 'site location', 'project location', 'geometry', 'geojson', 'shape', 'polygon'],
        iwaField: 'ActivityImpactModule.geographicLocation',
    },
];

export type ProjectFieldKey = ProjectExtractField['key'];

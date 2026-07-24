/**
 * Structured "Detailed Information" shapes for a single VC document.
 *
 * These mirror the interfaces the frontend project-detail page used to compute
 * live in the browser (frontend/pages/projects/[id].vue). They are now produced
 * once on the backend at VC ingestion time and stored on `message.decodedDetails`
 * so both the API and the frontend consume an already-decoded payload.
 */

export interface VcField {
    label: string;
    value: string;
    description?: string;
}

export interface VcTable {
    label: string;
    columns: string[];
    rows: Record<string, string>[];
}

export interface VcGroup {
    title: string;
    fields: VcField[];
    tables: VcTable[];
}

export interface VcDocData {
    fields: VcField[];
    tables: VcTable[];
    groups: VcGroup[];
}

/**
 * Title/description resolution maps, built once per policy from
 * `policy.rawSchemaJson`. Keyed by bare schema UUID (no leading `#`, no
 * `&version` suffix) to match how VC `credentialSubject.type` values are
 * normalised throughout the ingestion pipeline.
 */
export interface VcTitleMaps {
    /** bare schema UUID → { topLevelKey → title } */
    titles: Record<string, Record<string, string>>;
    /** bare schema UUID → { topLevelKey → description } (non-empty only) */
    descriptions: Record<string, Record<string, string>>;
    /** bare schema UUID → schemaName */
    schemaNames: Record<string, string>;
    /** schemaName.toLowerCase() → bare schema UUID */
    schemaNameToUuid: Record<string, string>;
    /** policy-wide fallback: topLevelKey → description (first-seen wins) */
    allFieldDescriptions: Record<string, string>;
}

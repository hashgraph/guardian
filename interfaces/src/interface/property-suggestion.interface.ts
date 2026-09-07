/**
 * Property suggestion field input
 */
export interface IPropertySuggestionFieldInput {
    /**
     * Name
     */
    name: string;
    /**
     * Title
     */
    title?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * Type
     */
    type?: string;
    /**
     * Current property
     */
    currentProperty?: string;
}

/**
 * Property suggestion request
 */
export interface IPropertySuggestionRequest {
    /**
     * Id of the schema the field(s) needing a suggestion belong to.
     * The schema itself (all its fields, name and description) is always
     * fetched server-side from this id, never trusted from the client.
     */
    schemaId: string;
    /**
     * Names of the fields to return suggestions for. Suggestions are still
     * computed with the full schema as context, so the same field gets the
     * same candidates regardless of how many fields were requested alongside it.
     */
    fieldNames: string[];
}

/**
 * Property suggestion candidate
 */
export interface IPropertySuggestionCandidate {
    /**
     * Title
     */
    title: string;
    /**
     * Confidence
     */
    confidence: number;
    /**
     * Rationale
     */
    rationale: string;
    /**
     * What this property means, sourced from the IWA dMRV specification.
     * Empty for IWA v1 properties.
     */
    description?: string;
}

/**
 * Property suggestion result
 */
export interface IPropertySuggestionResult {
    /**
     * Field name
     */
    fieldName: string;
    /**
     * Candidates
     */
    candidates: IPropertySuggestionCandidate[];
}

/**
 * Property suggestion response
 */
export interface IPropertySuggestionResponse {
    /**
     * Available
     */
    available: boolean;
    /**
     * Results
     */
    results: IPropertySuggestionResult[];
}

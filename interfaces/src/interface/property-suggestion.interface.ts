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
     * Schema title
     */
    schemaTitle?: string;
    /**
     * IWA dMRV specification version
     */
    iwaVersion?: string;
    /**
     * Fields
     */
    fields: IPropertySuggestionFieldInput[];
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

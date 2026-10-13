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
 * Property suggestion schema input (current editor state)
 */
export interface IPropertySuggestionSchemaInput {
    /**
     * Name
     */
    name?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * IWA version
     */
    iwaVersion?: string;
    /**
     * Fields
     */
    fields: IPropertySuggestionFieldInput[];
}

/**
 * Property suggestion request
 */
export interface IPropertySuggestionRequest {
    /**
     * Schema id (logging only)
     */
    schemaId?: string;
    /**
     * Schema
     */
    schema: IPropertySuggestionSchemaInput;
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

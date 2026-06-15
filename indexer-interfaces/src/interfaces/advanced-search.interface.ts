/**
 * Operator types for advanced search field conditions
 */
export type ConditionOperator =
    | 'eq'         // exact match  (=)
    | 'neq'        // not equal    (!=)
    | 'contains'   // case-insensitive substring
    | 'regex'      // regexp pattern
    | 'gt'         // greater than
    | 'gte'        // greater than or equal
    | 'lt'         // less than
    | 'lte'        // less than or equal
    | 'between'    // numeric/date range [from, to]
    | 'in'         // value is in the supplied list
    | 'not_in';    // value is not in the supplied list

/**
 * A single field condition in a search step
 */
export interface SearchCondition {
    /** Dot-path to the field, e.g. "analytics.policyId" or "options.credentialSubject.field" */
    field: string;
    /** Comparison operator */
    operator: ConditionOperator;
    /** Comparison value (string | number | boolean | string[] for in/not_in) */
    value: string | number | boolean | string[];
    /** Optional second value for "between" operator */
    valueTo?: string | number;
}

/**
 * One step in a multi-step advanced search.
 * Subsequent steps can reference field values from prior steps via `$step{n}.fieldPath`.
 */
export interface AdvancedSearchStep {
    /** Optional step label for UI display */
    label?: string;
    /** Document/entity type to search (e.g. "VC-Document", "VP-Document", "Policy") */
    type?: string;
    /** Additional type filters (multiple allowed) */
    types?: string[];
    /** AND-combined conditions */
    conditions: SearchCondition[];
    /**
     * Fields whose values will be carried forward for subsequent steps.
     * e.g. ["analytics.policyId", "options.credentialSubject.projectId"]
     */
    carryFields?: string[];
}

/**
 * Column definition for the result grid display
 */
export interface AdvancedSearchDisplayColumn {
    /** Field path to read from each result document */
    field: string;
    /** Header label shown in the results grid */
    header: string;
}

/**
 * Sort configuration for the result grid
 */
export interface AdvancedSearchSort {
    field: string;
    order: 'asc' | 'desc';
}

/**
 * Group-by configuration for the result grid
 */
export interface AdvancedSearchGroupBy {
    field: string;
    /** Optional range buckets for numeric/date grouping */
    ranges?: Array<{ label: string; from?: number | string; to?: number | string }>;
}

/**
 * Top-level advanced search request payload
 */
export interface AdvancedSearchParams {
    /** Ordered list of search steps; each step narrows / cross-references the prior */
    steps: AdvancedSearchStep[];
    /** Which columns to include in the result grid */
    displayColumns?: AdvancedSearchDisplayColumn[];
    /** Sort ordering of the result grid */
    sort?: AdvancedSearchSort[];
    /** Group-by for the result grid */
    groupBy?: AdvancedSearchGroupBy;
    /** Pagination */
    pageIndex: number;
    pageSize: number;
}

/**
 * One row in the advanced search result
 */
export interface AdvancedSearchResultItem {
    /** The primary step result document */
    consensusTimestamp: string;
    type: string;
    topicId?: string;
    owner?: string;
    /** Dynamic display columns resolved from displayColumns config */
    [key: string]: any;
}

/**
 * Paginated advanced search response
 */
export interface AdvancedSearchResult {
    items: AdvancedSearchResultItem[];
    total: number;
    pageIndex: number;
    pageSize: number;
    /** Column metadata for rendering the results grid */
    columns: Array<{ field: string; header: string }>;
    /** Serialised search params for bookmarking (base64-encoded JSON) */
    searchToken?: string;
}

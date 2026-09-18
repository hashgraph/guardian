/**
 * Supported filter operator tokens.
 *
 * | Token    | Meaning                         | Mongo equivalent          |
 * |----------|---------------------------------|---------------------------|
 * | eq       | equals (default)                | $eq                       |
 * | ne       | not equal                       | $ne                       |
 * | in       | in array (comma-sep str)        | $in                       |
 * | nin      | not-in array                    | $nin                      |
 * | gt       | greater than                    | $gt                       |
 * | gte      | greater than or equal           | $gte                      |
 * | lt       | less than                       | $lt                       |
 * | lte      | less than or equal              | $lte                      |
 * | contains | case-insensitive partial match  | $regex (input escaped)    |
 */
export type PolicyDataFilterOperator =
    | 'eq' | 'ne'
    | 'in' | 'nin'
    | 'gt' | 'gte'
    | 'lt' | 'lte'
    | 'contains';

/**
 * System fields that callers may filter on in the VC-document collection.
 * Every field outside this set is rejected with 400.
 */
export const VC_DOCUMENT_SYSTEM_FIELDS: ReadonlySet<string> = new Set([
    'owner', 'assignedTo', 'assignedToGroup', 'group',
    'hederaStatus', 'signature', 'type', 'draft', 'edited', 'disconnected',
    'policyId', 'schema', 'tag',
    'messageId', 'topicId', 'hash',
    'createDate', 'updateDate',
]);

/** Prefix that allows any option.* sub-field through the whitelist. */
export const VC_DOCUMENT_OPTION_PREFIX = 'option.';

/**
 * Cached credential-subject fields written to MongoDB by the policy engine.
 * Bracket notation (document.credentialSubject[0].field3) and dot notation
 * (.0.) are both accepted; callers normalise before querying.
 */
export const VC_DOCUMENT_DOCUMENT_PREFIX = 'document.';

/** Maximum allowed page size for policy-data queries. */
export const POLICY_DATA_MAX_PAGE_SIZE = 200;

/** Default page size for policy-data queries. */
export const POLICY_DATA_DEFAULT_PAGE_SIZE = 20;

/** Max length for a "contains" filter value, to bound $regex scan cost. */
export const POLICY_DATA_MAX_CONTAINS_LENGTH = 256;

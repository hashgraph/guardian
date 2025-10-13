/**
 * Rules for ignoring messages.
 * You can ignore “all messages of a given type” (by `code` or `kind`),
 * or a specific message within a scope (`blockType` + `property`).
 */
export interface IgnoreRule {
    /**
     * A stable message code. Examples:
     * - 'DEPRECATION_BLOCK'
     * - 'DEPRECATION_PROP'
     * - 'PERFORMANCE_HINT_BATCH'
     */
    code?: string;

    /**
     * A high-level category. Examples:
     * - 'deprecation'
     * - 'performance'
     * - 'best-practice'
     */
    kind?: string;

    /**
     * Scope by block type.
     */
    blockType?: string;

    /**
     * Scope by a specific property of the block.
     */
    property?: string;

    /**
     * A simple substring filter applied to the message text.
     * Helps to ignore messages even more precisely if needed.
     */
    contains?: string;
}

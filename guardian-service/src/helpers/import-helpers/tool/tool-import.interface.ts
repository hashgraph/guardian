import { PolicyTool } from '@guardian/common/entity/tool';

/**
 * Import tool mapping
 */
export interface ImportToolMap {
    oldMessageId: string;
    messageId: string;
    oldHash?: string;
    newHash?: string;
}

/**
 * Import Result
 */
export interface ImportToolResult {
    /**
     * Tool
     */
    tool: PolicyTool;
    /**
     * Errors
     */
    errors: any[];
    /**
     * Warnings
     */
    warnings?: any[];
    /**
     * Identity mapping produced by the embedded re-publish path: the archive
     * identity the entry was published from, and the new local identity.
     * Absent when the tool resolved without an identity change (by-message).
     */
    map?: ImportToolMap;
    /**
     * Identity mappings of the sub-tools imported underneath this one, so the
     * importing policy can substitute them across its config too.
     */
    maps?: ImportToolMap[];
}

/**
 * Import Results
 */
export interface ImportToolResults {
    /**
     * Tool
     */
    tools: PolicyTool[];
    /**
     * Errors
     */
    errors: any[];
    /**
     * Identity mappings reported by the entries that re-published (embedded)
     */
    maps: ImportToolMap[];
}

/**
 * A nested tool entry as found in an archive: either a legacy 5-field stub
 * ({name, description, messageId, owner, hash}) whose document is re-fetched
 * by messageId, or an embedded full tool row with `config`, `schemas` and
 * `tags` attached (the self-contained v2 format, see
 * PolicyImportExport.parseZipFile).
 *
 * A plain data shape, not the PolicyTool entity: entries come from parsed
 * JSON, and the xlsx callers of importSubTools pass their own plain tool ids.
 */
export interface ToolImportEntry {
    name?: string;
    description?: string;
    messageId?: string;
    owner?: string;
    creator?: string;
    version?: string;
    previousVersion?: string;
    hash?: string;
    topicId?: string;
    uuid?: string;
    config?: any;
    tools?: ToolImportEntry[];
    schemas?: any[];
    tags?: any[];
}

/**
 * Embedded entries of the archive being imported, keyed by their original
 * (source-network) messageId. A 3-field nested ref that carries no document
 * of its own still resolves offline this way: the ref's content is the
 * archive's own embedded copy, so no consensus-message fetch is needed.
 */
export type ToolEmbeddedRegistry = Map<string, ToolImportEntry>;

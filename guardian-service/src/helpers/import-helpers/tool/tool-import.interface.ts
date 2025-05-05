import { PolicyTool } from '@guardian/common';

/**
 * Import tool mapping
 */
export interface ImportToolMap {
    oldMessageId: string;
    messageId: string;
    oldHash: string;
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
}

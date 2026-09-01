/**
 * Policy tool metadata
 */
export interface PolicyToolMetadata {
    /**
     * Tools mapping
     */
    tools?: { [key: string]: string };
    /**
     * Schema template import behavior.
     */
    schemaTemplate?: {
        detach?: boolean;
        templateId?: string;
        templateMessageId?: string;
    };
    /**
     * Copy recorded steps flag
     */
    importRecords?: boolean;
}

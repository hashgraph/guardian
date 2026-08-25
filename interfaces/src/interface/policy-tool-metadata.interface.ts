/**
 * Policy tool metadata
 */
export interface PolicyToolMetadata {
    /**
     * Tools mapping
     */
    tools?: { [key: string]: string };
    /**
     * Schema template import behavior, one entry per applied template.
     */
    schemaTemplates?: {
        detach?: boolean;
        templateId?: string;
        templateMessageId?: string;
    }[];
    /**
     * Copy recorded steps flag
     */
    importRecords?: boolean;
}

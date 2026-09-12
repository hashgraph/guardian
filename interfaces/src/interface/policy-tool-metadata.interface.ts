/**
 * Policy tool metadata
 */
export interface PolicyToolMetadata {
    /**
     * Tools mapping
     */
    tools?: { [key: string]: string };
    /**
     * Schema template import behavior, keyed by the source template id the
     * binding was exported with - same shape as `tools`, keyed by messageId.
     */
    schemaTemplates?: {
        [sourceTemplateId: string]: {
            detach?: boolean;
            templateId?: string;
            templateMessageId?: string;
        };
    };
    /**
     * Copy recorded steps flag
     */
    importRecords?: boolean;
}

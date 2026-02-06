/**
 * Policy tool metadata
 */
export interface PolicyToolMetadata {
    /**
     * Tools mapping
     */
    tools?: { [key: string]: string };
    /**
     * Copy recorded steps flag
     */
    importRecords?: boolean;
}

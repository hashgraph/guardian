/**
 * Table field payload
 */
export interface ITableField {
    /**
     * Value type literal
     */
    type: 'table';

    /**
     * List of column keys
     */
    columnKeys?: string[];

    /**
     * Table rows (string key-value pairs per row)
     */
    rows?: Record<string, string>[];

    /**
     * GridFS file id
     */
    fileId?: string;

    /**
     * IPFS CID
     */
    cid?: string;

    /**
     * Original size in bytes
     */
    sizeBytes?: number;

    /**
     * IndexedDB cache key
     */
    idbKey?: string;
}

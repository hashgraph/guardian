/**
 * Schema tree node
 */
export interface SchemaNode {
    /**
     * Schema name
     */
    name: string;

    /**
     * Schema type
     */
    type: string;

    /**
     * Children schemas
     */
    children: SchemaNode[];
}

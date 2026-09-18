import { ISchema } from '../details/schema.details.js';

/**
 * Schema tree node data
 */
export interface SchemaTreeNodeData {
    id: string;
    color: string;
}

/**
 * Schema tree node
 */
export interface SchemaTreeNode {
    /**
     * Label
     */
    label: string;
    /**
     * Expanded
     */
    expanded: boolean;
    /**
     * Data
     */
    data: SchemaTreeNodeData;
    /**
     * Children
     */
    children: SchemaTreeNode[];
}

/**
 * Schema tree
 */
export interface SchemaTree {
    /**
     * Identifier
     */
    id: string;
    /**
     * Schema
     */
    item?: ISchema;
    /**
     * Root
     */
    root?: SchemaTreeNode;
}

export interface ISchemaArrayDependencyMapping {
    source: string[];
    target: string[];
}

/**
 * Array dependency
 */
export interface ISchemaArrayDependency {
    /**
     * Path to the dependent repeatable field
     */
    field: string[];
    /**
     * Path to the source repeatable field
     */
    on: string[];
    /**
     * Dependency kind
     */
    kind: string;
    /**
     * Path to the field of the source entry used as a block title
     */
    title?: string[];
    /**
     * Explicit values copied from source entries to dependent entries
     */
    valueMappings?: ISchemaArrayDependencyMapping[];
}

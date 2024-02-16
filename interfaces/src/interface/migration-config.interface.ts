/**
 * Migration config
 */
export interface MigrationConfig {
    /**
     * Policies
     */
    policies: {
        /**
         * Source policy
         */
        src: string;
        /**
         * Destination policy
         */
        dst: string;
    }
    /**
     * VC documents
     */
    vcs: string[];
    /**
     * VP documents
     */
    vps: string[];
    /**
     * Schemas
     */
    schemas: { [key: string]: string }
    /**
     * Groups
     */
    groups: { [key: string]: string }
    /**
     * Roles
     */
    roles: { [key: string]: string }
}
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
    };
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
    schemas: { [key: string]: string };
    /**
     * Groups
     */
    groups: { [key: string]: string };
    /**
     * Roles
     */
    roles: { [key: string]: string };

    /**
     * Blocks
     */
    blocks: { [key: string]: string };

    /**
     * Tokens
     */
    tokens: { [key: string]: string };

    /**
     * Tokens map
     */
    tokensMap: { [key: string]: string };

    /**
     * Edited VCS
     */
    editedVCs: { [key: string]: any };

    /**
     * Migrate state
     */
    migrateState: boolean;

    /**
     * Migrate retire pools
     */
    migrateRetirePools: boolean;

    /**
     * Retire contract identifier
     */
    retireContractId: string;
}

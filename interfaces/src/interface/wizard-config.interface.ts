/**
 * Grid config
 */
export interface IGridConfig {
    /**
     * Field
     */
    field: string;
    /**
     * Title
     */
    title: string;
}

/**
 * Schema role config
 */
export interface ISchemaRoleConfig {
    /**
     * Role
     */
    role: string;
    /**
     * Is approver
     */
    isApprover: boolean;
    /**
     * Is creator
     */
    isCreator: boolean;
    /**
     * Grid columns
     */
    gridColumns: IGridConfig[];
}

/**
 * Wizard schema config
 */
export interface IWizardSchemaConfig {
    /**
     * Schema name
     */
    name: string;
    /**
     * Schema iri
     */
    iri: string;
    /**
     * Is approve enable
     */
    isApproveEnable: boolean;
    /**
     * Is schema mint
     */
    isMintSchema: boolean;
    /**
     * Mint options
     */
    mintOptions: {
        /**
         * Token id
         */
        tokenId: string;
        /**
         * Rule
         */
        rule: string;
    };
    /**
     * Dependency schema iri
     */
    dependencySchemaIri: string;
    /**
     * Relationships schema iri
     */
    relationshipsSchemaIri: string;
    /**
     * Initial roles for
     */
    initialRolesFor: string[];
    /**
     * Roles config
     */
    rolesConfig: ISchemaRoleConfig[];
}

/**
 * Wizard trust chain config
 */
export interface IWizardTrustChainConfig {
    /**
     * Role
     */
    role: string;
    /**
     * Mint schema iri
     */
    mintSchemaIri: string;
    /**
     * View only own documents
     */
    viewOnlyOwnDocuments: boolean;
}

/**
 * Policy
 */
export interface IPolicyForm {
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Topic description
     */
    topicDescription: string;
    /**
     * Policy tag
     */
    policyTag: string;
}

/**
 * Wizard config
 */
export interface IWizardConfig {
    /**
     * Policy
     */
    policy: IPolicyForm;
    /**
     * Roles
     */
    roles: string[];
    /**
     * Schemas
     */
    schemas: IWizardSchemaConfig[];
    /**
     * Trust chain
     */
    trustChain: IWizardTrustChainConfig[];
}

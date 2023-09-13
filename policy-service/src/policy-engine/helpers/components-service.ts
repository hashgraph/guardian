import {
    DatabaseServer,
    Policy as PolicyCollection,
    Schema as SchemaCollection,
    VcDocument as VcDocumentCollection,
    VcDocumentDefinition as VcDocument,
    VcDocumentDefinition as HVcDocument,
    VpDocumentDefinition as VpDocument,
} from "@guardian/common";
import { PolicyType, SchemaEntity } from "@guardian/interfaces";

export class ComponentsService {
    public readonly topicId: string;
    public readonly policyId: string;
    public readonly dryRunId: string;

    public readonly policyTokens: any[];
    public readonly policyGroups: any[];
    public readonly policyRoles: string[];

    /**
     * Database instance
     * @public
     */
    public readonly databaseServer: DatabaseServer;

    constructor(policy: PolicyCollection, policyId: string) {
        this.policyId = policyId;
        this.topicId = policy.topicId;
        if (policy && policy.status === PolicyType.DRY_RUN) {
            this.dryRunId = policyId;
        } else {
            this.dryRunId = null;
        }
        this.databaseServer = new DatabaseServer(this.dryRunId);
        this.policyTokens = policy.policyTokens || [];
        this.policyGroups = policy.policyGroups || [];
        this.policyRoles = policy.policyRoles || [];
    }

    /**
     * Load schema by type
     * @param type
     */
    public async loadSchemaByType(type: SchemaEntity): Promise<SchemaCollection> {
        return await this.databaseServer.getSchemaByType(this.topicId, type);
    }

    /**
     * Load schema by id
     * @param id
     */
    public async loadSchemaByID(id: SchemaEntity): Promise<SchemaCollection> {
        return await this.databaseServer.getSchemaByIRI(id, this.topicId);
    }

    /**
     * Load artifact by id
     * @param id
     */
    public async loadArtifactByID(uuid: string): Promise<string> {
        const artifactFile = await DatabaseServer.getArtifactFileByUUID(uuid);
        return artifactFile?.toString() || '';
    }

    /**
     * Load token template by name
     * @param name
     */
    public getTokenTemplate<T>(name: string): T {
        return this.policyTokens.find((item) => item.templateTokenTag === name);
    }

    /**
     * Find Group Template
     * @param name
     */
    public getGroupTemplate<T>(name: string): T {
        return this.policyGroups.find(e => e.name === name) as T;
    }

    /**
     * Get Group Templates
     * @param name
     */
    public getGroupTemplates<T>(): T[] {
        return this.policyGroups as T[];
    }

    /**
     * Find Role Template
     * @param name
     */
    public getRoleTemplate<T>(name: string): T {
        return this.policyRoles.find(e => e === name) as T;
    }
}
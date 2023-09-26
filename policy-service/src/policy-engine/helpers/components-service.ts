import {
    DatabaseServer,
    Policy as PolicyCollection,
    PolicyTool as PolicyToolCollection,
    Schema as SchemaCollection
} from '@guardian/common';
import { PolicyType, SchemaEntity } from '@guardian/interfaces';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';

export class ComponentsService {
    public readonly topicId: string;
    public readonly policyId: string;
    public readonly dryRunId: string;

    private policyTokens: any[];
    private policyGroups: any[];
    private policyRoles: string[];
    private readonly schemasByID: Map<string, SchemaCollection>;
    private readonly schemasByType: Map<string, SchemaCollection>;

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
        this.policyTokens = [];
        this.policyGroups = [];
        this.policyRoles = [];
        this.schemasByID = new Map();
        this.schemasByType = new Map();
    }

    /**
     * Load schema by type
     * @param type
     */
    public async loadSchemaByType(type: SchemaEntity): Promise<SchemaCollection> {
        return this.schemasByType.get(type);
    }

    /**
     * Load schema by id
     * @param id
     */
    public async loadSchemaByID(id: SchemaEntity): Promise<SchemaCollection> {
        return this.schemasByID.get(id);
    }

    /**
     * Load artifact by id
     * @param id
     */
    public async loadArtifactByID(uuid: string): Promise<string> {
        const artifactFile = await DatabaseServer.getArtifactFileByUUID(uuid);
        if(artifactFile) {
            return artifactFile.toString();
        }
        return null;
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

    /**
     * Register Instance
     * @param name
     */
    public async registerPolicy(policy: PolicyCollection): Promise<void> {
        this.policyTokens = policy.policyTokens || [];
        this.policyGroups = policy.policyGroups || [];
        this.policyRoles = policy.policyRoles || [];
        if (policy.topicId) {
            const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });
            for (const schema of schemas) {
                if (schema.readonly) {
                    this.schemasByType.set(schema.entity, schema);
                }
                this.schemasByID.set(schema.iri, schema);
            }
        }
    }

    /**
     * Register Instance
     * @param name
     */
    public async registerTool(tool: PolicyToolCollection): Promise<void> {
        if (tool.topicId) {
            const schemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });
            for (const schema of schemas) {
                if (schema.readonly) {
                    this.schemasByType.set(schema.entity, schema);
                }
                this.schemasByID.set(schema.iri, schema);
            }
        }
    }

    /**
     * Register Instance
     * @param name
     */
    public async registerInstance(blockInstance: IPolicyBlock): Promise<void> {
        return;
    }
}
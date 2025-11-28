import {
    DatabaseServer,
    HederaDidDocument,
    IAuthUser,
    PinoLogger,
    Policy as PolicyCollection,
    PolicyTool as PolicyToolCollection,
    Schema as SchemaCollection,
    VcHelper
} from '@guardian/common';
import { GenerateUUIDv4, PolicyHelper, SchemaEntity } from '@guardian/interfaces';
import { PrivateKey } from '@hiero-ledger/sdk';
import { IPolicyBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { Recording, Running } from '../record/index.js';
import { IDebugContext } from '../block-engine/block-result.js';

export class ComponentsService {
    /**
     * Policy topic ID
     */
    public readonly topicId: string;
    /**
     * Policy ID
     */
    public readonly policyId: string;
    /**
     * Policy Owner
     */
    public readonly owner: string;
    /**
     * Policy ID
     */
    public readonly dryRunId: string;
    /**
     * Token templates
     */
    private policyTokens: any[];
    /**
     * Group templates
     */
    private policyGroups: any[];
    /**
     * Roles
     */
    private policyRoles: string[];
    /**
     * Schemas
     */
    private readonly schemasByID: Map<string, SchemaCollection>;
    /**
     * Schemas
     */
    private readonly schemasByType: Map<string, SchemaCollection>;
    /**
     * Root block
     */
    private root: IPolicyBlock;
    /**
     * Database instance
     * @public
     */
    public readonly databaseServer: DatabaseServer;
    /**
     * Logger instance
     * @protected
     */
    public readonly logger: PinoLogger;

    constructor(policy: PolicyCollection, policyId: string) {
        this.owner = policy.owner;
        this.policyId = policyId;
        this.topicId = policy.topicId;
        if (PolicyHelper.isDryRunMode(policy)) {
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
        this._recordingController = null;
        this._runningController = null;
        this.logger = new PinoLogger();
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
    public async loadSchemaByID(id: string): Promise<SchemaCollection> {
        return this.schemasByID.get(id);
    }

    /**
     * Load artifact by id
     * @param id
     */
    public async loadArtifactByID(uuid: string): Promise<string> {
        const artifactFile = await DatabaseServer.getArtifactFileByUUID(uuid);
        if (artifactFile) {
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
    public async registerPolicy(policy: PolicyCollection | PolicyToolCollection): Promise<void> {
        this.policyTokens = (policy as PolicyCollection).policyTokens || [];
        this.policyGroups = (policy as PolicyCollection).policyGroups || [];
        this.policyRoles = (policy as PolicyCollection).policyRoles || [];
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
     * Register root
     * @param name
     */
    public async registerRoot(blockInstance: IPolicyBlock): Promise<void> {
        this.root = blockInstance;
    }

    /**
     * Select Policy Group
     * @param policy
     * @param user
     * @param uuid
     */
    public async selectGroup(
        user: PolicyUser,
        uuid: string
    ): Promise<boolean> {
        const templates = this.getGroupTemplates<any>();
        if (templates.length === 0) {
            return false;
        }
        await this.databaseServer.setActiveGroup(
            this.policyId,
            user.did,
            uuid
        );
        return true;
    }

    /**
     * Generate new UUID
     */
    public async generateUUID(): Promise<string> {
        if (this._runningController) {
            return await this._runningController.nextUUID();
        }
        const uuid = GenerateUUIDv4();
        if (this._recordingController) {
            await this._recordingController.generateUUID(uuid);
        }
        return uuid;
    }

    /**
     * Generate new DID
     */
    public async generateDID(topicId: string): Promise<HederaDidDocument> {
        if (this._runningController) {
            return await this._runningController.nextDID(topicId);
        } else {
            const privateKey = PrivateKey.generate();
            const vcHelper = new VcHelper();
            const didDocument = await vcHelper.generateNewDid(topicId, privateKey);
            if (this._recordingController) {
                await this._recordingController.generateDidDocument(didDocument);
            }
            return didDocument;
        }
    }

    /**
     * Recording Controller
     */
    private _recordingController: Recording;

    /**
     * Running Controller
     */
    private _runningController: Running;

    public get recordingController(): Recording | null {
        return this._recordingController;
    }

    public get runningController(): Running | null {
        return this._runningController;
    }

    public get runAndRecordController(): Recording | Running | null {
        return this._recordingController || this._runningController;
    }

    /**
     * Start Recording
     */
    public async startRecording(): Promise<boolean> {
        if (this._runningController) {
            return false;
        }
        if (!this._recordingController) {
            this._recordingController = new Recording(this.policyId, this.owner);
        }
        return await this._recordingController.start();
    }

    /**
     * Stop Recording
     */
    public async stopRecording(): Promise<boolean> {
        if (this._recordingController) {
            const old = this._recordingController;
            this._recordingController = null;
            return await old.stop();
        }
        if (this._runningController) {
            const old = this._runningController;
            this._runningController = null;
            return old.finished();
        }
        return false;
    }

    /**
     * Stop Running
     */
    public async stopRunning(): Promise<boolean> {
        if (this._recordingController) {
            const old = this._recordingController;
            this._recordingController = null;
            return await old.stop();
        }
        if (this._runningController) {
            const old = this._runningController;
            this._runningController = null;
            return old.finished();
        }
        return true;
    }

    /**
     * Destroy Recording
     */
    public async destroyRecording(): Promise<boolean> {
        if (this._recordingController) {
            const old = this._recordingController;
            this._recordingController = null;
            return await old.destroy();
        }
        if (this._runningController) {
            const old = this._runningController;
            this._runningController = null;
            return await old.destroy();
        }
        return false;
    }

    /**
     * Destroy Running
     */
    public async destroyRunning(): Promise<boolean> {
        if (this._recordingController) {
            const old = this._recordingController;
            this._recordingController = null;
            return await old.destroy();
        }
        if (this._runningController) {
            const old = this._runningController;
            this._runningController = null;
            return await old.destroy();
        }
        return false;
    }

    /**
     * Run Record
     * @param actions
     * @param results
     * @param options
     */
    public async runRecord(
        actions: any[],
        results: any[],
        options: any
    ): Promise<string> {
        if (this._recordingController) {
            return null;
        }
        if (this._runningController) {
            this._runningController.finished();
        }
        this._runningController = new Running(
            this.root,
            this.policyId,
            this.owner,
            actions,
            results,
            options
        );
        return this._runningController.start();
    }

    /**
     * Skip running delay
     * @param options
     */
    public async fastForward(options: any): Promise<boolean> {
        if (this._runningController) {
            return this._runningController.fastForward(options);
        }
        return false;
    }

    /**
     * Retry running step
     * @param options
     */
    public async retryStep(options: any): Promise<boolean> {
        if (this._runningController) {
            return this._runningController.retryStep();
        }
        return null;
    }

    /**
     * Skip running step
     * @param options
     */
    public async skipStep(options: any): Promise<boolean> {
        if (this._runningController) {
            return this._runningController.skipStep();
        }
        return null;
    }

    /**
     * Write log message
     * @param message
     */
    public info(message: string, attributes: string[] | null, userId?: string | null) {
        this.logger.info(message, attributes, userId);
    }

    /**
     * Write error message
     * @param message
     */
    public error(message: string, attributes: string[] | null, userId?: string | null) {
        this.logger.error(message, attributes, userId);
    }

    /**
     * Write warn message
     * @param message
     */
    public warn(message: string, attributes: string[] | null, userId?: string | null) {
        this.logger.warn(message, attributes, userId);
    }

    /**
     * Write debug message
     * @param message
     */
    public debug(message: any) {
        return;
    }

    /**
     * Save and update debug context
     * @param context
     */
    public async debugContext(tag: string, context: IDebugContext): Promise<IDebugContext> {
        await DatabaseServer.saveDebugContext({
            policyId: this.policyId,
            tag,
            document: context
        });
        return context;
    }

    /**
     * Save debug error
     * @param context
     * @protected
     */
    public debugError(tag: string, error: any): void {
        return;
    }

    /**
     * Get Virtual User
     * @param did
     */
    public getVirtualUser(did: string): Promise<IAuthUser> {
        return this.databaseServer.getVirtualUser(did);
    }

    /**
     * Get document comments
     * @param documentId
     */
    public async getPolicyCommentsCount(target: any, user: PolicyUser): Promise<number> {
        try {
            const ids = new Set<string>();
            ids.add(target.id?.toString());
            if (target.startMessageId) {
                const documents = await DatabaseServer.getVCs({
                    policyId: this.policyId,
                    startMessageId: target.startMessageId
                }, { fields: ['_id', 'id', 'messageId'] } as any);
                for (const item of documents) {
                    ids.add(item.id?.toString());
                }
            }
            const discussions = await DatabaseServer.getPolicyDiscussions({
                policyId: this.policyId,
                targetId: { $in: Array.from(ids) },
                $or: [{
                    privacy: 'public'
                }, {
                    privacy: 'roles',
                    roles: user.role
                }, {
                    privacy: 'users',
                    users: user.did
                }, {
                    owner: user.did
                }]
            }, { fields: ['count'] } as any);
            let count = 0;
            for (const discussion of discussions) {
                count += discussion.count;
            }
            return count;
        } catch (error) {
            console.error(error);
            return 0;
        }
    }
}

import {
    DatabaseServer,
    HederaDidDocument,
    MessageAction,
    MessageServer,
    Policy,
    PolicyRecordMessage,
    Record,
    RecordImportExport,
    TopicConfig,
    Users
} from '@guardian/common';
import { GenerateUUIDv4, ISignOptions, PolicyEvents } from '@guardian/interfaces';
import { BlockTreeGenerator } from '../block-tree-generator.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { RecordingStatus } from './status.type.js';
import { RecordAction } from './action.type.js';
import { RecordMethod } from './method.type.js';
import { RecordItem } from './record-item.js';
import { FilterObject } from '@mikro-orm/core';
import { PopulatePath } from '@mikro-orm/mongodb';

/**
 * Recording controller
 */
export interface RecordingOptions {
    /**
     * Recording mode
     */
    mode?: 'manual' | 'auto';
    /**
     * Enable or disable recording entirely
     */
    enabled?: boolean;
    /**
     * Upload each step to IPFS
     */
    uploadToIpfs?: boolean;

    /**
     * For published policies, set storeInDb = false so we don't keep steps in DB.
     * For draft/demo policies, it can be true.
     */
    storeInDb?: boolean;

    /**
     * messageId of the published policy (Hedera message id),
     * so that steps can be linked to this policy.
     */
    policyMessageId?: string | null;

    /**
     * Hedera parameters for sending each record step as a message.
     */
    hedera?: {
        topicId: string;
        submitKey?: string | null;
        operatorId: string;
        operatorKey: string;
        signOptions?: ISignOptions;
        dryRun?: string | null;
    };
}

export class Recording {
    /**
     * Controller type
     */
    public readonly type: string = 'Recording';
    /**
     * Controller ID
     */
    public readonly uuid: string;
    /**
     * Policy ID
     */
    public readonly policyId: string;
    /**
     * Policy owner
     */
    public readonly owner: string;
    /**
     * Block messenger
     */
    private readonly tree: BlockTreeGenerator;
    /**
     * Recording status
     */
    private _status: RecordingStatus;
    /**
     * Recording mode
     */
    private readonly mode: 'manual' | 'auto';
    /**
     * Recording enabled flag
     */
    private readonly enabled: boolean;
    /**
     * Upload flag
     */
    private readonly uploadToIpfs: boolean;
    /**
     * Store steps in DB
     */
    private readonly storeInDb: boolean;
    /**
     * Hedera options for record messages
     */
    private hedera?: RecordingOptions['hedera'];
    /**
     * Source policy message id to link steps
     */
    private policyMessageId?: string | null;
    /**
     * Prevent duplicate start step
     */
    private startRecordSent = false;

    constructor(policyId: string, owner: string, options: RecordingOptions = {}) {
        this.policyId = policyId;
        this.owner = owner;
        this.uuid = GenerateUUIDv4();
        this.tree = new BlockTreeGenerator();
        this.mode = options.mode || 'manual';
        this.enabled = options.enabled !== false;
        this.uploadToIpfs = options.uploadToIpfs ?? (this.mode === 'auto');
        this.storeInDb = options.storeInDb ?? true;
        this.hedera = options.hedera;
        this.policyMessageId = options.policyMessageId ?? null;
        this._status = (this.mode === 'auto' && this.enabled)
            ? RecordingStatus.Recording
            : RecordingStatus.New;
    }

    /**
     * Check if recording is active
     * @private
     */
    private isActive(): boolean {
        return this.enabled && (this.mode === 'auto' || this._status === RecordingStatus.Recording);
    }

    /**
     * Append record entry
     * @param entry
     * @private
     */
    private async appendRecord(entry: {
        method: RecordMethod,
        action: RecordAction | null,
        user: string,
        target: string,
        document: any,
        recordActionId?: any
    }): Promise<void> {
        if (!this.isActive()) {
            return;
        }
        const payload: FilterObject<Record> = {
            uuid: this.uuid,
            policyId: this.policyId,
            method: entry.method,
            action: entry.action,
            time: Date.now(),
            user: entry.user ?? null,
            target: entry.target ?? null,
            document: entry.document ?? null
        } as FilterObject<Record>;
        const documentSnapshot = this.cloneDocument(entry.document);
        // if (this.storeInDb) {
        const savedRecord = await DatabaseServer.createRecord(payload);
        // }
        // await this.persistStepWithMessageServer(savedRecord, payload, documentSnapshot);
        if (this.uploadToIpfs) {
            console.log(entry.recordActionId, 'entry.recordActionIdentry.recordActionId');
            const recordId: any = (savedRecord as any)?.id || (savedRecord as any)?._id;
            this.tree.sendMessage(PolicyEvents.RECORD_PERSIST_STEP, {
                // policyId: this.policyId,
                // recordingUuid: this.uuid,
                // recordId: (savedRecord as any)?.id || (savedRecord as any)?._id,
                // payload,
                // documentSnapshot,
                // hederaOptions: this.hedera
                policyId: this.policyId,
                policyMessageId: this.policyMessageId ?? null,
                recordingUuid: this.uuid,
                recordId,
                payload,
                documentSnapshot,
                hedera: this.hedera ?? null,
                uploadToIpfs: this.uploadToIpfs,
                recordActionId: entry.recordActionId
            });
        }

        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
    }

    /**
     * Clone document
     * @param document
     * @private
     */
    private cloneDocument<T>(document: T): T {
        if (document === undefined || document === null) {
            return document;
        }
        try {
            return JSON.parse(JSON.stringify(document));
        } catch (error) {
            return document;
        }
    }

    /**
     * Build result payload for step
     * @param documentSnapshot
     * @param payload
     * @param recordId
     * @private
     */
    private buildStepResults(
        documentSnapshot: any,
        payload: FilterObject<Record>,
        recordId: any
    ): { id: string, type: 'vc' | 'vp' | 'schema', document: any }[] {
        if (!documentSnapshot) {
            return [];
        }
        return [{
            id: this.extractResultId(documentSnapshot, payload, recordId),
            type: this.detectResultType(documentSnapshot),
            document: documentSnapshot
        }];
    }

    /**
     * Extract result identifier
     * @private
     */
    private extractResultId(
        documentSnapshot: any,
        payload: FilterObject<Record>,
        recordId: any
    ): string {
        if (typeof documentSnapshot?.id === 'string') {
            return documentSnapshot.id;
        }
        if (typeof documentSnapshot?.document?.id === 'string') {
            return documentSnapshot.document.id;
        }
        if (typeof payload.target === 'string' && payload.target) {
            return payload.target;
        }
        if (typeof payload.action === 'string' && payload.action) {
            return `${payload.action}-${recordId?.toString?.() || this.uuid}`;
        }
        return recordId?.toString?.() || this.uuid;
    }

    /**
     * Determine result type
     * @private
     */
    private detectResultType(documentSnapshot: any): 'vc' | 'vp' | 'schema' {
        const rawTypes = documentSnapshot?.type;
        const types = Array.isArray(rawTypes)
            ? rawTypes
            : rawTypes
                ? [rawTypes]
                : [];
        if (types.some((t: any) => typeof t === 'string' && /presentation/i.test(t))) {
            return 'vp';
        }
        if (types.some((t: any) => typeof t === 'string' && /credential/i.test(t))) {
            return 'vc';
        }
        return 'schema';
    }

    /**
     * Start recording
     * @public
     */
    public async start(): Promise<boolean> {
        if (!this.enabled) {
            return false;
        }
        if (this.mode === 'auto') {
            return true;
        }
        if (this._status === RecordingStatus.Recording) {
            return true;
        }
        const payload: FilterObject<Record> = {
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Start,
            action: null,
            time: Date.now(),
            user: this.owner,
            target: null,
            document: null
        } as FilterObject<Record>;
        // if (this.storeInDb) {
            await DatabaseServer.createRecord(payload);
        // }
        // await this.persistStepWithMessageServer(payload, null);
        this._status = RecordingStatus.Recording;
        // this.startRecordSent = true;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Stop recording
     * @public
     */
    public async stop(): Promise<boolean> {
        if (!this.enabled) {
            return false;
        }
        if (this.mode === 'auto') {
            return true;
        }
        if (this._status !== RecordingStatus.Recording) {
            return false;
        }
        const payload: FilterObject<Record> = {
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Stop,
            action: null,
            time: Date.now(),
            user: null,
            target: null,
            document: null
        } as FilterObject<Record>;
        // if (this.storeInDb) {
            await DatabaseServer.createRecord(payload);
        // }
        // await this.persistStepWithMessageServer(payload, null);
        this._status = RecordingStatus.Stopped;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Destroy recording
     * @public
     */
    public async destroy(): Promise<boolean> {
        this._status = RecordingStatus.Stopped;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Record event (Select Group)
     * @param user
     * @param uuid
     * @public
     */
    public async selectGroup(user: PolicyUser, uuid: string): Promise<void> {
        await this.appendRecord({
            method: RecordMethod.Action,
            action: RecordAction.SelectGroup,
            user: user?.did,
            target: null,
            document: { uuid }
        });
    }

    /**
     * Record event (Set Block Data)
     * @param user
     * @param block
     * @param data
     * @public
     */
    public async setBlockData(user: PolicyUser, block: AnyBlockType, data: any, recordActionId: any): Promise<void> {
        if (!this.isActive()) {
            return;
        }
        await this.addDocumentUUID(data, block);
        await this.appendRecord({
            method: RecordMethod.Action,
            action: RecordAction.SetBlockData,
            user: user?.did,
            target: block?.tag,
            document: data,
            recordActionId,
        });
    }

    /**
     * Record event (Set External Data)
     * @param data
     * @public
     */
    public async externalData(data: any): Promise<void> {
        await this.appendRecord({
            method: RecordMethod.Action,
            action: RecordAction.SetExternalData,
            user: null,
            target: null,
            document: data
        });
    }

    /**
     * Record event (Create User)
     * @param did
     * @param data
     * @public
     */
    public async createUser(did: string, data: any): Promise<void> {
        await this.appendRecord({
            method: RecordMethod.Action,
            action: RecordAction.CreateUser,
            user: did,
            target: null,
            document: data
        });
    }

    /**
     * Record event (Set User)
     * @param did
     * @public
     */
    public async setUser(did: string): Promise<void> {
        await this.appendRecord({
            method: RecordMethod.Action,
            action: RecordAction.SetUser,
            user: did,
            target: null,
            document: null
        });
    }

    /**
     * Record event (Generate UUID)
     * @param uuid
     * @public
     */
    public async generateUUID(uuid: string): Promise<void> {
        if (!this.isActive()) {
            return;
        }
        await this.appendRecord({
            method: RecordMethod.Generate,
            action: RecordAction.GenerateUUID,
            user: null,
            target: null,
            document: { uuid }
        });
    }

    /**
     * Record event (Generate DID)
     * @param didDocument
     * @public
     */
    public async generateDidDocument(didDocument: HederaDidDocument): Promise<void> {
        if (!this.isActive()) {
            return;
        }
        const did = didDocument.getDid();
        await this.appendRecord({
            method: RecordMethod.Generate,
            action: RecordAction.GenerateDID,
            user: null,
            target: null,
            document: { did }
        });
    }

    /**
     * Get Recorded actions
     * @public
     */
    public async getActions(): Promise<RecordItem[]> {
        return await DatabaseServer.getRecord(
            {
                uuid: this.uuid,
                policyId: this.policyId,
                method: {
                    $in: [
                        RecordMethod.Start,
                        RecordMethod.Action,
                        RecordMethod.Stop
                    ]
                }
            },
            {
                fields: [
                    'uuid',
                    'policyId',
                    'method',
                    'action',
                    'time',
                    'user',
                    'target'
                ] as unknown as PopulatePath.ALL[]
            }
        ) as any;
    }

    /**
     * Get status
     * @public
     */
    public get status(): RecordingStatus {
        return this._status;
    }

    /**
     * Get full status
     * @public
     */
    public getStatus() {
        return {
            type: this.type,
            policyId: this.policyId,
            uuid: this.uuid,
            status: this._status
        }
    }

    /**
     * Get results
     * @public
     */
    public async getResults(): Promise<any> {
        return null;
    }

    /**
     * Update Hedera options and policy message link
     * @param options
     * @param policyMessageId
     */
    public setHederaOptions(options: RecordingOptions['hedera'], policyMessageId?: string | null): void {
        this.hedera = options;
        if (policyMessageId !== undefined) {
            this.policyMessageId = policyMessageId;
        }
    }

    /**
     * Add uuid in document
     * @param data
     * @public
     */
    private async addDocumentUUID(data: any, block: AnyBlockType): Promise<void> {
        //multi-sign-block
        if (block.blockType === 'multiSignBlock') {
            if (data?.document?.id && !data?.document?.uuid) {
                const doc = await (new DatabaseServer(this.policyId)).getVcDocument(data.document.id);
                if (doc) {
                    data.document.uuid = doc.document?.id;
                }
            }
        }
    }

    /**
 * Persist record step via MessageServer (IPFS + Hedera)
 * @param payload
 * @param documentSnapshot
 * @private
 */
private async persistStepWithMessageServer(
    savedRecord: Record,
    payload: FilterObject<Record>,
    documentSnapshot: any
): Promise<void> {
    if (!this.uploadToIpfs) {
        return;
    }
    try {
        let topicConfig: TopicConfig;
        let operatorId: string;
        let operatorKey: string;
        let signOptions: ISignOptions | undefined;
        let dryRun: string | null = null;
        let policyMessageId: string | null = this.policyMessageId ?? null;
        const recordId: any = (savedRecord as any)?.id || (savedRecord as any)?._id;

        if (this.hedera?.topicId && this.hedera.operatorId && this.hedera.operatorKey) {
            const topicRow = await DatabaseServer.getTopicById(this.hedera.topicId);
            topicConfig = await TopicConfig.fromObject(topicRow, false, null);

            operatorId = this.hedera.operatorId;
            operatorKey = this.hedera.operatorKey;
            signOptions = this.hedera.signOptions;
            dryRun = this.hedera.dryRun ?? null;

            if (!policyMessageId) {
                const policy = await DatabaseServer.getPolicyById(this.policyId) as Policy;
                policyMessageId = policy?.messageId || null;
            }
        } else {
            const policy = await DatabaseServer.getPolicyById(this.policyId) as Policy;
            if (!policy || !policy.recordsTopicId || !policy.owner) {
                console.error(`Recording: unable to resolve policy/recordsTopicId topic for policy ${this.policyId}`);
                return;
            }

            policyMessageId = policy.messageId || null;

            const topicRow = await DatabaseServer.getTopicById(policy.recordsTopicId);
            topicConfig = await TopicConfig.fromObject(topicRow, false, null);

            const users = new Users();
            const root = await users.getHederaAccount(policy.owner, null);

            operatorId = root.hederaAccountId;
            operatorKey = root.hederaAccountKey;
            signOptions = root.signOptions;
        }

        // const recordId = GenerateUUIDv4();
        // const fakeRecord: Record = {
        //     ...(payload as any),
        //     id: recordId,
        //     document: documentSnapshot ?? null
        // } as unknown as Record;

            const resultDocuments = this.buildStepResults(documentSnapshot, payload, recordId);
            const zip = await RecordImportExport.generateSingleRecordZip({
                ...savedRecord,
                document: documentSnapshot ?? null
            } as Record, resultDocuments);
        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 3 }
        });

        const message = new PolicyRecordMessage(MessageAction.PolicyRecordStep);
        message.setDocument(
            {
                policyId: this.policyId,
                policyMessageId,
                recordingUuid: this.uuid,
                recordId,
                method: String(payload.method),
                action: payload.action ? String(payload.action) : null,
                time: payload.time as number,
                user: (payload.user as string) ?? null,
                target: (payload.target as string) ?? null
            },
            buffer
        );

        const messageServer = new MessageServer({
            operatorId,
            operatorKey,
            encryptKey: null,
            signOptions,
            dryRun
        });

        await messageServer
            .setTopicObject(topicConfig)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: `RECORD:${this.policyId}`,
                userId: null,
                interception: null
            });
    } catch (error) {
        console.error(`Recording: unable to persist step for policy ${this.policyId}`, error);
    }
}


    // public async ensureStartRecordForPublishedPolicy(): Promise<void> {
    //     if (this.mode === 'auto' && this.enabled) {
    //         await this.createStartRecordIfNeeded();
    //     }
    // }

    // private async createStartRecordIfNeeded(): Promise<void> {
    //     try {
    //         if (this.startRecordSent) {
    //             return;
    //         }
    //         if (this.storeInDb) {
    //             const existing = await DatabaseServer.getRecord(
    //                 {
    //                     policyId: this.policyId,
    //                     copiedRecordId: null,
    //                     fromPolicyId: null
    //                 } as any,
    //                 { limit: 1, fields: ['_id', 'uuid'] } as any
    //             );
    //             if (Array.isArray(existing) && existing.length) {
    //                 this.startRecordSent = true;
    //                 return;
    //             }
    //         }
    //         const payload: FilterObject<Record> = {
    //             uuid: this.uuid,
    //             policyId: this.policyId,
    //             method: RecordMethod.Start,
    //             action: null,
    //             time: Date.now(),
    //             user: this.owner,
    //             target: null,
    //             document: null
    //         } as FilterObject<Record>;
    //         if (this.storeInDb) {
    //             await DatabaseServer.createRecord(payload);
    //         }
    //         await this.persistStepWithMessageServer(payload, null);
    //         // this.startRecordSent = true;
    //     } catch (error) {
    //         console.error(`Recording: unable to ensure start record for policy ${this.policyId}`, error);
    //     }
    // }

}

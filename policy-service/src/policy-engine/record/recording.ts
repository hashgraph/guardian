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
import { GenerateUUIDv4, ISignOptions, PolicyEvents, RecordMethod } from '@guardian/interfaces';
import { BlockTreeGenerator } from '../block-tree-generator.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { RecordingStatus } from './status.type.js';
import { RecordAction } from './action.type.js';
import { RecordItem } from './record-item.js';
import { FilterObject } from '@mikro-orm/core';
import { PopulatePath } from '@mikro-orm/mongodb';

export interface RecordingOptions {
    /**
     * Recording mode
     */
    mode?: 'manual' | 'auto';
    /**
     * Upload each step to IPFS
     */
    uploadToIpfs?: boolean;

    /**
     * messageId of the published policy (Hedera message id)
     */
    policyMessageId?: string | null;

    /**
     * Hedera parameters for sending each record step as a message.
     */
    hederaOptions?: {
        topicId: string;
        submitKey?: string | null;
        operatorId: string;
        operatorKey: string;
        signOptions?: ISignOptions;
        dryRun?: string | null;
    };
}

/**
 * Recording controller
 */

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
     * Upload flag
     */
    private readonly uploadToIpfs: boolean;
    /**
     * Hedera options for record messages
     */
    private hederaOptions?: RecordingOptions['hederaOptions'];
    /**
     * Source policy message id to link steps
     */
    private policyMessageId?: string | null;

    constructor(policyId: string, owner: string, options: RecordingOptions = {}) {
        this.policyId = policyId;
        this.owner = owner;
        this.uuid = GenerateUUIDv4();
        this.tree = new BlockTreeGenerator();
        this.mode = options.mode || 'manual';
        this.uploadToIpfs = options.uploadToIpfs ?? (this.mode === 'auto');
        this.hederaOptions = options.hederaOptions;
        this.policyMessageId = options.policyMessageId ?? null;
        this._status = this.mode === 'auto'
            ? RecordingStatus.Recording
            : RecordingStatus.New;
    }

    /**
     * Check if recording is active
     * @private
     */
    private isActive(): boolean {
        return this.mode === 'auto' || this._status === RecordingStatus.Recording;
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
        recordActionId?: string,
        actionTimestemp?: number,
        userFull?: PolicyUser
    }): Promise<void> {
        if (!this.isActive()) {
            return;
        }
        const payload: FilterObject<Record> = {
            uuid: this.uuid,
            policyId: this.policyId,
            method: entry.method,
            action: entry.action,
            time: entry?.actionTimestemp || Date.now(),
            user: entry.user ?? null,
            target: entry.target ?? null,
            document: entry.document ?? null,
            recordActionId: entry.recordActionId ?? null,
        } as FilterObject<Record>;
        // const documentSnapshot = this.cloneDocument(entry.document);
        if (!this.uploadToIpfs) {
            await DatabaseServer.createRecord(payload);
        }
        if (this.uploadToIpfs) {
            // const recordId: any = (savedRecord as any)?.id || (savedRecord as any)?._id;
            this.tree.sendMessage(PolicyEvents.RECORD_PERSIST_STEP, {
                policyId: this.policyId,
                policyMessageId: this.policyMessageId ?? null,
                recordingUuid: this.uuid,
                // recordId,
                payload,
                // documentSnapshot,
                actionTimestemp: entry.actionTimestemp,
                hederaOptions: this.hederaOptions ?? null,
                uploadToIpfs: this.uploadToIpfs,
                // recordActionId: entry.recordActionId,
                userFull: entry.userFull,
            });
        }

        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
    }

    /**
     * Clone document
     * @param document
     * @private
     */
    // private cloneDocument<T>(document: T): T {
    //     if (document === undefined || document === null) {
    //         return document;
    //     }
    //     try {
    //         return JSON.parse(JSON.stringify(document));
    //     } catch (error) {
    //         return document;
    //     }
    // }

    /**
     * Start recording
     * @public
     */
    public async start(): Promise<boolean> {
        if (this.mode === 'auto') {
            return true;
        }
        if (this._status === RecordingStatus.Recording) {
            return true;
        }
            await DatabaseServer.createRecord({
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Start,
            action: null,
            time: Date.now(),
            user: this.owner,
            target: null,
            document: null
        } as FilterObject<Record>);
        this._status = RecordingStatus.Recording;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Stop recording
     * @public
     */
    public async stop(): Promise<boolean> {
        if (this.mode === 'auto') {
            return true;
        }
        if (this._status !== RecordingStatus.Recording) {
            return false;
        }
        await DatabaseServer.createRecord({
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Stop,
            action: null,
            time: Date.now(),
            user: null,
            target: null,
            document: null
        } as FilterObject<Record>);
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
            userFull: user,
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
    public async setBlockData(user: PolicyUser, block: AnyBlockType, data: any, recordActionId: string, actionTimestemp: number): Promise<void> {
        if (!this.isActive()) {
            return;
        }
        await this.addDocumentUUID(data, block);
        await this.appendRecord({
            method: RecordMethod.Action,
            action: RecordAction.SetBlockData,
            user: user?.did,
            userFull: user,
            target: block?.tag,
            document: data,
            actionTimestemp,
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
    public setHederaOptions(options: RecordingOptions['hederaOptions'], policyMessageId?: string | null): void {
        this.hederaOptions = options;
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
}

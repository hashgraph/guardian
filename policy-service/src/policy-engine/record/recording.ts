import { DatabaseServer, HederaDidDocument, Record } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
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

    constructor(policyId: string, owner: string) {
        this.policyId = policyId;
        this.owner = owner;
        this.uuid = GenerateUUIDv4();
        this.tree = new BlockTreeGenerator();
        this._status = RecordingStatus.New;
    }

    /**
     * Record action
     * @param action
     * @param target
     * @param user
     * @param document
     * @private
     */
    private async record(
        action: string,
        target: string,
        user: string,
        document: any
    ): Promise<void> {
        await DatabaseServer.createRecord({
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Action,
            action,
            time: Date.now(),
            user,
            target,
            document
        } as FilterObject<Record>);
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
    }

    /**
     * Start recording
     * @public
     */
    public async start(): Promise<boolean> {
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
        await this.record(RecordAction.SelectGroup, null, user?.did, { uuid });
    }

    /**
     * Record event (Set Block Data)
     * @param user
     * @param block
     * @param data
     * @public
     */
    public async setBlockData(user: PolicyUser, block: AnyBlockType, data: any): Promise<void> {
        await this.addDocumentUUID(data, block);
        await this.record(RecordAction.SetBlockData, block?.tag, user?.did, data);
    }

    /**
     * Record event (Set External Data)
     * @param data
     * @public
     */
    public async externalData(data: any): Promise<void> {
        await this.record(RecordAction.SetExternalData, null, null, data);
    }

    /**
     * Record event (Create User)
     * @param did
     * @param data
     * @public
     */
    public async createUser(did: string, data: any): Promise<void> {
        await this.record(RecordAction.CreateUser, null, did, data);
    }

    /**
     * Record event (Set User)
     * @param did
     * @public
     */
    public async setUser(did: string): Promise<void> {
        await this.record(RecordAction.SetUser, null, did, null);
    }

    /**
     * Record event (Generate UUID)
     * @param uuid
     * @public
     */
    public async generateUUID(uuid: string): Promise<void> {
        await DatabaseServer.createRecord({
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Generate,
            action: RecordAction.GenerateUUID,
            time: Date.now(),
            user: null,
            target: null,
            document: { uuid }
        } as FilterObject<Record>);
    }

    /**
     * Record event (Generate DID)
     * @param didDocument
     * @public
     */
    public async generateDidDocument(didDocument: HederaDidDocument): Promise<void> {
        const did = didDocument.getDid();
        await DatabaseServer.createRecord({
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Generate,
            action: RecordAction.GenerateDID,
            time: Date.now(),
            user: null,
            target: null,
            document: { did }
        } as FilterObject<Record>);
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

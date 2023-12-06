import { DIDDocument, DatabaseServer } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';
import { RecordingStatus } from './status.type';
import { RecordAction } from './action.type';
import { RecordMethod } from './method.type';
import { RecordItem } from './record-item';

export class Recording {
    public readonly type: string = 'Recording';
    public readonly uuid: string;
    public readonly policyId: string;
    private readonly tree: BlockTreeGenerator;

    private _status: RecordingStatus;

    constructor(policyId: string, uuid?: string) {
        this.policyId = policyId;
        this.uuid = uuid || GenerateUUIDv4();
        this.tree = new BlockTreeGenerator();
        this._status = RecordingStatus.New;
    }

    /**
     * Record policy
     * @param policyId
     * @param method
     * @param msg
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
        });
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
    }

    /**
     * Record policy
     * @param policyId
     * @param method
     * @param msg
     */
    public async start(): Promise<boolean> {
        await DatabaseServer.createRecord({
            uuid: this.uuid,
            policyId: this.policyId,
            method: RecordMethod.Start,
            action: null,
            time: Date.now(),
            user: null,
            target: null,
            document: null
        });
        this._status = RecordingStatus.Recording;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Record policy
     * @param policyId
     * @param method
     * @param msg
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
        });
        this._status = RecordingStatus.Stopped;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    public async selectGroup(user: IPolicyUser, uuid: string): Promise<void> {
        await this.record(RecordAction.SelectGroup, null, user?.did, { uuid });
    }

    public async setBlockData(user: IPolicyUser, block: AnyBlockType, data: any): Promise<void> {
        await this.record(RecordAction.SetBlockData, block?.tag, user?.did, data);
    }

    public async externalData(data: any): Promise<void> {
        await this.record(RecordAction.SetExternalData, null, null, data);
    }

    public async createUser(did: string, data: any): Promise<void> {
        await this.record(RecordAction.CreateUser, null, did, data);
    }

    public async setUser(did: string): Promise<void> {
        await this.record(RecordAction.SetUser, null, did, null);
    }

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
        });
    }

    public async generateDidDocument(didDocument: DIDDocument): Promise<void> {
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
        });
    }

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
                ]
            }
        ) as any;
    }

    public get status(): RecordingStatus {
        return this._status;
    }

    public getStatus() {
        return {
            type: this.type,
            policyId: this.policyId,
            uuid: this.uuid,
            status: this._status
        }
    }
}
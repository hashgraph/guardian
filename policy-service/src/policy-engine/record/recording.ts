import { DIDDocument, DatabaseServer } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';
import { RecordingStatus } from './status.type';
import { RecordAction } from './action.type';
import { RecordMethod } from './method.type';
import { RecordItem } from './record-item';

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
     * Block messenger
     */
    private readonly tree: BlockTreeGenerator;
    /**
     * Recording status
     */
    private _status: RecordingStatus;

    constructor(policyId: string, uuid?: string) {
        this.policyId = policyId;
        this.uuid = uuid || GenerateUUIDv4();
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
        });
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
            user: null,
            target: null,
            document: null
        });
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
        });
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
    public async selectGroup(user: IPolicyUser, uuid: string): Promise<void> {
        await this.record(RecordAction.SelectGroup, null, user?.did, { uuid });
    }

    /**
     * Record event (Set Block Data)
     * @param user
     * @param block
     * @param data
     * @public
     */
    public async setBlockData(user: IPolicyUser, block: AnyBlockType, data: any): Promise<void> {
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
        });
    }

    /**
     * Record event (Generate DID)
     * @param didDocument
     * @public
     */
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
                ]
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
}
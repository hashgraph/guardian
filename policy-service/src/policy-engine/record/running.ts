import { GenerateUUIDv4, PolicyEvents, TopicType } from '@guardian/interfaces';
import { RunningStatus } from './status.type.js';
import { BlockTreeGenerator } from '../block-tree-generator.js';
import { RecordAction } from './action.type.js';
import { RecordMethod } from './method.type.js';
import { IPolicyBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { DatabaseServer, HederaDidDocument, IRecordResult, RecordImportExport, VcHelper } from '@guardian/common';
import { RecordItem } from './record-item.js';
import { GenerateDID, GenerateUUID, IGenerateValue, RecordItemStack, Utils } from './utils.js';
import { AccountId, PrivateKey } from '@hashgraph/sdk';

/**
 * Running controller
 */
export class Running {
    /**
     * Controller type
     */
    public readonly type: string = 'Running';
    /**
     * Policy ID
     */
    public readonly policyId: string;
    /**
     * Policy owner
     */
    public readonly owner: string;
    /**
     * Policy root block
     */
    public readonly policyInstance: IPolicyBlock;
    /**
     * Options
     */
    public readonly options: any;
    /**
     * Block messenger
     */
    private readonly tree: BlockTreeGenerator;
    /**
     * Recorded actions (type = User Actions)
     */
    private readonly _actions: RecordItemStack;
    /**
     * Recorded actions (type = Generate UUID)
     */
    private readonly _generateUUID: RecordItemStack;
    /**
     * Recorded actions (type = Generate DID)
     */
    private readonly _generateDID: RecordItemStack;
    /**
     * Recorded result
     */
    private readonly _results: IRecordResult[];
    /**
     * Record ID
     */
    private _id: number;
    /**
     * Status
     */
    private _status: RunningStatus;
    /**
     * Last error
     */
    private _lastError: string;
    /**
     * list of created IDs
     */
    private _generatedItems: IGenerateValue<any>[];
    /**
     * list of created DIDs
     */
    private _generatedDIDs: IGenerateValue<any>[];
    /**
     * Start time
     */
    private _startTime: number;
    /**
     * End time
     */
    private _endTime: number;
    /**
     * Current delay
     */
    private _currentDelay: any;

    constructor(
        policyInstance: IPolicyBlock,
        policyId: string,
        owner: string,
        actions: RecordItem[],
        results: IRecordResult[],
        options: any
    ) {
        this.policyInstance = policyInstance;
        this.policyId = policyId;
        this.owner = owner;
        this.options = options;
        this.tree = new BlockTreeGenerator();
        this._status = RunningStatus.New;
        this._lastError = null;
        this._id = -1;
        this._actions = new RecordItemStack();
        this._generateUUID = new RecordItemStack();
        this._generateDID = new RecordItemStack();
        if (Array.isArray(actions)) {
            this._actions.setItems(actions.filter(item =>
                item.method !== RecordMethod.Generate
            ));
            this._generateUUID.setItems(actions.filter(item =>
                item.method === RecordMethod.Generate &&
                item.action === RecordAction.GenerateUUID
            ));
            this._generateDID.setItems(actions.filter(item =>
                item.method === RecordMethod.Generate &&
                item.action === RecordAction.GenerateDID
            ));
        }
        this._generatedItems = [];
        this._generatedDIDs = [];
        this._results = results;
    }

    /**
     * Start running
     * @public
     */
    public start(): boolean {
        this._status = RunningStatus.Running;
        this._lastError = null;
        this._id = Date.now();
        this._generatedItems = [];
        this._generatedDIDs = [];
        this._actions.clearIndex();
        this._generateUUID.clearIndex();
        this._generateDID.clearIndex();
        this._startTime = Date.now();
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        this._run(this._id).then();
        return true;
    }

    /**
     * Stop running
     * @public
     */
    public stop(): boolean {
        this._status = RunningStatus.Stopped;
        this._lastError = null;
        this._endTime = Date.now();
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Finish running
     * @public
     */
    public finished(): boolean {
        this._id = -1;
        this._status = RunningStatus.Finished;
        this._lastError = null;
        this._endTime = Date.now();
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Stop running with error
     * @param message
     * @public
     */
    public error(message: string): boolean {
        this._status = RunningStatus.Error;
        this._lastError = message;
        this._endTime = Date.now();
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    /**
     * Start running (with results)
     * @public
     */
    public async run(): Promise<IRecordResult[]> {
        this._status = RunningStatus.Running;
        this._lastError = null;
        this._id = Date.now();
        this._generatedItems = [];
        this._generatedDIDs = [];
        this._actions.clearIndex();
        this._generateUUID.clearIndex();
        this._generateDID.clearIndex();
        this._startTime = Date.now();
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        await this._run(this._id);
        return await this.results();
    }

    /**
     * Skip delay
     * @param options
     * @public
     */
    public async fastForward(options: any): Promise<boolean> {
        try {
            const skipIndex = Number(options?.index);
            if (this._currentDelay) {
                const { index, resolve, timer } = this._currentDelay;
                if ((skipIndex && skipIndex === index) || (!skipIndex)) {
                    this._currentDelay = null;
                    clearTimeout(timer);
                    resolve();
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Retry current action
     * @public
     */
    public async retryStep(): Promise<boolean> {
        try {
            if (this._status === RunningStatus.Error) {
                this._status = RunningStatus.Running;
                this._lastError = null;
                this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
                this._run(this._id).then();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Skip current action
     * @public
     */
    public async skipStep(): Promise<boolean> {
        try {
            if (this._status === RunningStatus.Error) {
                this._status = RunningStatus.Running;
                this._lastError = null;
                this._actions.next();
                this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
                this._run(this._id).then();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current results
     * @public
     */
    public async results(): Promise<IRecordResult[]> {
        if (this._status !== RunningStatus.Stopped) {
            return null;
        }
        const results: IRecordResult[] = [];
        const db = new DatabaseServer(this.policyId);
        const vcs = await db.getVcDocuments<any[]>({
            updateDate: {
                $gte: new Date(this._startTime),
                $lt: new Date(this._endTime)
            }
        });
        for (const vc of vcs) {
            results.push({
                id: vc.document.id,
                type: 'vc',
                document: vc.document
            });
        }
        const vps = await db.getVpDocuments<any[]>({
            updateDate: {
                $gte: new Date(this._startTime),
                $lt: new Date(this._endTime)
            }
        });
        for (const vp of vps) {
            results.push({
                id: vp.document.id,
                type: 'vp',
                document: vp.document
            });
        }
        return results;
    }

    /**
     * Run
     * @param id
     * @private
     */
    private async _run(id: number): Promise<void> {
        while (this.isRunning(id)) {
            const result = await this.next();
            if (!this.isRunning(id)) {
                return;
            }
            if (result.code === 0) {
                this.stop();
                return;
            }
            if (result.code < 0) {
                this.error(result.error);
                return;
            }
            this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
            await this.delay(result.delay, result.index);
        }
    }

    /**
     * Check status
     * @param id
     * @private
     */
    private isRunning(id: number): boolean {
        return this._id === id && this._status === RunningStatus.Running;
    }

    /**
     * Create delay
     * @param time
     * @param index
     * @private
     */
    private async delay(time: number, index: number): Promise<void> {
        this._currentDelay = null;
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this._currentDelay = null;
                resolve();
            }, time);
            this._currentDelay = {
                index,
                resolve,
                timer
            };
        });
    }

    /**
     * Get user
     * @param did
     * @private
     */
    private async getUser(did: string): Promise<PolicyUser> {
        return await PolicyComponentsUtils.GetVirtualUser(did, this.policyInstance);
    }

    /**
     * Replay event
     * @param action
     * @private
     */
    private async runAction(action: RecordItem): Promise<string> {
        if (action.method === RecordMethod.Start) {
            const recordOwner = action.user;
            const value = new GenerateDID(recordOwner, this.owner);
            this._generatedItems.push(value);
            this._generatedDIDs.push(value);
            await DatabaseServer.setVirtualUser(this.policyId, this.owner);
            return null;
        }
        if (action.method === RecordMethod.Stop) {
            return null;
        }
        if (action.method === RecordMethod.Action) {
            const did = this.replaceDID(action.user);
            const userFull = await this.getUser(did);
            switch (action.action) {
                case RecordAction.SelectGroup: {
                    const doc = await this.getActionDocument(action);
                    this.policyInstance.components.selectGroup(userFull, doc);
                    return null;
                }
                case RecordAction.SetBlockData: {
                    const doc = await this.getActionDocument(action);
                    const block = PolicyComponentsUtils.GetBlockByTag<any>(this.policyId, action.target);
                    if (block && (await block.isAvailable(userFull))) {
                        if (typeof block.setData === 'function') {
                            await block.setData(userFull, doc);
                            return null;
                        }
                    }
                    return `Block (${action.target}) not available.`;
                }
                case RecordAction.SetExternalData: {
                    const doc = await this.getActionDocument(action);
                    for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                        if (block.policyId === this.policyId) {
                            await (block as any).receiveData(doc);
                        }
                    }
                    return null;
                }
                case RecordAction.CreateUser: {
                    const vcHelper = new VcHelper();
                    const topic = await DatabaseServer.getTopicByType(this.owner, TopicType.UserTopic);
                    const newPrivateKey = PrivateKey.generate();
                    const newAccountId = new AccountId(Date.now());
                    const didObject = await vcHelper.generateNewDid(topic.topicId, newPrivateKey);
                    const userDID = didObject.getDid();
                    const document = didObject.getDocument();
                    const users = await DatabaseServer.getVirtualUsers(this.policyId);
                    for (const user of users) {
                        if (user.did === userDID) {
                            return `User with DID (${userDID}) already exists.`;
                        }
                    }
                    const username = `Virtual User ${users.length}`;
                    await DatabaseServer.createVirtualUser(
                        this.policyId,
                        username,
                        userDID,
                        newAccountId.toString(),
                        newPrivateKey.toString()
                    );

                    const instanceDB = this.policyInstance.components.databaseServer;
                    const keys = didObject.getPrivateKeys();
                    const verificationMethods = {};
                    for (const item of keys) {
                        const { id, type, key } = item;
                        verificationMethods[type] = id;
                        await instanceDB.setVirtualKey(userDID, id, key);
                    }
                    await instanceDB.saveDid({
                        did: userDID,
                        document,
                        verificationMethods
                    });
                    const value = new GenerateDID(userFull.did, userDID);
                    this._generatedItems.push(value);
                    this._generatedDIDs.push(value);
                    return null;
                }
                case RecordAction.SetUser: {
                    await DatabaseServer.setVirtualUser(this.policyId, did);
                    return null;
                }
                default: {
                    return `Action (${action.method}: ${action.action}) not defined.`;
                }
            }
        }
        return `Action (${action.method}: ${action.action}) not defined.`;
    }

    /**
     * Replace dynamic ids in documents
     * @param action
     * @private
     */
    private async getActionDocument(action: RecordItem): Promise<any> {
        try {
            let document = action.document;
            if (document) {
                document = await this.replaceId(document);
                document = await this.replaceRow(document);
            }
            switch (action.action) {
                case RecordAction.SelectGroup: {
                    return document?.uuid;
                }
                case RecordAction.SetBlockData:
                case RecordAction.SetExternalData: {
                    return document;
                }
                case RecordAction.CreateUser: {
                    return document?.document;
                }
                default: {
                    return document;
                }
            }
        } catch (error) {
            return action.document;
        }
    }

    /**
     * Replace DID
     * @param did
     * @private
     */
    private replaceDID(did: string): string {
        for (const value of this._generatedDIDs) {
            if (value.oldValue === did) {
                return value.newValue;
            }
        }
        return did;
    }

    /**
     * Replace ids
     * @param obj
     * @private
     */
    private async replaceId(obj: any): Promise<any> {
        for (const value of this._generatedItems) {
            obj = Utils.replaceAllValues(obj, value);
        }
        return obj;
    }

    /**
     * Replace ids
     * @param obj
     * @private
     */
    private async replaceRow(obj: any): Promise<any> {
        const result = Utils.findAllDocuments(obj);
        for (const row of result) {
            if (row.type === 'vc') {
                const item = await this.policyInstance.databaseServer.getVcDocument(row.filters);
                obj = row.replace(obj, item);
            }
            if (row.type === 'vp') {
                const item = await this.policyInstance.databaseServer.getVpDocument(row.filters);
                obj = row.replace(obj, item);
            }
        }
        return obj;
    }

    /**
     * Get next action
     * @private
     */
    private async next() {
        const result = {
            index: -1,
            delay: -1,
            code: 0,
            error: null
        };
        try {
            const action = this._actions.current;
            if (!action) {
                return result;
            }

            const error = await this.runAction(action);
            if (error) {
                result.delay = -1;
                result.code = -1;
                result.error = error;
                return result;
            }

            const next = this._actions.next();
            if (next) {
                result.index = this._actions.index;
                result.code = 1;
                const delay = (next.time - action.time);
                if (Number.isFinite(delay) && delay > 0) {
                    result.delay = delay;
                } else {
                    result.delay = 0;
                }
                return result;
            }

            return result;
        } catch (error) {
            result.delay = -1;
            result.code = -1;
            result.error = this.getErrorMessage(error);
            return result;
        }
    }

    /**
     * Get error message
     * @private
     */
    private getErrorMessage(error: string | Error | any): string {
        if (typeof error === 'string') {
            return error;
        } else if (error.message) {
            return error.message;
        } else if (error.error) {
            return error.error;
        } else if (error.name) {
            return error.name;
        } else {
            return 'Unidentified error';
        }
    }

    /**
     * Get next uuid
     * @public
     */
    public async nextUUID(): Promise<string> {
        const uuid = GenerateUUIDv4();
        const action = this._generateUUID.current;
        const old = action?.document?.uuid;
        this._generateUUID.nextIndex();
        this._generatedItems.push(new GenerateUUID(old, uuid));
        return uuid;
    }

    /**
     * Get next did
     * @public
     */
    public async nextDID(topicId: string): Promise<HederaDidDocument> {
        const vcHelper = new VcHelper();
        const privateKey = PrivateKey.generate();
        const didDocument = await vcHelper.generateNewDid(topicId, privateKey);
        const did = didDocument.getDid();
        const action = this._generateDID.current;
        const old = action?.document?.did;
        this._generateDID.nextIndex();
        const value = new GenerateDID(old, did);
        this._generatedItems.push(value);
        this._generatedDIDs.push(value);
        return didDocument;
    }

    /**
     * Get full status
     * @public
     */
    public getStatus() {
        return {
            id: this._id,
            type: this.type,
            policyId: this.policyId,
            status: this._status,
            index: this._actions.index,
            error: this._lastError,
            count: this._actions.count
        }
    }

    /**
     * Get recorded actions (type = User Actions)
     * @public
     */
    public async getActions(): Promise<RecordItem[]> {
        return this._actions.items;
    }

    /**
     * Get current and recorded results
     * @public
     */
    public async getResults(): Promise<any> {
        if (this._id) {
            const results = await RecordImportExport.loadRecordResults(this.policyId, this._startTime, this._endTime);
            return {
                documents: results,
                recorded: this._results
            };
        } else {
            return null;
        }
    }
}

import { GenerateUUIDv4, PolicyEvents, TopicType } from '@guardian/interfaces';
import { RunningStatus } from './status.type.js';
import { BlockTreeGenerator } from '../block-tree-generator.js';
import { RecordAction } from './action.type.js';
import { RecordMethod } from './method.type.js';
import { IPolicyBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { DatabaseServer, HederaDidDocument, IRecordResult, RecordImportExport, VcDocument as VcDocumentCollection, VcDocument, VcHelper, VpDocument } from '@guardian/common';
import { RecordItem } from './record-item.js';
import { GenerateDID, GenerateUUID, IGenerateValue, RecordItemStack, RowDocument, Utils } from './utils.js';
import { AccountId, PrivateKey } from '@hashgraph/sdk';

interface RecordOptions {
    mode?: string;
    index?: string | number;
}

interface IActionResult {
    index: number;
    delay: number;
    code: number;
    error: string;
    action: RecordAction;
};

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
    public readonly options: RecordOptions;
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
     * Mode
     */
    private readonly _mode: string;
    /**
     * Event delay
     */
    private readonly _eventIterationDelay = [2, 4, 6, 8, 10]; //30s
    /**
     * Record ID
     */
    private _id: string;
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
        options: RecordOptions
    ) {
        this.policyInstance = policyInstance;
        this.policyId = policyId;
        this.owner = owner;
        this.options = options || {};
        this.tree = new BlockTreeGenerator();
        this._mode = this.options.mode;
        this._status = RunningStatus.New;
        this._lastError = null;
        this._id = null;
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
    public start(): string {
        this._status = RunningStatus.Running;
        this._lastError = null;
        this._id = GenerateUUIDv4();
        this._generatedItems = [];
        this._generatedDIDs = [];
        this._actions.clear();
        this._generateUUID.clear();
        this._generateDID.clear();
        this._startTime = Date.now();
        this._updateStatus(this._id).then();
        this._run(this._id).then();
        return this._id;
    }

    /**
     * Stop running
     * @public
     */
    public stop(): boolean {
        this._status = RunningStatus.Stopped;
        this._lastError = null;
        this._endTime = Date.now();
        this._updateStatus(this._id).then();
        return true;
    }

    /**
     * Finish running
     * @public
     */
    public finished(): boolean {
        const oldID = this._id;
        this._id = null;
        this._status = RunningStatus.Finished;
        this._lastError = null;
        this._endTime = Date.now();
        this._updateStatus(oldID).then();
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
        this._updateStatus(this._id).then();
        return true;
    }

    /**
     * Destroy
     * @public
     */
    public async destroy(): Promise<boolean> {
        const oldID = this._id;
        this._id = null;
        this._status = RunningStatus.Finished;
        this._lastError = null;
        this._endTime = Date.now();
        await this._updateStatus(oldID);
        return true;
    }

    /**
     * Start running (with results)
     * @public
     */
    public async run(): Promise<IRecordResult[]> {
        this._status = RunningStatus.Running;
        this._lastError = null;
        this._id = GenerateUUIDv4();
        this._generatedItems = [];
        this._generatedDIDs = [];
        this._actions.clear();
        this._generateUUID.clear();
        this._generateDID.clear();
        this._startTime = Date.now();
        this._updateStatus(this._id).then();
        await this._run(this._id);
        return await this.results();
    }

    /**
     * Skip delay
     * @param options
     * @public
     */
    public async fastForward(options: RecordOptions): Promise<boolean> {
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
                this._updateStatus(this._id).then();
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
                this._updateStatus(this._id).then();
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
        const vcs = await db.getVcDocuments<VcDocumentCollection>({
            updateDate: {
                $gte: new Date(this._startTime),
                $lt: new Date(this._endTime)
            }
        }) as VcDocumentCollection[];

        for (const vc of vcs) {
            results.push({
                id: vc.document.id,
                type: 'vc',
                document: vc.document
            });
        }
        const vps = await db.getVpDocuments<VpDocument>({
            updateDate: {
                $gte: new Date(this._startTime),
                $lt: new Date(this._endTime)
            }
        }) as VpDocument[];

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
     * Update status
     * @private
     */
    private async _updateStatus(id: string): Promise<void> {
        try {
            const status: any = this.getStatus(id);
            this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, status);
            if (this._mode === 'test') {
                if (this._status === RunningStatus.Running) {
                    this.tree.sendMessage(PolicyEvents.TEST_UPDATE_BROADCAST, status);
                } else {
                    status.result = await this.getResults();
                    this.tree.sendMessage(PolicyEvents.TEST_UPDATE_BROADCAST, status);
                }
            }
        } catch (error) {
            return;
        }
    }

    /**
     * Run
     * @param id
     * @private
     */
    private async _run(id: string): Promise<void> {
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
            this._updateStatus(id).then();
            await this.delay(result.delay, result.index);
        }
    }

    /**
     * Check status
     * @param id
     * @private
     */
    private isRunning(id: string): boolean {
        return this._id === id && this._status === RunningStatus.Running;
    }

    /**
     * Create delay
     * @param time
     * @param index
     * @param action
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
                    const block = PolicyComponentsUtils.GetBlockByTag<any>(this.policyId, action.target);
                    if (await this.isAvailable(block, userFull)) {
                        const doc = await this.getActionDocument(action, block);
                        await block.setData(userFull, doc, null, null);
                        return null;
                    } else {
                        return `Block (${action.target}) not available.`;
                    }
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
                        newPrivateKey.toString(),
                        false
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
    private async getActionDocument(action: RecordItem, block?: any): Promise<any> {
        try {
            let document = action.document;
            if (document) {
                document = await this.replaceId(document);
                document = await this.replaceRow(document);
            }
            if (block && document) {
                document = await this.replaceBlockData(block, document);
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
     * Check available
     * @param block
     * @param user
     * @private
     */
    private async isAvailable(block: any, user: PolicyUser): Promise<boolean> {
        if (!block || typeof block.setData !== 'function') {
            return false;
        }
        for (const i of this._eventIterationDelay) {
            if (await block.isAvailable(user)) {
                return true;
            }
            await this.delay(i * 1000, this._actions?.index);
        }
        return false;
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
     * Replace custom data
     * @param obj
     * @private
     */
    private async replaceBlockData(block: any, obj: any): Promise<any> {
        //multi-sign-block
        if (block.blockType === 'multiSignBlock') {
            if (obj?.document?.uuid) {
                const doc = await this.policyInstance
                    .databaseServer
                    .getVcDocument({ 'document.id': obj.document.uuid } as any);
                if (doc) {
                    obj.document.id = doc.id.toString();
                }
            }
        }
        return obj;
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
            const item = await this.findRowDocument(row);
            obj = row.replace(obj, item);
        }
        return obj;
    }

    /**
     * Find row document
     * @param row
     * @private
     */
    private async findRowDocument(row: RowDocument): Promise<VcDocument | VpDocument> {
        for (const i of this._eventIterationDelay) {
            const item = await this.getRowDocument(row);
            if (item) {
                return item;
            }
            await this.delay(i * 1000, this._actions?.index);
        }
        return undefined;
    }

    /**
     * Find row document
     * @param row
     * @private
     */
    private async getRowDocument(row: RowDocument): Promise<VcDocument | VpDocument> {
        if (row.type === 'vc') {
            return await this.policyInstance.databaseServer.getVcDocument(row.filters);
        } else if (row.type === 'vp') {
            return await this.policyInstance.databaseServer.getVpDocument(row.filters);
        } else {
            return undefined;
        }
    }

    /**
     * Get next action
     * @private
     */
    private async next() {
        const result: IActionResult = {
            index: -1,
            delay: -1,
            code: 0,
            error: null,
            action: null
        };
        try {
            const action = this._actions.current;
            if (!action) {
                return result;
            }
            result.action = action.action;

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
    public getStatus(id?: string) {
        return {
            id: id || this._id,
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
    public async getResults(policyId?: string): Promise<any> {
        if (this._id) {
            const results = await RecordImportExport
            .loadRecordResults(policyId || this.policyId, this._startTime, this._endTime);
            return {
                documents: results,
                recorded: this._results
            };
        } else {
            return null;
        }
    }
}

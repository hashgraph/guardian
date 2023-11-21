import { GenerateUUIDv4, PolicyEvents } from "@guardian/interfaces";
import { RunningStatus } from "./status.type";
import { BlockTreeGenerator } from "@policy-engine/block-tree-generator";
import { RecordAction } from "./action.type";
import { RecordMethod } from "./method.type";
import { IPolicyBlock } from "@policy-engine/policy-engine.interface";
import { IPolicyUser, PolicyUser } from "@policy-engine/policy-user";
import { PolicyComponentsUtils } from "@policy-engine/policy-components-utils";
import { DIDDocument, DatabaseServer } from "@guardian/common";
import { RecordItem } from "./record-item";
import { GenerateDID, GenerateUUID, IGenerateValue, RecordItemStack, Utils } from "./utils";

export class Running {
    public readonly type: string = 'Running';
    public readonly policyId: string;
    public readonly policyInstance: IPolicyBlock;
    public readonly options: any;
    private readonly tree: BlockTreeGenerator;
    private _status: RunningStatus;

    private _actions: RecordItemStack;
    private _generateUUID: RecordItemStack;
    private _generateDID: RecordItemStack;
    private _id: number;
    private _lastError: string;
    private _generatedItems: IGenerateValue<any>[];

    constructor(
        policyInstance: IPolicyBlock,
        policyId: string,
        actions: RecordItem[],
        options: any
    ) {
        this.policyInstance = policyInstance;
        this.policyId = policyId;
        this.options = options;
        this.tree = new BlockTreeGenerator();
        this._status = RunningStatus.New;
        this._lastError = null;
        this._id = -1;
        this._actions = new RecordItemStack();
        this._generateUUID = new RecordItemStack();
        this._generateDID = new RecordItemStack();
        if (actions) {
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
    }

    public start(): boolean {
        this._status = RunningStatus.Running;
        this._lastError = null;
        this._id = Date.now();
        this._generatedItems = [];
        this._actions.clearIndex();
        this._generateUUID.clearIndex();
        this._generateDID.clearIndex();
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        this.run(this._id).then();
        return true;
    }

    public stop(): boolean {
        this._id = -1;
        this._status = RunningStatus.Stopped;
        this._lastError = null;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    public error(message: string): boolean {
        this._id = -1;
        this._status = RunningStatus.Error;
        this._lastError = message;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    private async run(id: number): Promise<void> {
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
            await this.delay(result.delay);
        }
    }

    private isRunning(id: number): boolean {
        return this._id === id;
    }

    private async delay(time: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    /**
     * Get user
     * @param policy
     * @param user
     */
    private async getUser(did: string): Promise<IPolicyUser> {
        const userFull = new PolicyUser(did);
        userFull.setVirtualUser({ did });
        const groups = await this.policyInstance
            .components
            .databaseServer
            .getGroupsByUser(this.policyId, did);
        for (const group of groups) {
            if (group.active !== false) {
                return userFull.setGroup(group);
            }
        }
        return userFull;
    }

    private async runAction(action: RecordItem): Promise<string> {
        if (action.method === RecordMethod.Start) {
            return null;
        }
        if (action.method === RecordMethod.Stop) {
            return null;
        }
        if (action.method === RecordMethod.Action) {
            const userFull = await this.getUser(action.user);
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
                    const doc = await this.getActionDocument(action);
                    const count = await DatabaseServer.getVirtualUsers(this.policyId);
                    const username = `Virtual User ${count.length}`;

                    await DatabaseServer.createVirtualUser(
                        this.policyId,
                        username,
                        action.user,
                        action.document?.accountId,
                        action.document?.privateKey
                    );
                    await this.policyInstance.components.databaseServer.saveDid({
                        did: action.user,
                        document: doc
                    });
                    return null;
                }
                case RecordAction.SetUser: {
                    await DatabaseServer.setVirtualUser(this.policyId, action.user);
                    return null;
                }
                default: {
                    return `Action (${action.method}: ${action.action}) not defined.`;
                }
            }
        }
        return `Action (${action.method}: ${action.action}) not defined.`;
    }

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
            }
        } catch (error) {
            console.debug(' Error: ', error)
            return action.document;
        }
    }

    private async replaceId(obj: any): Promise<any> {
        for (const value of this._generatedItems) {
            obj = Utils.replaceAllValues(obj, value);
        }
        return obj;
    }

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

    public async next() {
        const result = { delay: -1, code: 0, error: null };
        try {
            const action = this._actions.current;
            if (!action) {
                return result;
            }
            const next = this._actions.next();

            const error = await this.runAction(action);
            if (error) {
                result.delay = -1;
                result.code = -1;
                result.error = error;
                return result;
            }

            if (next) {
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

    public async nextUUID(): Promise<string> {
        const uuid = GenerateUUIDv4();
        const action = this._generateUUID.current;
        const old = action?.document?.uuid;
        this._generateUUID.nextIndex();
        this._generatedItems.push(new GenerateUUID(old, uuid));
        return uuid;
    }

    public async nextDID(topicId: string): Promise<DIDDocument> {
        const didDocument = await DIDDocument.create(null, topicId);
        const did = didDocument.getDid();
        const action = this._generateDID.current;
        const old = action?.document?.did;
        this._generateDID.nextIndex();
        this._generatedItems.push(new GenerateDID(old, did));
        return didDocument;
    }

    public getStatus() {
        return {
            id: this._id,
            type: this.type,
            policyId: this.policyId,
            status: this._status,
            index: this._actions.index,
            error: this._lastError
        }
    }

    public async getActions(): Promise<RecordItem[]> {
        return this._actions.items;
    }
}
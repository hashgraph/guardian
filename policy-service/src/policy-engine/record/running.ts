import { GenerateUUIDv4, PolicyEvents } from "@guardian/interfaces";
import { RunningStatus } from "./status.type";
import { BlockTreeGenerator } from "@policy-engine/block-tree-generator";
import { RecordAction } from "./action.type";
import { RecordMethod } from "./method.type";
import { IPolicyBlock } from "@policy-engine/policy-engine.interface";
import { IPolicyUser, PolicyUser } from "@policy-engine/policy-user";
import { PolicyComponentsUtils } from "@policy-engine/policy-components-utils";
import { DatabaseServer, replaceAllEntities } from "@guardian/common";
import { RecordItem } from "./record-item";
import e from "express";

export class Running {
    public readonly type: string = 'Running';
    public readonly policyId: string;
    public readonly policyInstance: IPolicyBlock;
    public readonly options: any;
    private readonly tree: BlockTreeGenerator;
    private _status: RunningStatus;
    private _actions: RecordItem[];
    private _generate: RecordItem[];
    private _actionIndex: number;
    private _generateIndex: number;
    private _id: number;
    private _lastError: string;

    constructor(
        policyInstance: IPolicyBlock,
        policyId: string,
        actions: any[],
        options: any
    ) {
        this.policyInstance = policyInstance;
        this.policyId = policyId;
        this.options = options;
        this.tree = new BlockTreeGenerator();
        this._status = RunningStatus.New;
        this._lastError = null;
        this._actionIndex = 0;
        this._generateIndex = 0;
        this._id = -1;
        if (actions) {
            this._actions = actions.filter(item => item.method !== RecordMethod.Generate);
            this._generate = actions.filter(item => item.method === RecordMethod.Generate);
        } else {
            this._actions = [];
            this._generate = [];
        }
    }

    public start(): boolean {
        this._actionIndex = 0;
        this._generateIndex = 0;
        this._status = RunningStatus.Running;
        this._lastError = null;
        this._id = Date.now();
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
                    this.policyInstance.components.selectGroup(userFull, action.document?.uuid);
                    return null;
                }
                case RecordAction.SetBlockData: {
                    const block = PolicyComponentsUtils.GetBlockByTag<any>(this.policyId, action.target);
                    if (block && (await block.isAvailable(userFull))) {
                        if (typeof block.setData === 'function') {
                            await block.setData(userFull, action.document);
                            return null;
                        }
                    }
                    return `Block (${action.target}) not available.`;
                }
                case RecordAction.SetExternalData: {
                    for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                        if (block.policyId === this.policyId) {
                            await (block as any).receiveData(action.document);
                        }
                    }
                    return null;
                }
                case RecordAction.CreateUser: {
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
                        document: action.document?.document
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


    /**
     * Replace all values
     * @param obj
     * @param names
     * @param oldValue
     * @param newValue
     */
    private replaceAllValues(
        obj: any,
        oldValue: string,
        newValue: string
    ): any {
        if (typeof obj === 'string') {
            if (obj === oldValue) {
                return newValue;
            } else {
                return obj;
            }
        }
        if (typeof obj === 'object') {
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    obj[i] = this.replaceAllValues(obj[i], oldValue, newValue);
                }
            } else {
                const keys = Object.keys(obj);
                for (const key of keys) {
                    obj[key] = this.replaceAllValues(obj[key], oldValue, newValue);
                }
            }
        }
        return obj;
    }

    private async runGenerate(action: RecordItem): Promise<string> {
        const uuid = GenerateUUIDv4();
        try {
            const old = action?.document?.uuid;
            if (old) {
                for (const row of this._actions) {
                    if (row.document) {
                        row.document = this.replaceAllValues(row.document, old, uuid);
                    }
                }
            }
            return uuid;
        } catch (error) {
            return uuid;
        }
    }

    public async next() {
        const result = { delay: -1, code: 0, error: null };
        try {
            const action = this._actions[this._actionIndex];
            if (!action) {
                return result;
            }
            this._actionIndex++;
            const next = this._actions[this._actionIndex];

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
        const action = this._generate[this._generateIndex];
        this._generateIndex++;
        return await this.runGenerate(action);
    }

    public getStatus() {
        return {
            id: this._id,
            type: this.type,
            policyId: this.policyId,
            status: this._status,
            index: this._actionIndex,
            error: this._lastError
        }
    }

    public async getActions(): Promise<any[]> {
        return this._actions;
    }
}
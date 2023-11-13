import { PolicyEvents } from "@guardian/interfaces";
import { RunningStatus } from "./status.type";
import { BlockTreeGenerator } from "@policy-engine/block-tree-generator";
import { RecordAction } from "./action.type";
import { RecordMethod } from "./method.type";
import { IPolicyBlock } from "@policy-engine/policy-engine.interface";
import { IPolicyUser, PolicyUser } from "@policy-engine/policy-user";
import { PolicyComponentsUtils } from "@policy-engine/policy-components-utils";
import { DatabaseServer } from "@guardian/common";

export class Running {
    public readonly type: string = 'Running';
    public readonly policyId: string;
    public readonly policyInstance: IPolicyBlock;
    public readonly options: any;
    private readonly tree: BlockTreeGenerator;
    private _status: RunningStatus;
    private _actions: any[];
    private _index: number;
    private _id: number;

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
        this._actions = actions || [];
        this._index = 0;
        this._id = -1;
    }

    public start(): boolean {
        this._index = 0;
        this._status = RunningStatus.Running;
        this._id = Date.now();
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        this.run(this._id).then();
        return true;
    }

    public stop(): boolean {
        this._id = -1;
        this._status = RunningStatus.Stopped;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    public error(): boolean {
        this._id = -1;
        this._status = RunningStatus.Error;
        this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
        return true;
    }

    private async run(id: number): Promise<void> {
        while (this.isRunning(id)) {
            const delay = await this.next();
            if (!this.isRunning(id)) {
                return;
            }
            if (delay < 0) {
                if (delay === -1) {
                    this.stop();
                } else {
                    this.error();
                }
                return;
            } else {
                this.tree.sendMessage(PolicyEvents.RECORD_UPDATE_BROADCAST, this.getStatus());
            }
            await this.delay(delay);
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

    private async runAction(action: any): Promise<boolean> {
        if (action.method === RecordMethod.Start) {
            return true;
        }
        if (action.method === RecordMethod.Stop) {
            return true;
        }
        if (action.method === RecordMethod.Action) {
            const userFull = await this.getUser(action.user);
            switch (action.action) {
                case RecordAction.SelectGroup: {
                    this.policyInstance.components.selectGroup(userFull, action.document?.uuid);
                    return true;
                }
                case RecordAction.SetBlockData: {
                    const block = PolicyComponentsUtils.GetBlockByTag<any>(this.policyId, action.target);
                    if (block && (await block.isAvailable(userFull))) {
                        if (typeof block.setData === 'function') {
                            await block.setData(userFull, action.document);
                            return true;
                        }
                    }
                    return false;
                }
                case RecordAction.SetExternalData: {
                    for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                        if (block.policyId === this.policyId) {
                            await (block as any).receiveData(action.document);
                        }
                    }
                    return true;
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
                    return true;
                }
                case RecordAction.SetUser: {
                    await DatabaseServer.setVirtualUser(this.policyId, action.user);
                    return true;
                }
                default: {
                    return false;
                }
            }
        }
        return false;
    }

    public async next(): Promise<number> {
        try {
            const action = this._actions[this._index];
            if (!action) {
                return -1;
            }
            this._index++;
            const next = this._actions[this._index];

            const result = await this.runAction(action);
            if (!result) {
                return -2;
            }

            if (next) {
                const delay = (next.time - action.time);
                if (Number.isFinite(delay) && delay >= 0) {
                    return delay;
                }
            }
            return -1;
        } catch (error) {
            return -2;
        }
    }

    public getStatus() {
        return {
            id: this._id,
            type: this.type,
            policyId: this.policyId,
            status: this._status,
            index: this._index
        }
    }

    public async getActions(): Promise<any[]> {
        return this._actions;
    }
}
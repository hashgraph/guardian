import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyTemplate } from './policy.model';

export class PolicyTopic {
    private readonly policy: PolicyTemplate;

    public readonly id: string;

    private _name: string;
    private _description: string;
    private _type: string;
    private _static: boolean;
    private _memoObj: string;
    private _memo: string;

    private _changed: boolean;

    constructor(topic: any, policy: PolicyTemplate) {
        this._changed = false;

        this.policy = policy;
        this.id = topic.id || GenerateUUIDv4();

        this._name = topic.name;
        this._description = topic.description;
        this._type = topic.type;
        this._static = topic.static;
        this._memoObj = topic.memoObj || "topic";
        this._memo = topic.memo;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public get description(): string {
        return this._description;
    }

    public set description(value: string) {
        this._description = value;
        this.changed = true;
    }

    public get type(): string {
        return this._type;
    }

    public set type(value: string) {
        this._type = value;
        this.changed = true;
    }

    public get static(): boolean {
        return this._static;
    }

    public set static(value: boolean) {
        this._static = value;
        this.changed = true;
    }

    public get memoObj(): string {
        return this._memoObj;
    }

    public set memoObj(value: string) {
        this._memoObj = value;
        this.changed = true;
    }

    public get memo(): string {
        return this._memo;
    }

    public set memo(value: string) {
        this._memo = value;
        this.changed = true;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.policy) {
            this.policy.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.policy.emitUpdate();
    }

    public getJSON(): any {
        return {
            type: this.type,
            name: this.name,
            description: this.description,
            static: this.static,
            memo: this.memo,
            memoObj: this.memoObj
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyModel } from './policy.model';


export class PolicyRoleModel {
    private readonly policy: PolicyModel;

    public readonly id: string;

    private _name: string;

    private _changed: boolean;

    constructor(name: string, policy: PolicyModel) {
        this._changed = false;
        this.policy = policy;
        this.id = GenerateUUIDv4();
        this._name = name;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
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

    public getJSON(): string {
        return this.name;
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyTemplate } from './policy.model';

export class PolicyRole {
    private readonly policy: PolicyTemplate;

    public readonly id: string;

    private _name: string;

    private _changed: boolean;

    constructor(name: string, policy: PolicyTemplate) {
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

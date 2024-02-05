import { GenerateUUIDv4, GroupAccessType, GroupRelationshipType } from '@guardian/interfaces';
import { PolicyTemplate } from './policy.model';
import { PolicyNavigationStepModel } from './policy-navigation-step.model';

export class PolicyNavigationModel {
    private readonly policy: PolicyTemplate;

    public readonly id: string;

    private _role: string;
    private _steps: PolicyNavigationStepModel[];

    private _changed: boolean;

    constructor(
        config: {
            role: string;
            steps: PolicyNavigationStepModel[];
        },
        policy: PolicyTemplate
    ) {
        this._changed = false;
        this.policy = policy;
        this.id = GenerateUUIDv4();
        this._role = config.role;
        this._steps = config.steps || [];
    }

    public get role(): string {
        return this._role;
    }

    public get steps(): PolicyNavigationStepModel[] {
        return this._steps;
    }

    public set role(value: string) {
        this._role = value;
        this.changed = true;
    }

    public set steps(value: PolicyNavigationStepModel[]) {
        this._steps = value;
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
            role: this._role,
            steps: this._steps.map((step: PolicyNavigationStepModel) => (step.getJSON())),
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

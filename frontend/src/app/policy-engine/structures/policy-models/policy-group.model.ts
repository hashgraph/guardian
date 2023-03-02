import {
    GenerateUUIDv4,
    GroupAccessType,
    GroupRelationshipType
} from '@guardian/interfaces';
import { PolicyModel } from './policy.model';


export class PolicyGroupModel {
    private readonly policy: PolicyModel;

    public readonly id: string;

    private _name: string;
    private _creator: string;
    private _members: string[];

    private _groupRelationshipType: GroupRelationshipType;
    private _groupAccessType: GroupAccessType;

    private _changed: boolean;

    constructor(
        config: {
            name: string;
            creator: string;
            members: string[];
            groupRelationshipType?: GroupRelationshipType;
            groupAccessType?: GroupAccessType;
        },
        policy: PolicyModel
    ) {
        this._changed = false;
        this.policy = policy;
        this.id = GenerateUUIDv4();
        this._name = config.name;
        this._creator = config.creator;
        this._members = config.members || [];

        this._groupRelationshipType = config.groupRelationshipType === GroupRelationshipType.Multiple ?
            GroupRelationshipType.Multiple : GroupRelationshipType.Single;
        this._groupAccessType = config.groupAccessType === GroupAccessType.Global ?
            GroupAccessType.Global : GroupAccessType.Private;
    }

    public get name(): string {
        return this._name;
    }

    public get creator(): string {
        return this._creator;
    }

    public get members(): string[] {
        return this._members;
    }

    public get groupRelationshipType(): GroupRelationshipType {
        return this._groupRelationshipType;
    }

    public get groupAccessType(): GroupAccessType {
        return this._groupAccessType;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public set creator(value: string) {
        this._creator = value;
        this.changed = true;
    }

    public set members(value: string[]) {
        this._members = value;
        this.changed = true;
    }

    public set groupRelationshipType(value: GroupRelationshipType) {
        this._groupRelationshipType = value;
        this.changed = true;
    }

    public set groupAccessType(value: GroupAccessType) {
        this._groupAccessType = value;
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
            name: this._name,
            creator: this._creator,
            members: this._members,
            groupRelationshipType: this._groupRelationshipType,
            groupAccessType: this._groupAccessType,
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

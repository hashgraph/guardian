import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyModuleModel } from './module.model';

export class ModuleVariableModel {
    private readonly module: PolicyModuleModel;

    public readonly id: string;

    private _name: string;
    private _description: string;
    private _type: string;

    private _changed: boolean;

    constructor(
        config: {
            name: string;
            description: string;
            type: string;
        },
        module: PolicyModuleModel
    ) {
        this._changed = false;
        this.module = module;
        this.id = GenerateUUIDv4();
        this._name = config.name;
        this._description = config.description;
        this._type = config.type;
    }

    public get name(): string {
        return this._name;
    }

    public get description(): string {
        return this._description;
    }

    public get type(): string {
        return this._type;
    }

    public set name(value: string) {
        this._name = value;
        this.changed = true;
    }

    public set description(value: string) {
        this._description = value;
        this.changed = true;
    }

    public set type(value: string) {
        this._type = value;
        this.changed = true;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.module) {
            this.module.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.module.emitUpdate();
    }

    public getJSON(): any {
        return {
            name: this._name,
            description: this._description,
            type: this._type
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

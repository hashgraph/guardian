import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicySubTree } from '../interfaces/types';

export class ModuleVariable {
    private readonly module: PolicySubTree;

    public readonly id: string;

    private _name: string;
    private _description: string;
    private _type: string;
    constructor(
        config: {
            baseSchema?: any;
            name: string;
            description: string;
            type: string;
        },
        module: PolicySubTree
    ) {
        this._changed = false;
        this.module = module;
        this.id = GenerateUUIDv4();
        this._name = config.name;
        this._description = config.description;
        this._type = config.type;
        this._baseSchema = config.baseSchema;
    }

    private _changed: boolean;

    private _baseSchema?: any;

    public get name(): string {
        return this._name;
    }

    public get description(): string {
        return this._description;
    }

    public get type(): string {
        return this._type;
    }

    public get baseSchema(): any {
        return this._baseSchema;
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

    public set baseSchema(value: any) {
        this._baseSchema = value;
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
            type: this._type,
            baseSchema: this._baseSchema
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}

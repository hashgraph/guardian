import { PolicyModel } from './policy.model';
import { IModuleConfig } from "./interfaces/module-config.interface";
import { PolicyBlockModel } from './block.model';
import { PolicyEventModel } from './block-event.model';
import { ModuleEventModel } from './module-event.model';
import { ModuleVariableModel } from './module-variable.model';

export class PolicyModuleModel extends PolicyBlockModel {
    private _dataSource!: PolicyBlockModel[];
    private _tagMap: { [tag: string]: PolicyBlockModel; } = {};
    private _idMap: { [tag: string]: PolicyBlockModel; } = {};
    private _allBlocks!: PolicyBlockModel[];
    private _allEvents!: PolicyEventModel[];
    private _inputEvents!: ModuleEventModel[];
    private _outputEvents!: ModuleEventModel[];
    private _variables!: ModuleVariableModel[];

    constructor(config: IModuleConfig, parent: PolicyBlockModel | null, policy: PolicyModel) {
        super(config, parent, policy);

        this._inputEvents = [];
        if (config.inputEvents && Array.isArray(config.inputEvents)) {
            for (const event of config.inputEvents) {
                this._inputEvents.push(new ModuleEventModel(event, this));
            }
        }

        this._outputEvents = [];
        if (config.outputEvents && Array.isArray(config.outputEvents)) {
            for (const event of config.outputEvents) {
                this._outputEvents.push(new ModuleEventModel(event, this));
            }
        }

        this._variables = [];
        if (config.variables && Array.isArray(config.variables)) {
            for (const variable of config.variables) {
                this._variables.push(new ModuleVariableModel(variable, this));
            }
        }
    }

    public get dataSource(): PolicyBlockModel[] {
        return this._dataSource;
    }

    private registeredBlock(block: PolicyBlockModel | PolicyModuleModel) {
        this._allBlocks.push(block);
        for (const event of block.events) {
            this._allEvents.push(event);
        }
        for (const child of block.children) {
            this.registeredBlock(child);
        }
    }

    public refresh() {
        this._tagMap = {};
        this._idMap = {};
        this._allBlocks = [];
        this._allEvents = [];
        this.registeredBlock(this);
        for (const block of this._allBlocks) {
            this._tagMap[block.tag] = block;
            this._idMap[block.id] = block;
        }
        this._dataSource = [this];
    }

    public get isModule(): boolean {
        return true;
    }

    public get expandable(): boolean {
        return false;
    }

    public get name(): string {
        return '';
    }

    public set name(value: string) {
        this.changed = true;
    }

    public get description(): string {
        return '';
    }

    public set description(value: string) {
        this.changed = true;
    }

    public get inputEvents(): ModuleEventModel[] {
        return this._inputEvents;
    }

    public get outputEvents(): ModuleEventModel[] {
        return this._outputEvents;
    }

    public get variables(): ModuleVariableModel[] {
        return this._variables;
    }

    public removeBlock(block: any) {
        const item = this._idMap[block.id];
        if (item) {
            item.remove();
        }
    }

    public getBlock(block: any): PolicyBlockModel | undefined {
        return this._idMap[block.id];
    }

    public getNewTag(type: string, block?: PolicyBlockModel): string {
        let name = type;
        for (let i = 1; i < 1000; i++) {
            name = `${type}_${i}`;
            if (!this._tagMap[name]) {
                if (block) {
                    this._tagMap[name] = block;
                }
                return name;
            }
        }
        return type;
    }

    public createInputEvent() {
        const e = new ModuleEventModel({
            name: '',
            description: ''
        }, this);
        this.addInputEvent(e);
    }

    public addInputEvent(event: ModuleEventModel) {
        this._inputEvents.push(event);
        this.emitUpdate();
    }

    public removeInputEvent(event: ModuleEventModel) {
        const index = this._inputEvents.findIndex((c) => c.id == event.id);
        if (index !== -1) {
            this._inputEvents.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createOutputEvent() {
        const e = new ModuleEventModel({
            name: '',
            description: ''
        }, this);
        this.addOutputEvent(e);
    }

    public addOutputEvent(event: ModuleEventModel) {
        this._outputEvents.push(event);
        this.emitUpdate();
    }

    public removeOutputEvent(event: ModuleEventModel) {
        const index = this._outputEvents.findIndex((c) => c.id == event.id);
        if (index !== -1) {
            this._outputEvents.splice(index, 1);
            this.emitUpdate();
        }
    }

    public createVariable() {
        const e = new ModuleVariableModel({
            name: '',
            description: '',
            type: 'String',
        }, this);
        this.addVariable(e);
    }

    public addVariable(variable: ModuleVariableModel) {
        this._variables.push(variable);
        this.emitUpdate();
    }

    public removeVariable(variable: ModuleVariableModel) {
        const index = this._variables.findIndex((c) => c.id == variable.id);
        if (index !== -1) {
            this._variables.splice(index, 1);
            this.emitUpdate();
        }
    }

    public override getJSON(): any {
        const json: any = super.getJSON();
        json.variables = [];
        json.inputEvents = [];
        json.outputEvents = [];

        for (const variable of this.variables) {
            json.variables.push(variable.getJSON());
        }
        for (const event of this.inputEvents) {
            json.inputEvents.push(event.getJSON());
        }
        for (const event of this.outputEvents) {
            json.outputEvents.push(event.getJSON());
        }
        return json;
    }
}
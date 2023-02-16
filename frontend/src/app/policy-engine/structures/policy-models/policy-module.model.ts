import { PolicyModel } from './policy.model';
import { IBlockConfig } from './block-config.interface';
import { PolicyBlockModel } from './policy-block.model';
import { PolicyEventModel } from './policy-event.model';

export class PolicyModuleModel extends PolicyBlockModel {
    private _dataSource!: PolicyBlockModel[];
    private _tagMap: { [tag: string]: PolicyBlockModel; } = {};
    private _idMap: { [tag: string]: PolicyBlockModel; } = {};
    private _allBlocks!: PolicyBlockModel[];
    private _allEvents!: PolicyEventModel[];

    constructor(config: IBlockConfig, parent: PolicyBlockModel | null, policy: PolicyModel) {
        super(config, parent, policy);
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
}
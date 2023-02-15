import { PolicyModel } from './policy.model';
import { IBlockConfig } from './block-config.interface';
import { PolicyBlockModel } from './policy-block.model';


export class PolicyModuleModel extends PolicyBlockModel {
    private _dataSource!: PolicyBlockModel[];

    constructor(config: IBlockConfig, parent: PolicyBlockModel | null, policy: PolicyModel) {
        config.blockType = 'module';
        super(config, parent, policy);
    }

    public get dataSource(): PolicyBlockModel[] {
        return this._dataSource;
    }

    public refresh() {
        this._dataSource = [this];
    }

    public get isModule(): boolean {
        return true;
    }

    public get expandable(): boolean {
        return false;
    }
}

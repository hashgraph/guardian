import { IFormulaItem, FormulaItemType, GenerateUUIDv4, IFormulaConfig } from '@guardian/interfaces';

export class Formulas {
    private items: IFormulaItem[];
    private filterMap: Map<FormulaItemType, boolean>;

    public data: IFormulaItem[];

    constructor() {
        this.items = [];
        this.data = [];
        this.filterMap = new Map<FormulaItemType, boolean>();
        this.filterMap.set(FormulaItemType.Constant, true);
        this.filterMap.set(FormulaItemType.Variable, true);
        this.filterMap.set(FormulaItemType.Formula, true);
        this.filterMap.set(FormulaItemType.Text, true);
    }

    public get all() {
        return this.items;
    }

    private create(type: FormulaItemType): IFormulaItem {
        const item: IFormulaItem = {
            uuid: GenerateUUIDv4(),
            name: '',
            description: '',
            type: type,
        };
        if (type === FormulaItemType.Constant) {
            item.value = '';
            return item;
        } else if (type === FormulaItemType.Variable) {
            item.value = '';
            item.link = null;
            return item;
        } else if (type === FormulaItemType.Formula) {
            item.value = '';
            item.link = null;
            item.relationships = [];
            return item;
        } else if (type === FormulaItemType.Text) {
            item.value = '';
            item.link = null;
            item.relationships = [];
            return item;
        } else {
            return item;
        }
    }

    public add(type: FormulaItemType): void {
        const item = this.create(type);
        this.items.push(item);
        this.update();
    }

    public delete(item: IFormulaItem): void {
        this.items = this.items.filter((e) => e.uuid !== item?.uuid);
        this.update();
    }

    public setFilters(filter: any): void {
        this.filterMap.set(FormulaItemType.Constant, filter.constant);
        this.filterMap.set(FormulaItemType.Variable, filter.variable);
        this.filterMap.set(FormulaItemType.Formula, filter.formula);
        this.filterMap.set(FormulaItemType.Text, filter.text);
        this.update();
    }

    private update(): void {
        this.data = this.items.filter((e) => this.filterMap.get(e.type));
    }

    public fromData(config: IFormulaConfig) {
        const items: IFormulaItem[] = config?.formulas || [];
        this.items = items.map((e) => this._fromJson(e));
        this.update();
    }

    public getJson(): IFormulaConfig {
        return {
            formulas: this.items.map((e) => this._toJson(e))
        };
    }

    private _fromJson(item: IFormulaItem): IFormulaItem {
        return item;
    }

    private _toJson(item: IFormulaItem): IFormulaItem {
        return item;
    }

    public getItem(uuid: string): IFormulaItem | null {
        for (const item of this.items) {
            if (item.uuid === uuid) {
                return item;
            }
        }
        return null;
    }
}

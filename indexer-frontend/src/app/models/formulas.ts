import { FormulaItemType, IFormulaConfig, IFormulaFile, IFormulaItem } from "@indexer/interfaces";

export class Formulas {
    private items: IFormulaItem[];
    private filterMap: Map<FormulaItemType, boolean>;
    public files: IFormulaFile[];
    public data: IFormulaItem[];

    constructor() {
        this.items = [];
        this.files = [];
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
        const files: IFormulaFile[] = config?.files || [];
        this.items = items.map((e) => this._fromItemJson(e));
        this.files = files.map((e) => this._fromFileJson(e));
        this.update();
    }

    public getJson(): IFormulaConfig {
        return {
            formulas: this.items.map((e) => this._toItemJson(e)),
            files: this.files.map((e) => this._toFileJson(e)),
        };
    }

    private _fromItemJson(item: IFormulaItem): IFormulaItem {
        return item;
    }

    private _toItemJson(item: IFormulaItem): IFormulaItem {
        return item;
    }

    private _fromFileJson(item: IFormulaFile): IFormulaFile {
        return item;
    }

    private _toFileJson(item: IFormulaFile): IFormulaFile {
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
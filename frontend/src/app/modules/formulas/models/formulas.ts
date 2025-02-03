import { moveItemInArray } from '@angular/cdk/drag-drop';
import { IFormulaItem, FormulaItemType, GenerateUUIDv4, IFormulaConfig, IFormulaFile } from '@guardian/interfaces';

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

    public addFile(file: IFormulaFile): void {
        if (file) {
            this.files.push(file);
        }
    }

    public deleteFile(file: IFormulaFile): void {
        this.files = this.files.filter((e) => e !== file);
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

    public reorder(previousIndex: number, currentIndex: number) {
        if (previousIndex !== currentIndex) {
            const prevItem = this.data[previousIndex];
            const currentItem = this.data[currentIndex];
            const originalPreviousIndex = this.items.findIndex((e) => e === prevItem);
            const originalCurrentIndex = this.items.findIndex((e) => e === currentItem);
            moveItemInArray(this.items, originalPreviousIndex, originalCurrentIndex);
            this.update();
        }
    }
}

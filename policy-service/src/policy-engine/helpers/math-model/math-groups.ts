import { FieldLink } from './field-link.js';
import { MathFormula } from './math-formula.js';
import { MathGroup } from './math-group.js';
import { MathItemType } from './math-item-type.js';
import { createMathItem, IMathGroup, IMathGroups, IMathItem } from './math.interface.js';

export class MathGroups<T extends MathFormula | FieldLink> {
    public pages: MathGroup<T>[];
    public current: MathGroup<T>;
    public valid: boolean;

    constructor() {
        this.pages = [];
        this.valid = true;
        this.init();
    }

    private init() {
        if (!this.pages.length) {
            this.pages.push(new MathGroup('Tab1'));
        }
        this.current = this.pages.find((p) => p === this.current) || this.pages[0];
    }

    public get view() {
        return this.current.items;
    }

    public create() {
        this.pages.push(new MathGroup<T>(`Tab${this.pages.length + 1}`));
    }

    public add(page: MathGroup<T>) {
        this.pages.push(page);
    }

    public delete(page: MathGroup<T>) {
        this.pages = this.pages.filter((e) => e !== page);
    }

    public select(page: MathGroup<T>) {
        this.current = page;
    }

    public addItem(item: T) {
        if (this.current) {
            this.current.add(item);
        }
    }

    public deleteItem(item: T) {
        if (this.current) {
            this.current.delete(item);
        }
    }

    public getItems(): T[] {
        const result: T[] = [];
        for (const page of this.pages) {
            for (const item of page.items) {
                if (!item.empty) {
                    result.push(item);
                }
            }
        }
        return result;
    }

    public validate() {
        this.valid = true;
        for (const page of this.pages) {
            page.validate();
            this.valid = this.valid && page.valid;
        }
    }

    public reorder(previousIndex: number, currentIndex: number) {
        if (this.current) {
            this.current.reorder(previousIndex, currentIndex);
        }
        this.validate();
    }

    public getComponents() {
        const components = [];
        for (const page of this.pages) {
            const subComponents = [];
            for (const item of page.items) {
                item.validate();
                if (item.valid && item.type === MathItemType.LINK) {
                    subComponents.push({
                        type: MathItemType.LINK,
                        name: item.name,
                        value: `variables['${item.name}']`
                    });
                }
                if (item.valid && item.type === MathItemType.VARIABLE) {
                    subComponents.push({
                        type: MathItemType.VARIABLE,
                        name: item.functionName,
                        value: `variables['${item.functionName}']`
                    });
                }
                if (item.valid && item.type === MathItemType.FUNCTION) {
                    const paramsNames = item.functionParams.map((name) => `_ /*${name}*/`).join(',');
                    subComponents.push({
                        type: MathItemType.FUNCTION,
                        name: `${item.name}(${item.functionParams.join(',')})`,
                        value: `formulas['${item.name}'](${paramsNames})`
                    });
                }
            }
            if (subComponents.length) {
                components.push({
                    id: 'page',
                    name: page.name,
                    components: subComponents
                });
            }
        }
        return components;
    }

    public toJson() {
        return this.pages.map((p) => p.toJson());
    }

    public from(json: IMathGroups | IMathItem[], create: createMathItem<T>) {
        this.pages = [];
        if (Array.isArray(json)) {
            const defaultPage: IMathItem[] = [];
            for (const config of json) {
                if (config.type === MathItemType.GROUP) {
                    const page = MathGroup.from<T>(config as IMathGroup, create);
                    if (page) {
                        this.pages.push(page);
                    }
                } else {
                    defaultPage.push(config);
                }
            }
            if (defaultPage.length) {
                const page = MathGroup.from<T>({
                    name: 'Tab1',
                    type: MathItemType.GROUP,
                    items: defaultPage
                }, create);
                if (page) {
                    this.pages.unshift(page);
                }
            }
        }
        this.init();
        return this;
    }

    public static from<T extends MathFormula | FieldLink>(json: IMathGroups | IMathItem[], create: createMathItem<T>) {
        const groups = new MathGroups<T>();
        groups.from(json, create);
        return groups;
    }
}
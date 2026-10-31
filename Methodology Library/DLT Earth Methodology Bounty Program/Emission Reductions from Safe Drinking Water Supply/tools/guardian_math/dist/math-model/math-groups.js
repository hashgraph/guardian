import { MathGroup } from './math-group.js';
import { MathItemType } from './math-item.type.js';
export class MathGroups {
    pages;
    current;
    valid;
    constructor() {
        this.pages = [];
        this.valid = true;
        this.init();
    }
    init() {
        if (!this.pages.length) {
            this.pages.push(new MathGroup('Tab1'));
        }
        this.current = this.pages.find((p) => p === this.current) || this.pages[0];
    }
    get view() {
        return this.current.items;
    }
    create() {
        this.pages.push(new MathGroup(`Tab${this.pages.length + 1}`));
    }
    add(page) {
        this.pages.push(page);
    }
    delete(page) {
        this.pages = this.pages.filter((e) => e !== page);
    }
    select(page) {
        this.current = page;
    }
    selectById(id) {
        const current = this.pages.find((p) => p.id === id);
        if (current) {
            this.current = current;
        }
    }
    addItem(item) {
        if (this.current) {
            this.current.add(item);
        }
    }
    deleteItem(item) {
        if (this.current) {
            this.current.delete(item);
        }
    }
    getItems() {
        const result = [];
        for (const page of this.pages) {
            for (const item of page.items) {
                if (!item.empty) {
                    result.push(item);
                }
            }
        }
        return result;
    }
    validate() {
        this.valid = true;
        for (const page of this.pages) {
            page.validate();
            this.valid = this.valid && page.valid;
        }
    }
    reorder(previousIndex, currentIndex) {
        if (this.current) {
            this.current.reorder(previousIndex, currentIndex);
        }
        this.validate();
    }
    getComponents() {
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
    toJson() {
        return this.pages.map((p) => p.toJson());
    }
    from(json, create) {
        this.pages = [];
        if (Array.isArray(json)) {
            const defaultPage = [];
            for (const config of json) {
                if (config.type === MathItemType.GROUP) {
                    const page = MathGroup.from(config, create);
                    if (page) {
                        this.pages.push(page);
                    }
                }
                else {
                    defaultPage.push(config);
                }
            }
            if (defaultPage.length) {
                const page = MathGroup.from({
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
    static from(json, create) {
        const groups = new MathGroups();
        groups.from(json, create);
        return groups;
    }
}

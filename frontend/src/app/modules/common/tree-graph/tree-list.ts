export class TreeListItem<T> {
    public readonly data: T;
    public readonly parent: TreeListItem<T> | null;
    public readonly lvl: number;
    public readonly children: TreeListItem<T>[];
    public readonly path: TreeListItem<T>[];

    public collapsed: boolean;
    public expandable: boolean;
    public selected: boolean;
    public hidden: boolean;
    public highlighted: boolean;
    public searchHighlighted: '' | 'highlighted' | 'sub' | 'hidden';
    public search: string[];
    public searchChildren: string[];

    public id: string;
    public name: string;
    public subName: string;

    constructor(data: T, parent: TreeListItem<T> | null, lvl: number) {
        this.data = data;
        this.parent = parent;
        this.lvl = lvl;
        this.children = [];

        this.collapsed = true;
        this.expandable = false;
        this.selected = false;
        this.highlighted = false;
        this.search = [];
        this.searchChildren = [];
        this.searchHighlighted = '';

        this.id = (data as any)?.id || '';
        this.name = (data as any)?.name || '';

        if (this.parent) {
            this.path = [...this.parent.path, this];
        } else {
            this.path = [this];
        }

    }

    public setChildren(children: TreeListItem<T>[]) {
        this.children.length = 0;
        for (const child of children) {
            this.children.push(child);
        }
        this.expandable = this.children.length !== 0;
    }

    public select(selected: boolean) {
        this.selected = selected;
    }

    public collapse(collapsed: boolean) {
        this.collapsed = collapsed;
    }

    public collapsePath(collapsed: boolean) {
        this.collapsed = collapsed;
        if (this.parent) {
            this.parent.collapsePath(collapsed);
        }
    }

    public highlight(highlighted: boolean) {
        this.highlighted = highlighted;
    }

    private ifHidden(): boolean {
        if (this.collapsed) {
            return true;
        }
        if (this.parent) {
            return this.parent.ifHidden();
        } else {
            return false;
        }
    }

    public updateHidden() {
        if (this.parent) {
            this.hidden = this.parent.ifHidden();
        } else {
            this.hidden = false;
        }
    }

    public setSearchRules(f: (item: T) => string[]) {
        this.searchHighlighted = '';
        this.search = f(this.data);
        this.searchChildren = this.search.map((s) => s + '|');
        for (const child of this.children) {
            for (let i = 0; i < this.searchChildren.length; i++) {
                this.searchChildren[i] = this.searchChildren[i] + child.searchChildren[i] + '|';
            }
        }
    }
}

export class TreeListData<T> {
    public readonly list: TreeListItem<T>[];

    private _items: TreeListItem<T>[];

    public get items(): TreeListItem<T>[] {
        return this._items;
    }

    constructor(list: TreeListItem<T>[]) {
        this.list = list;
        this.updateHidden();
    }

    public select(item: TreeListItem<T>, selected: boolean) {
        item.select(selected)
    }

    public collapse(item: TreeListItem<T> | null, collapsed: boolean) {
        if (item) {
            item.collapse(collapsed)
        }
    }

    public collapseAll(collapsed: boolean) {
        for (const e of this.list) {
            e.collapse(collapsed);
        }
    }

    public collapsePath(item: TreeListItem<T> | null, collapsed: boolean) {
        if (item) {
            item.collapsePath(collapsed);
        }
    }

    public highlight(item: TreeListItem<T> | null, highlighted: boolean) {
        if (item) {
            item.highlight(highlighted)
        }
    }

    public highlightAll(highlighted: boolean) {
        for (const e of this.list) {
            e.highlight(highlighted);
        }
    }

    public findOne(f: (item: T) => boolean): TreeListItem<T> | null {
        for (const item of this.list) {
            if (f(item.data)) {
                return item;
            }
        }
        return null;
    }

    public find(f: (item: T) => boolean): TreeListItem<T>[] {
        const result: TreeListItem<T>[] = [];
        for (const item of this.list) {
            if (f(item.data)) {
                result.push(item);
            }
        }
        return result;
    }

    public findItem(f: (item: TreeListItem<T>) => boolean): TreeListItem<T> | null {
        for (const item of this.list) {
            if (f(item)) {
                return item;
            }
        }
        return null;
    }

    public updateHidden() {
        const list = this.list;
        for (const item of list) {
            item.updateHidden();
        }
        this._items = list.filter((i) => !i.hidden);
    }

    public setSearchRules(f: (item: T) => string[]) {
        for (let index = this.list.length - 1; index > -1; index--) {
            const item = this.list[index];
            item.setSearchRules(f);
        }
    }

    private testSearchRule(search: string[], text: string, ruleIndex: number | number[]): boolean {
        if (Array.isArray(ruleIndex)) {
            for (const index of ruleIndex) {
                if (search[index].includes(text)) {
                    return true;
                }
            }
            return false;
        } else {
            return search[ruleIndex].includes(text);
        }
    }

    public searchItems(text: string, ruleIndex: number | number[]): void {
        if (text) {
            for (const item of this.list) {
                if (this.testSearchRule(item.search, text, ruleIndex)) {
                    item.searchHighlighted = 'highlighted';
                } else {
                    if (this.testSearchRule(item.searchChildren, text, ruleIndex)) {
                        item.searchHighlighted = 'sub';
                        item.collapsed = false;
                    } else {
                        item.searchHighlighted = 'hidden';
                    }
                }
            }
        } else {
            for (const item of this.list) {
                item.searchHighlighted = '';
            }
        }
    }

    public static fromObject<T>(
        root: any,
        field: string,
        f?: (item: TreeListItem<T>) => TreeListItem<T>
    ): TreeListData<T> {
        const list: TreeListItem<T>[] = [];
        const getItem = (
            data: any,
            key: string,
            parent: TreeListItem<T> | null,
            lvl: number
        ): TreeListItem<T>[] => {
            const children: TreeListItem<T>[] = []
            const arrayObjects: any[] = data[key];
            if (Array.isArray(arrayObjects)) {
                for (const data of arrayObjects) {
                    let newItem = new TreeListItem(data, parent, lvl);
                    if (f) {
                        newItem = f(newItem);
                    }
                    list.push(newItem);
                    children.push(newItem);
                    const child = getItem(data, field, newItem, lvl + 1);
                    newItem.setChildren(child);
                }
            }
            return children;
        }
        getItem(root, field, null, 0)
        return new TreeListData(list);
    }
}

export class TreeListView<T> {
    private readonly _data: TreeListData<T>;
    private readonly _indexes: Set<number>;

    private _selectedFields: TreeListItem<T>[] = [];
    private _selectedCount = 0;
    private _selectedAllCount = 0;
    private _selectedLimit = 0;
    private _views: TreeListView<T>[];
    private _search: string;
    private _searchHighlighted: boolean;

    public get data(): TreeListData<T> {
        return this._data;
    }

    public get selectedFields(): TreeListItem<T>[] {
        return this._selectedFields;
    }

    public get selectedCount(): number {
        return this._selectedCount;
    }

    public get selectedAllCount(): number {
        return this._selectedAllCount;
    }

    public get items(): TreeListItem<T>[] {
        return this._data.items;
    }

    public get search(): string {
        return this._search;
    }

    public get searchHighlighted(): boolean {
        return this._searchHighlighted;
    }

    constructor(data: TreeListData<T>, indexes?: number[]) {
        this._data = data;
        this._views = [];
        this._search = '';
        if (indexes) {
            this._indexes = new Set<number>(indexes);
        } else {
            this._indexes = new Set<number>();
            for (let index = 0; index < data.list.length; index++) {
                this._indexes.add(index);
            }
        }
        this.updateHidden();
        this.updateSelected();
    }

    public setSelectedLimit(limit: number) {
        this._selectedLimit = limit
    }

    public select(item: TreeListItem<T>, selected: boolean) {
        this._data.select(item, selected);
    }

    public collapse(item: TreeListItem<T> | null, collapsed: boolean) {
        this._data.collapse(item, collapsed);
    }

    public collapseAll(collapsed: boolean) {
        this._data.collapseAll(collapsed);
    }

    public collapsePath(item: TreeListItem<T> | null, collapsed: boolean) {
        this._data.collapsePath(item, collapsed);
    }

    public highlight(item: TreeListItem<T> | null, highlighted: boolean) {
        this._data.highlight(item, highlighted);
    }

    public highlightAll(highlighted: boolean) {
        this._data.highlightAll(highlighted);
    }

    public findOne(f: (item: T) => boolean): TreeListItem<T> | null {
        return this._data.findOne(f);
    }

    public find(f: (item: T) => boolean): TreeListItem<T>[] {
        return this._data.find(f);
    }

    public findItem(f: (item: TreeListItem<T>) => boolean): TreeListItem<T> | null {
        return this._data.findItem(f);
    }

    public setSearchRules(f: (item: T) => string[]) {
        this._data.setSearchRules(f);
    }

    public updateSearch() {
        this._search = '';
        for (const index of this._indexes) {
            const item = this._data.list[index];
            if (item) {
                this._search = this._search + item.search[0] + '|';
            }
        }
    }

    public searchItems(text: string, ruleIndex: number | number[]): void {
        const value = (text || '').trim().toLocaleLowerCase();
        this._data.searchItems(value, ruleIndex);
    }

    public searchView(text: string): void {
        const value = (text || '').trim().toLocaleLowerCase();
        this._searchHighlighted = false;
        if (value && this._search.includes(value)) {
            this._searchHighlighted = true;
        }
    }

    public updateHidden() {
        this._data.updateHidden();
    }

    public updateSelected() {
        const list = this._data.list;
        this._selectedAllCount = list.filter((item) => item.selected).length;
        this._selectedFields = list.filter((item, index) => item.selected && this._indexes.has(index));
        this._selectedCount = this._selectedFields.length;
        if (this._selectedLimit) {
            this._selectedFields = this._selectedFields.slice(0, this._selectedLimit);
        }
        for (const view of this._views) {
            view.updateSelected();
        }
    }

    public getSelected(): TreeListItem<T>[] {
        return this._data.list.filter((item) => item.selected);
    }

    public createView(f: (item: TreeListItem<T>) => boolean): TreeListView<T> {
        const indexes: number[] = [];

        for (let i = 0; i < this._data.list.length; i++) {
            const item = this._data.list[i];
            if (f(item)) {
                indexes.push(i);
            }
        }
        const view = new TreeListView<T>(this._data, indexes);
        this._views.push(view);
        return view;
    }

    public static createView<T>(data: TreeListData<T>, f: (item: TreeListItem<T>) => boolean): TreeListView<T> {
        const indexes: number[] = [];

        for (let i = 0; i < data.list.length; i++) {
            const item = data.list[i];
            if (f(item)) {
                indexes.push(i);
            }
        }
        return new TreeListView<T>(data, indexes);
    }
}
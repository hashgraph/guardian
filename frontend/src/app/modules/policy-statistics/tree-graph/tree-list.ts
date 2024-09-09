export class TreeListItem<T> {
    public readonly data: T;
    public readonly parent: TreeListItem<T> | null;
    public readonly lvl: number;
    public readonly children: TreeListItem<T>[];

    public collapsed: boolean;
    public expandable: boolean;
    public selected: boolean;
    public hidden: boolean;
    public highlighted: boolean;

    constructor(data: T, parent: TreeListItem<T> | null, lvl: number) {
        this.data = data;
        this.parent = parent;
        this.lvl = lvl;
        this.children = [];

        this.collapsed = true;
        this.expandable = false;
        this.selected = false;
        this.highlighted = false;
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
}

export class TreeListData<T> {
    public readonly list: TreeListItem<T>[];

    private _items: TreeListItem<T>[];

    public get items(): TreeListItem<T>[] {
        return this._items;
    }

    constructor(list: TreeListItem<T>[]) {
        this.list = list;
        this.update();
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

    public update() {
        const list = this.list;

        //Hidden
        for (const item of list) {
            item.updateHidden();
        }
        this._items = list.filter((i) => !i.hidden);
    }

    public static fromObject<T>(object: any, field: string): TreeListData<T> {
        const list: TreeListItem<T>[] = [];
        const getItem = (
            data: any,
            key: string,
            parent: TreeListItem<T> | null,
            lvl: number
        ): TreeListItem<T>[] => {
            const children: TreeListItem<T>[] = []
            const array: any[] = data[key];
            if (Array.isArray(array)) {
                for (const f of array) {
                    const i = new TreeListItem(f, parent, lvl);
                    list.push(i);
                    children.push(i);
                    const c = getItem(f, field, i, lvl + 1);
                    i.setChildren(c);
                }
            }
            return children;
        }
        getItem(object, field, null, 0)
        return new TreeListData(list);
    }
}

export class TreeListView<T> {
    private readonly _data: TreeListData<T>;
    private readonly _indexes: Set<number>;

    private _selectedFields: TreeListItem<T>[] = [];
    private _selectedCount = 0;
    private _selectedLimit = 0;
    private _views: TreeListView<T>[];

    public get selectedFields(): TreeListItem<T>[] {
        return this._selectedFields;
    }

    public get selectedCount(): number {
        return this._selectedCount;
    }

    public get items(): TreeListItem<T>[] {
        return this._data.items;
    }

    constructor(data: TreeListData<T>, indexes?: number[]) {
        this._data = data;
        this._views = [];
        if (indexes) {
            this._indexes = new Set<number>(indexes);
        } else {
            this._indexes = new Set<number>();
            for (let index = 0; index < data.list.length; index++) {
                this._indexes.add(index);
            }
        }
        this.update();
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

    public update(updateData: boolean = true) {
        if (updateData) {
            this._data.update();
        }
        const list = this._data.list;
        this._selectedFields = list.filter((item, index) => item.selected && this._indexes.has(index));
        this._selectedCount = this._selectedFields.length;
        if (this._selectedLimit) {
            this._selectedFields = this._selectedFields.slice(0, this._selectedLimit);
        }
        for (const view of this._views) {
            view.update(false);
        }
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
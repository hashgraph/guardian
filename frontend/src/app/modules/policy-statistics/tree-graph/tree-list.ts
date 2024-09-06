export class TreeListItem<T> {
    public readonly data: T;
    public readonly parent: TreeListItem<T> | null;
    public readonly lvl: number;
    public readonly children: TreeListItem<T>[];

    public collapsed: boolean;
    public expandable: boolean;
    public selected: boolean;
    public hidden: boolean;

    constructor(data: T, parent: TreeListItem<T> | null, lvl: number) {
        this.data = data;
        this.parent = parent;
        this.lvl = lvl;
        this.children = [];

        this.collapsed = true;
        this.expandable = false;
        this.selected = false;
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
        this._items = list;
        this.updateHidden();
    }

    public select(item: TreeListItem<T>, selected: boolean) {
        item.select(selected)
    }

    public collapse(item: TreeListItem<T>, collapsed: boolean) {
        item.collapse(collapsed);
        this.updateHidden();
    }

    public getSelected(): TreeListItem<T>[] {
        return this.list.filter((i) => i.selected);
    }

    public updateHidden() {
        for (const item of this.list) {
            item.updateHidden();
        }
        this._items = this.list.filter((i) => !i.hidden);
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

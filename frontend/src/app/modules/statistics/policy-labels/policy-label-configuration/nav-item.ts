import { GenerateUUIDv4, IGroupItemConfig, ILabelItemConfig, INavImportsConfig, INavItemConfig, IPolicyLabel, IRulesItemConfig, IStatistic, IStatisticItemConfig, NavItemType } from "@guardian/interfaces";
import { TreeNode } from "primeng/api";

export const NavIcons: { [type: string]: string } = {
    'group': 'folder',
    'rules': 'file',
    'label': 'circle-check',
    'statistic': 'stats',
    'default': 'file'
}

export class NavItem implements TreeNode {
    public readonly config: INavItemConfig;
    public readonly nodeType: string = 'default';
    public readonly nodeIcon: string = 'default';

    public prefix: string = '';
    public get blockType(): string {
        return this.config.type;
    }
    public get configurable(): boolean {
        return (
            this.config.type === NavItemType.Rules ||
            this.config.type === NavItemType.Statistic
        );
    }
    public get messageId(): string {
        return (this.config as any).messageId;
    }

    public readonly readonly: boolean;
    public freezed: boolean;

    //Tree Node
    public get key(): string {
        return this.config.id;
    }
    public get type(): string {
        return this.nodeType;
    }
    public get label(): string {
        return this.prefix + this.config.title;
    }
    public get droppable(): boolean {
        return !this.freezed && this.config.type === NavItemType.Group;
    }
    public get draggable(): boolean {
        return !this.freezed;
    }
    public get selectable(): boolean {
        return this.freezed || this.config.type !== NavItemType.Group;
    }
    public children?: NavItem[] | undefined;
    public parent?: NavItem | undefined;

    constructor(type: NavItemType, config?: INavItemConfig) {
        if (config) {
            this.config = config;
        } else {
            this.config = {
                id: GenerateUUIDv4(),
                type: type,
                name: type,
                title: type
            }
        }
        if (!this.config.id) {
            this.config.id = GenerateUUIDv4();
        }
        this.config.type = type;
        this.nodeType = 'default';
        this.nodeIcon = NavIcons[this.config.type] || 'default';
        this.freezed = false;
        if (
            this.config.type === NavItemType.Label ||
            this.config.type === NavItemType.Statistic
        ) {
            this.readonly = true;
        } else {
            this.readonly = false;
        }
    }

    public setId(id: string) {
        this.config.id = id;
    }

    public clone(): NavItem {
        const config = JSON.parse(JSON.stringify(this.config));
        const clone = new NavItem(config.type, config);
        clone.freezed = this.freezed;
        if (Array.isArray(this.children)) {
            clone.children = [];
            for (const child of this.children) {
                clone.children.push(child.clone());
            }
        }
        return clone;
    }

    public add(node: NavItem | null): void {
        if (!node) {
            return;
        }
        if (this.children) {
            this.children.push(node);
        } else {
            this.children = [node];
        }
        node.freeze(this.freezed || this.readonly);
    }

    public freeze(freezed: boolean) {
        this.freezed = freezed;
        if (Array.isArray(this.children)) {
            for (const child of this.children) {
                child.freeze(this.freezed || this.readonly);
            }
        }
    }

    public save(): void {

    }

    public toJson<T extends INavItemConfig>(): T | null {
        switch (this.config.type) {
            case NavItemType.Group: {
                const children: INavItemConfig[] = [];
                if (Array.isArray(this.children)) {
                    for (const item of this.children) {
                        const child = item.toJson();
                        if (child) {
                            children.push(child);
                        }
                    }
                }
                const join: IGroupItemConfig = {
                    id: this.config.id,
                    type: NavItemType.Group,
                    name: this.config.name,
                    title: this.config.title,
                    rule: this.config.rule,
                    children
                };
                return join as any;
            }
            case NavItemType.Label: {
                const join: ILabelItemConfig = {
                    id: this.config.id,
                    type: NavItemType.Label,
                    name: this.config.name,
                    title: this.config.title,
                    description: this.config.description,
                    owner: this.config.owner,
                    messageId: this.config.messageId,
                    config: this.config.config,
                };
                return join as any;
            }
            case NavItemType.Rules: {
                const join: IRulesItemConfig = {
                    id: this.config.id,
                    type: NavItemType.Rules,
                    name: this.config.name,
                    title: this.config.title,
                    description: this.config.description,
                    owner: this.config.owner,
                    config: this.config.config,
                };
                return join as any;
            }
            case NavItemType.Statistic: {
                const join: IStatisticItemConfig = {
                    id: this.config.id,
                    type: NavItemType.Statistic,
                    name: this.config.name,
                    title: this.config.title,
                    description: this.config.description,
                    owner: this.config.owner,
                    messageId: this.config.messageId,
                    config: this.config.config,
                };
                return join as any;
            }
        }
    }

    public static from(config: INavItemConfig): NavItem | null {
        if (config?.type) {
            const node = new NavItem(config.type, config);
            const children = NavItem.getChildren(config);
            for (const childConfig of children) {
                node.add(NavItem.from(childConfig));
            }
            return node;
        } else {
            return null;
        }
    }

    private static getChildren(config: INavItemConfig): INavItemConfig[] {
        if (config?.type === NavItemType.Label) {
            return config.config?.children || [];
        }
        if (config?.type === NavItemType.Group) {
            return config.children || [];
        }
        return [];
    }

    public static menu(type: NavItemType, label: string): NavItem {
        const node = new NavItem(type, {
            id: GenerateUUIDv4(),
            type: type,
            name: label,
            title: label,
        });
        return node;
    }

    public static updateOrder(tree: NavItem[], prefix: string = '') {
        for (let i = 0; i < tree.length; i++) {
            const item = tree[i];
            item.prefix = `${prefix}${i + 1}. `;
            if (item.children) {
                NavItem.updateOrder(item.children, `${prefix}${i + 1}.`);
            }
        }
    }

    public static fromLabel(item: IPolicyLabel): NavItem | null {
        const config: ILabelItemConfig = {
            id: item.id || GenerateUUIDv4(),
            type: NavItemType.Label,
            name: item.name || '',
            title: item.name || '',
            description: item.description || '',
            owner: item.owner || '',
            messageId: item.messageId,
            config: item.config,
        }
        return NavItem.from(config);
    }

    public static fromStatistic(item: IStatistic): NavItem | null {
        const config: IStatisticItemConfig = {
            id: item.id || GenerateUUIDv4(),
            type: NavItemType.Statistic,
            name: item.name || '',
            title: item.name || '',
            description: item.description || '',
            owner: item.owner || '',
            messageId: item.messageId,
            config: item.config,
        }
        return NavItem.from(config);
    }

    public static fromImport(item: INavImportsConfig): NavItem | null {
        if (item.type === NavItemType.Statistic) {
            const config: IStatisticItemConfig = {
                id: item.id || GenerateUUIDv4(),
                type: NavItemType.Statistic,
                name: item.name || '',
                title: item.name || '',
                description: item.description || '',
                owner: item.owner || '',
                messageId: item.messageId,
                config: item.config,
            }
            return NavItem.from(config);
        }
        if (item.type === NavItemType.Label) {
            const config: ILabelItemConfig = {
                id: item.id || GenerateUUIDv4(),
                type: NavItemType.Label,
                name: item.name || '',
                title: item.name || '',
                description: item.description || '',
                owner: item.owner || '',
                messageId: item.messageId,
                config: item.config,
            }
            return NavItem.from(config);
        }
        return null;
    }
}

export class NavTree {
    public mode: any = 'drag';
    public data: NavItem[] = [];

    public add(node: NavItem | null): void {
        if (node) {
            this.data.push(node);
        }
    }

    public update() {
        NavItem.updateOrder(this.data);
    }

    public delete(node: NavItem): void {
        this._deleteNode(this.data, node);
    }

    private _deleteNode(nodes: NavItem[] | undefined, node: NavItem): void {
        if (!Array.isArray(nodes)) {
            return;
        }
        const index = nodes.indexOf(node);
        if (index > -1) {
            nodes.splice(index, 1);
        } else {
            for (const item of nodes) {
                this._deleteNode(item.children, node);
            }
        }
    }

    public toJson(): INavItemConfig[] {
        const children: INavItemConfig[] = [];
        for (const item of this.data) {
            const child = item.toJson();
            if (child) {
                children.push(child);
            }
        }
        return children;
    }

    public static fromTree(children?: INavItemConfig[]): NavTree {
        const tree = new NavTree();
        if (Array.isArray(children)) {
            for (const child of children) {
                tree.add(NavItem.from(child));
            }
        }
        return tree;
    }

    public static from(item?: IPolicyLabel): NavTree {
        return this.fromTree(item?.config?.children);
    }
}

interface MenuItem {
    title: string,
    expanded: boolean,
    items: NavItem[]
}

export class NavMenu {
    public readonly menu: MenuItem[];

    public imports: NavItem[];

    private readonly generalMenu: MenuItem;
    private readonly statisticsMenu: MenuItem;
    private readonly labelsMenu: MenuItem;

    public readonly map: Set<string>;

    constructor() {
        this.generalMenu = {
            title: 'General',
            expanded: true,
            items: [
                NavItem.menu(NavItemType.Group, 'Group'),
                NavItem.menu(NavItemType.Rules, 'Rules'),
            ]
        };
        this.statisticsMenu = {
            title: 'Statistics',
            expanded: true,
            items: []
        };
        this.labelsMenu = {
            title: 'Labels',
            expanded: true,
            items: []
        };
        this.menu = [
            this.generalMenu,
            this.statisticsMenu,
            this.labelsMenu,
        ];
        this.map = new Set<string>();
        this.imports = [];
    }

    public addStatistic(item: IStatistic) {
        const menuItem = NavItem.fromStatistic(item);
        this.add(menuItem);
    }

    public addLabel(item: IPolicyLabel) {
        const menuItem = NavItem.fromLabel(item);
        this.add(menuItem);
    }

    public add(item: NavItem | null) {
        if (!item) {
            return;
        }
        if (this.map.has(item.messageId)) {
            return;
        }
        if (item?.blockType === NavItemType.Statistic) {
            this.statisticsMenu.items.push(item);
            this.map.add(item.messageId);
            this.imports.push(item);
        }
        if (item?.blockType === NavItemType.Label) {
            this.labelsMenu.items.push(item);
            this.map.add(item.messageId);
            this.imports.push(item);
        }
    }

    public delete(item: NavItem) {
        this.statisticsMenu.items = this.statisticsMenu.items.filter((e) => e !== item);
        this.labelsMenu.items = this.labelsMenu.items.filter((e) => e !== item);
        this.imports = this.imports.filter((e) => e !== item);
        this.map.delete(item.messageId);
    }

    public toJson(): INavImportsConfig[] {
        const imports: INavImportsConfig[] = [];
        for (const item of this.imports) {
            const child = item.toJson<ILabelItemConfig | IStatisticItemConfig>();
            if (child) {
                imports.push(child);
            }
        }
        return imports;
    }

    public static from(item: IPolicyLabel): NavMenu {
        return this.fromImports(item.config?.imports);
    }

    public static fromImports(imports?: INavImportsConfig[]): NavMenu {
        const menu = new NavMenu();
        if (Array.isArray(imports)) {
            for (const item of imports) {
                const menuItem = NavItem.fromImport(item);
                menu.add(menuItem);
            }
        }
        return menu;
    }
}
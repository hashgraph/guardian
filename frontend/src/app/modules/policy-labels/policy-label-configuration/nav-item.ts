import { GenerateUUIDv4 } from "@guardian/interfaces";
import { TreeNode } from "primeng/api";

export enum NavItemType {
    Group = 'group',
    Rules = 'rules',
    Label = 'label',
    Statistic = 'statistic',
}

export const NavIcons: { [type: string]: string } = {
    'group': 'folder',
    'rules': 'file',
    'label': 'circle-check',
    'statistic': 'stats',
    'default': 'file'
}

export interface INavItemConfig {
    id: string;
    type: NavItemType;
    name: string;
    config?: any;
}

export class NavItem implements TreeNode {
    public readonly config: INavItemConfig;
    public readonly nodeType: string = 'default';
    public readonly nodeIcon: string = 'default';

    public prefix: string = '';
    public get blockType(): string {
        return this.config.type;
    }

    //Tree Node
    public get key(): string {
        return this.config.id;
    }
    public get type(): string {
        return this.nodeType;
    }
    public get label(): string {
        return this.prefix + this.config.name;
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
                name: type
            }
        }
        if (!this.config.id) {
            this.config.id = GenerateUUIDv4();
        }
        this.config.type = type;
        switch (this.config.type) {
            case NavItemType.Group:
            case NavItemType.Rules: {
                this.nodeType = 'default';
                break;
            }
            case NavItemType.Label:
            case NavItemType.Statistic: {
                this.nodeType = 'readonly';
                break;
            }
        }
        this.nodeIcon = NavIcons[this.config.type] || 'default';
    }

    public clone(): NavItem {
        const config = JSON.parse(JSON.stringify(this.config));
        config.id = GenerateUUIDv4();
        return new NavItem(config.type, config);
    }

    public save(): void {

    }

    public static from(config: INavItemConfig): NavItem {
        const node = new NavItem(config?.type, config);
        return node;
    }

    public static menu(type: NavItemType, label: string): NavItem {
        const node = new NavItem(type, {
            id: GenerateUUIDv4(),
            type: type,
            name: label
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
}

export class NavTree {
    public data: NavItem[] = [];

    public add(node: NavItem): void {
        this.data.push(node);
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
}
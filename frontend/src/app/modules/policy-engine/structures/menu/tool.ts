export class ToolMenu {
    public readonly items: ToolMenuItem[];
    private readonly map: Map<string, ToolMenuItem>;

    constructor() {
        this.items = [];
        this.map = new Map<string, ToolMenuItem>()
    }

    public setItems(tools: any[]): void {
        this.items.length = 0;
        this.map.clear();
        for (const tool of tools) {
            const item = new ToolMenuItem(this, tool)
            this.items.push(item);
            this.map.set(item.messageId, item);
        }
        for (const tool of this.items) {
            tool.updateIds();
        }
        for (const tool of this.items) {
            tool.updateSubTools();
        }
    }

    public find(id: string): ToolMenuItem | undefined {
        return this.map.get(id);
    }

    public filter(ids: Set<string>): ToolMenuItem[] {
        const map = new Map<string, ToolMenuItem>();
        for (const tool of this.items) {
            if (ids.has(tool.messageId)) {
                for (const sub of tool.all) {
                    map.set(sub.messageId, sub);
                }
            }
        }
        return Array.from(map.values());
    }
}

export class ToolMenuItem {
    public readonly data: string;
    public readonly search: string;
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly messageId: string;
    public readonly hash: string;
    public readonly owner: string;
    public readonly topicId: string;
    public readonly schemas: any[];

    private readonly parent: ToolMenu;
    private readonly _toolIds: string[];

    private _children: ToolMenuItem[];
    private _all: ToolMenuItem[];

    constructor(parent: ToolMenu, tool: any) {
        this.parent = parent;
        this.id = (tool.id || '');
        this.name = (tool.name || '');
        this.description = (tool.description || '');
        this.messageId = (tool.messageId || '');
        this.hash = (tool.hash || '');
        this.owner = (tool.owner || '');
        this.topicId = (tool.topicId || '');
        this.schemas = [];
        if (Array.isArray(tool.schemas)) {
            for (const schema of tool.schemas) {
                this.schemas.push({ ...schema, status: 'TOOL' });
            }
        }
        this._toolIds = [];
        if (Array.isArray(tool.tools)) {
            for (const sub of tool.tools) {
                this._toolIds.push(sub.messageId);
            }
        }
        this.data = `tool:${tool.messageId}`;
        this.search = this.name.toLowerCase();
        this._children = [];
        this._all = [];
    }

    public get children(): ToolMenuItem[] {
        return this._children;
    }

    public get all(): ToolMenuItem[] {
        return this._all;
    }

    public updateIds(): void {
        this._children = [];
        for (const id of this._toolIds) {
            const tool = this.parent.find(id);
            if (tool) {
                this._children.push(tool);
            }
        }
    }

    public updateSubTools(): void {
        this._all = [];
        const map = new Map<string, ToolMenuItem | null>();
        this.findAll(map);
        for (const item of map.values()) {
            if (item) {
                this._all.push(item);
            }
        }
    }

    private findAll(map: Map<string, ToolMenuItem | null>): void {
        if (map.get(this.messageId)) {
            return;
        }
        map.set(this.messageId, this);
        for (const sub of this._children) {
            sub.findAll(map);
        }
    }
}
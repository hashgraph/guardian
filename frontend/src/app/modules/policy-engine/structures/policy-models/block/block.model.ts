import { moveItemInArray } from '@angular/cdk/drag-drop';
import { BlockType, GenerateUUIDv4, IArtifact } from '@guardian/interfaces';
import { PolicyEvent } from './block-event.model';
import { IBlockConfig } from '../interfaces/block-config.interface';
import { IEventConfig } from '../interfaces/event-config.interface';
import { IModuleVariables } from '../interfaces/module-variables.interface';
import { PolicyFolder } from '../interfaces/types';

export class PolicyBlock {
    public id!: string;
    public blockType!: string;
    public properties!: { [name: string]: any; };

    protected _module: PolicyFolder | undefined;
    protected _parent!: PolicyBlock | null;
    protected _children!: PolicyBlock[];
    protected _events!: PolicyEvent[];
    protected _artifacts!: IArtifact[];
    protected _root!: boolean;
    protected _changed!: boolean;
    protected _defaultEvent: PolicyEvent | null | undefined;
    protected _tag!: string;
    protected _localTag!: string;
    protected _lastPrefix!: string;
    protected _permissionsNumber!: string[];
    protected _post!: boolean;
    protected _get!: boolean;

    constructor(config: IBlockConfig, parent: PolicyBlock | null) {
        this.init(config, parent);
    }

    public init(config: IBlockConfig, parent: PolicyBlock | null) {
        this._changed = false;
        this._root = false;

        this.id = config.id || GenerateUUIDv4();
        this.blockType = config.blockType;
        if (!Array.isArray(config.permissions)) {
            config.permissions = [];
        }
        this._parent = parent;
        this._tag = config.tag || '';
        this._localTag = this._tag;
        this._lastPrefix = '';

        const clone: any = { ...config };
        delete clone.children;
        delete clone.events;
        delete clone.artifacts;
        delete clone.tag;

        this.properties = clone;

        this._events = [];
        if (Array.isArray(config.events)) {
            for (const event of config.events) {
                this._events.push(new PolicyEvent(event, this));
            }
        }

        this._artifacts = config.artifacts || [];
        this._children = [];
        this._permissionsNumber = [];
        this._post = false;
        this._get = false;
    }

    public setModule(module?: PolicyFolder): void {
        this._module = module;
        if (this._module) {
            this._updatePermissions();
            this._lastPrefix = this._module.tagPrefix;
            if (this._lastPrefix && this._localTag.startsWith(this._lastPrefix)) {
                this._localTag = this._localTag.replace(this._lastPrefix, '');
            }
        }
    }

    public get folder(): PolicyFolder | undefined {
        return this._module;
    }

    public get policyId(): string | undefined {
        return this._module?.id;
    }

    public get isModule(): boolean {
        return false;
    }

    public get isTool(): boolean {
        return false;
    }

    public get isPolicy(): boolean {
        return true;
    }

    public get isTest(): boolean {
        if (this._module) {
            return this._module.isTest;
        }
        return false;
    }

    public get rootParent(): PolicyBlock {
        if (this._parent) {
            return this._parent.rootParent;
        } else {
            return this;
        }
    }

    public get canAddBlocks(): boolean {
        if (this._module) {
            return this._module.canAddBlocks;
        }
        return true;
    }

    public get canAddModules(): boolean {
        if (this._module) {
            return this._module.canAddModules;
        }
        return true;
    }

    public get canAddTools(): boolean {
        if (this._module) {
            return this._module.canAddTools;
        }
        return true;
    }

    public get isRoot(): boolean {
        return this._root;
    }

    public get expandable(): boolean {
        return !!(this.children && this.children.length);
    }

    public get tag(): string {
        if (this._module && this._lastPrefix !== this._module.tagPrefix) {
            this._lastPrefix = this._module.tagPrefix;
            this._tag = this._lastPrefix + this._localTag;
        }
        return this._tag;
    }

    public get localTag(): string {
        return this._localTag;
    }

    public set localTag(value: string) {
        this.setLocalTagSilently(value);
        this.changed = true;
    }

    public setLocalTagSilently(value: string) {
        this._localTag = value;
        if (this._module) {
            this._lastPrefix = this._module.tagPrefix;
            this._tag = this._lastPrefix + this._localTag;
        } else {
            this._tag = this._localTag;
        }
    }

    public get permissions(): string[] {
        return this.properties.permissions;
    }

    public set permissions(value: string[]) {
        this.silentlySetPermissions(value);
        this._updatePermissions();
        this.changed = true;
    }

    public set isRoot(value: boolean) {
        this._root = value;
    }

    public silentlySetPermissions(value: string[]) {
        if (Array.isArray(value)) {
            this.properties.permissions = value;
        } else {
            this.properties.permissions = [];
        }
    }

    public get children(): PolicyBlock[] {
        return this._children;
    }

    public get events(): PolicyEvent[] {
        return this._events;
    }

    public get artifacts(): IArtifact[] {
        return this._artifacts;
    }

    public get parent(): PolicyBlock | null {
        return this._parent;
    }

    public set parent(value: PolicyBlock | null) {
        this._parent = value;
        this.changed = true;
    }

    public get parent2(): PolicyBlock | null {
        if (this._parent && !this._parent.isModule) {
            return this._parent._parent;
        }
        return null;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this._module) {
            this._module.changed = true;
        }
    }

    public get next(): PolicyBlock | undefined {
        if (this.parent) {
            const index = this.parent.children.findIndex(c => c.id == this.id);
            let next = this.parent.children[index + 1];
            return next;
        }
        return undefined;
    }

    public get prev(): PolicyBlock | undefined {
        if (this.parent) {
            const index = this.parent.children.findIndex(c => c.id == this.id);
            return this.parent.children[index - 1];
        }
        return undefined;
    }

    public get lastChild(): PolicyBlock | null {
        try {
            return this._children[this._children.length - 1];
        } catch (error) {
            return null;
        }
    }

    public get permissionsNumber(): string[] {
        return this._permissionsNumber;
    }

    public get getApi(): boolean {
        return this._get;
    }

    public get postApi(): boolean {
        return this._post;
    }

    public remove() {
        if (this._parent) {
            this._parent._removeChild(this);
            this._parent.refresh();
            this._parent = null;
        }
    }

    public removeChild(child: PolicyBlock) {
        this._removeChild(child);
        child._parent = null;
        this.refresh();
    }

    public createChild(block: IBlockConfig, index?: number): any {
        if (this._module) {
            block.tag = this._module.getNewTag('Block');
        }
        const newBlock = this._createChild(block, this._module, index);
        this.refresh();
        return newBlock
    }

    public pasteChild(block: IBlockConfig) {
        this._pasteChild(block, this._module);
        this.refresh();
    }

    public addChild(child: PolicyBlock, index?: number) {
        this._addChild(child, index);
        this.refresh();
    }

    protected _updatePermissions(): void {
        this._permissionsNumber = [];
        if (Array.isArray(this.properties.permissions)) {
            for (const p of this.properties.permissions) {
                if (p === 'OWNER') {
                    this._permissionsNumber.push('OWNER');
                } else if (p === 'NO_ROLE') {
                    this._permissionsNumber.push('NO_ROLE');
                } else if (p === 'ANY_ROLE') {
                    this._permissionsNumber.push('ANY_ROLE');
                } else if (this._module) {
                    this._permissionsNumber.push(
                        String(this._module.getPermissionsNumber(p))
                    );
                }
            }
        }
    }

    protected _createChild(block: IBlockConfig, module: any, index?: number) {
        delete block.children;
        const child = new PolicyBlock(block, this);
        child.setModule(module);
        if (!child.permissions || !child.permissions.length) {
            child.permissions = this.permissions.slice();
        }
        this._addChild(child, index);
        return child;
    }

    protected _pasteChild(block: IBlockConfig, module: any) {
        block.id = GenerateUUIDv4();
        const children = block.children;
        delete block.children;
        delete block.events;

        if (module) {
            block.tag = module.getNewTag('Block');
        }
        const newBlock = new PolicyBlock(block, this);
        newBlock.setModule(module);
        if (module) {
            module._tagMap[newBlock.tag] = newBlock;
        }

        this._addChild(newBlock);

        if (Array.isArray(children)) {
            for (const child of children) {
                newBlock._pasteChild(child, module);
            }
        }
    }

    private _addChild(child: PolicyBlock, index?: number) {
        child._parent = this;
        if (index !== undefined && Number.isFinite(index)) {
            if (index < 0) {
                this._children.unshift(child);
            } else if (index >= this._children.length) {
                this._children.push(child);
            } else {
                this._children.splice(index, 0, child);
            }
        } else {
            this._children.push(child);
        }
    }

    private _removeChild(child: PolicyBlock) {
        const index = this._children.findIndex((c) => c.id == child.id);
        if (index !== -1) {
            this._children.splice(index, 1);
        }
    }

    public createEvent(event: IEventConfig) {
        const e = new PolicyEvent(event, this);
        this._addEvent(e);
        this.refresh();
    }

    public addEvent(event: PolicyEvent) {
        this._addEvent(event);
        this.refresh();
    }

    private _addEvent(event: PolicyEvent) {
        this._events.push(event);
    }

    public _removeEvent(event: PolicyEvent) {
        const index = this._events.findIndex((c) => c.id == event?.id);
        if (index !== -1) {
            this._events.splice(index, 1);
        }
    }

    public removeEvent(event: PolicyEvent) {
        const index = this._events.findIndex((c) => c.id == event?.id);
        if (index !== -1) {
            this._events.splice(index, 1);
        }
        event?.remove();
    }

    public addArtifact(artifact: IArtifact) {
        this._artifacts.push(artifact);
        this._changed = true;
    }

    public removeArtifact(artifact: IArtifact) {
        const index = this._artifacts.indexOf(artifact);
        if (index !== -1) {
            this._artifacts.splice(index, 1);
            this._changed = true;
        }
    }

    public changeArtifactPosition(prevIndex: number, currentIndex: number) {
        moveItemInArray(this._artifacts, prevIndex, currentIndex);
        this._changed = true;
    }

    public change(parent: boolean = false) {
        this._changed = true;
        if (parent && this._module) {
            this._module.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        if (this._module) {
            this._module.emitUpdate();
        }
    }

    public getJSON(): any {
        const json: any = { ...this.properties };
        json.id = this.id;
        json.blockType = this.blockType;
        json.tag = this.tag;
        json.children = [];
        json.events = [];
        json.artifacts = this.artifacts || [];

        for (const block of this.children) {
            json.children.push(block.getJSON());
        }
        if (this._module) {
            for (const event of this._module.allEvents) {
                if (event.isSource(this)) {
                    json.events.push(event.getJSON());
                }
            }
        }
        return json;
    }

    public getProp(): any {
        const json: any = { ...this.properties };
        json.id = this.id;
        json.blockType = this.blockType;
        json.tag = this.tag;
        return json;
    }

    public rebuild(object: any) {
        delete object.children;
        delete object.events;
        delete object.innerEvents;

        const keys1 = Object.keys(this.properties);
        const keys2 = Object.keys(object);
        for (const key of keys1) {
            if (key !== 'blockType' &&
                key !== 'id' &&
                key !== 'tag') {
                delete this.properties[key];
            }
        }
        for (const key of keys2) {
            this.properties[key] = object[key];
        }
        if (this._module) {
            this._module.emitUpdate();
        }
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }

    public isFinal(): boolean {
        if (this.parent && this.parent.blockType === BlockType.Step) {
            if (this.parent.lastChild == this) {
                return true;
            }
            if (Array.isArray(this.parent.properties?.finalBlocks)) {
                return this.parent.properties.finalBlocks.indexOf(this.tag) > -1;
            }
        }
        return false;
    }

    public replaceConfig(newConfig: PolicyBlock): boolean {
        if (this.blockType === newConfig?.blockType) {
            Object.assign(this.properties, newConfig.properties);
            return true;
        }
        return false;
    }

    public append(parent: PolicyBlock) {
        parent._addChild(this);
        parent.refresh();
    }

    public _replace(oldItem: PolicyBlock, newItem: PolicyBlock) {
        oldItem.parent = null;
        newItem.parent = this;
        const index = this._children.findIndex((c) => c.id == oldItem.id);
        if (index !== -1) {
            this._children[index] = newItem;
        } else {
            this._children.push(newItem);
        }
    }

    public replace(oldItem: PolicyBlock, newItem: PolicyBlock) {
        this._replace(oldItem, newItem);
        this.refresh();
    }

    public index(): number {
        if (this.parent) {
            return this.parent.indexOf(this);
        }
        return -1;
    }

    public indexOf(block: PolicyBlock): number {
        return this._children.indexOf(block);
    }

    public appendTo(parent: PolicyBlock | null, index?: number): boolean {
        if (parent) {
            if (this._parent) {
                this._parent._removeChild(this);
                this._parent = null;
            }
            parent._addChild(this, index);
            parent.refresh();
            return true;
        }
        return false;
    }

    public get blockVariables(): IModuleVariables | null {
        return null;
    }

    public get moduleVariables(): IModuleVariables | null {
        if (this._module) {
            return this._module.blockVariables;
        }
        return null;
    }

    public refreshData(): void {
        return;
    }

    public refresh(): void {
        if (this._module) {
            this._module.refresh();
        } else {
            this.refreshData();
        }
    }

    public setAbout(about: any): void {
        if (about) {
            this._post = about.post;
            this._get = about.get;
        }
        if (about && about.defaultEvent) {
            this._defaultEvent = new PolicyEvent({
                actor: '',
                disabled: false,
                input: 'RunEvent',
                output: 'RunEvent',
                source: '',
                target: '',
            }, this);
            this._defaultEvent.default = true;
        } else {
            this._defaultEvent = null;
        }
    }

    public getActiveEvents(): PolicyEvent[] {
        const events: PolicyEvent[] = [];
        if (!this.properties.stopPropagation && this._defaultEvent) {
            this._defaultEvent.sourceTag = this.tag;
            this._defaultEvent.targetTag = this.next?.tag || '';
            events.push(this._defaultEvent);
        }
        for (const event of this.events) {
            if (!event.disabled) {
                events.push(event);
            }
        }
        return events;
    }

    public search(blockType: string): PolicyBlock | null {
        if (this.blockType === blockType) {
            return this;
        }
        if (this._children) {
            for (const child of this._children) {
                const result = child.search(blockType);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }
}

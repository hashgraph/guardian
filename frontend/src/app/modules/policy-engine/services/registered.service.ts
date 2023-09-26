import { Injectable } from '@angular/core';
import { BlockType, GenerateUUIDv4 } from '@guardian/interfaces';
import { BlockAbout, ChildrenType, ControlType, IBlockAbout, IBlockSetting } from '../structures';
import blocks from './blocks-information';
import modules from './module-information';
import tools from './tool-information';
import { PolicyFolder, PolicyItem } from '../structures/policy-models/interfaces/types';

@Injectable()
export class RegisteredService {
    private types: string[];
    private list: any[];

    private factories: { [type: string]: any };
    private properties: { [type: string]: any };
    private group: { [type: string]: string };
    private header: { [type: string]: string };
    private icons: { [type: string]: string };
    private allowedChildren: { [type: string]: any };
    private about: { [type: string]: any };

    private blockName: { [type: string]: string };
    private blockTitle: { [type: string]: string };
    private blockDeprecation: { [type: string]: boolean };
    private blockAbout: { [type: string]: BlockAbout };
    private blockProperties: { [type: string]: BlockAbout };

    private readonly defaultAbout: BlockAbout;

    constructor() {
        this.types = [];
        this.list = [];
        this.factories = {};
        this.properties = {};
        this.icons = {};
        this.header = {};
        this.group = {};
        this.allowedChildren = {};
        this.about = {};
        this.blockName = {};
        this.blockTitle = {};
        this.blockAbout = {};
        this.blockProperties = {};
        this.blockDeprecation = {};
        this.defaultAbout = new BlockAbout({
            post: false,
            get: false,
            input: null,
            output: null,
            children: ChildrenType.None,
            control: ControlType.None,
            defaultEvent: false,
            deprecated: false,
        })

        for (const config of blocks) {
            this.registerBlock(config);
        }

        for (const config of modules) {
            this.registerModule(config);
        }

        for (const config of tools) {
            this.registerTool(config);
        }

        for (const key in this.about) {
            this.blockAbout[key] = new BlockAbout({
                post: false,
                get: false,
                input: null,
                output: null,
                children: ChildrenType.None,
                control: ControlType.None,
                defaultEvent: false
            }, this.about[key]);
        }

        this.update();
    }

    private registerBlock(setting: IBlockSetting): void {
        const type: BlockType = setting.type;
        this.factories[type] = setting.factory;
        this.properties[type] = setting.property;
        this.icons[type] = setting.icon;
        this.group[type] = setting.group;
        this.header[type] = setting.header;
        this.allowedChildren[type] = setting.allowedChildren;
        this.about[type] = setting.about;
        this.types.push(type);
    }

    private registerModule(setting: IBlockSetting): void {
        const type: BlockType = setting.type;
        this.factories[type] = setting.factory;
        this.properties[type] = setting.property;
        this.icons[type] = setting.icon;
        this.group[type] = setting.group;
        this.header[type] = setting.header;
        this.allowedChildren[type] = setting.allowedChildren;
        this.about[type] = setting.about;
    }

    private registerTool(setting: IBlockSetting): void {
        const type: BlockType = setting.type;
        this.factories[type] = setting.factory;
        this.properties[type] = setting.property;
        this.icons[type] = setting.icon;
        this.group[type] = setting.group;
        this.header[type] = setting.header;
        this.allowedChildren[type] = setting.allowedChildren;
        this.about[type] = setting.about;
    }

    public registerConfig(config: any): void {
        this.list = [];
        const types: BlockType[] = Object.keys(config) as BlockType[];
        for (const type of types) {
            const setting = config[type];
            this.blockName[type] = setting.label;
            this.blockTitle[type] = setting.title;
            this.blockAbout[type] = new BlockAbout(setting, this.about[type]);
            this.blockProperties[type] = setting.properties;
            this.blockDeprecation[type] = !!setting.deprecated;
        }
        this.update();
    }

    private update(): void {
        for (const type of this.types) {
            const name = this.blockName[type] || type;
            const search = (name + type).toLowerCase();
            this.list.push({
                type: type,
                name,
                search,
                icon: this.icons[type],
                group: this.group[type],
                header: this.header[type],
                title: this.blockTitle[type],
                data: `new:${type}`,
                deprecated: this.blockDeprecation[type],
            });
        }
        this.list = this.list.sort((a, b) => a.name > b.name ? 1 : -1);
    }

    public getAll(): any[] {
        return this.list;
    }

    public getBlockConfig(type: string): any {
        return {
            id: GenerateUUIDv4(),
            tag: '',
            blockType: type,
            defaultActive: !!this.factories[type],
            children: [],
            permissions: []
        };
    }

    public getFactory(blockType: string): any {
        return this.factories[blockType];
    }

    public getProperties(blockType: string): any {
        return this.properties[blockType];
    }

    public getCustomProperties(blockType: string): any {
        return this.blockProperties[blockType];
    }

    public bindAbout(
        block: PolicyItem,
        module: PolicyFolder
    ): IBlockAbout {
        if (this.blockAbout[block.blockType]) {
            return this.blockAbout[block.blockType].bind(block, module);
        } else {
            return this.defaultAbout.bind(block, module);
        }
    }

    public getAbout(
        block: PolicyItem,
        module: PolicyFolder
    ): IBlockAbout {
        if (this.blockAbout[block.blockType]) {
            return this.blockAbout[block.blockType].getAbout(block, module);
        } else {
            return this.defaultAbout.getAbout(block, module);
        }
    }

    public getIcon(blockType: string): string {
        return this.icons[blockType] || 'code';
    }

    public getHeader(blockType: string): string {
        return this.header[blockType] || '';
    }

    public getDeprecated(blockType: string): boolean {
        return this.blockDeprecation[blockType];
    }

    public getName(blockType: string): string {
        return this.blockName[blockType];
    }
 }

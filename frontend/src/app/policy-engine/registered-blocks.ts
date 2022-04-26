import { Injectable } from "@angular/core";
import { ActionConfigComponent } from "./policy-configuration/blocks/main/action-config/action-config.component";
import { AggregateConfigComponent } from "./policy-configuration/blocks/documents/aggregate-config/aggregate-config.component";
import { ContainerConfigComponent } from "./policy-configuration/blocks/main/container-config/container-config.component";
import { DocumentSourceComponent } from "./policy-configuration/blocks/documents/document-viewer-config/document-viewer-config.component";
import { ExternalDataConfigComponent } from "./policy-configuration/blocks/documents/external-data-config/external-data-config.component";
import { FiltersAddonConfigComponent } from "./policy-configuration/blocks/documents/filters-addon-config/filters-addon-config.component";
import { InformationConfigComponent } from "./policy-configuration/blocks/main/information-config/information-config.component";
import { MintConfigComponent } from "./policy-configuration/blocks/tokens/mint-config/mint-config.component";
import { RequestConfigComponent } from "./policy-configuration/blocks/documents/request-config/request-config.component";
import { RolesConfigComponent } from "./policy-configuration/blocks/main/roles-config/roles-config.component";
import { SendConfigComponent } from "./policy-configuration/blocks/documents/send-config/send-config.component";
import { SourceAddonConfigComponent } from "./policy-configuration/blocks/documents/source-addon-config/source-addon-config.component";
import { ActionBlockComponent } from "./policy-viewer/blocks/action-block/action-block.component";
import { ContainerBlockComponent } from "./policy-viewer/blocks/container-block/container-block.component";
import { DocumentsSourceBlockComponent } from "./policy-viewer/blocks/documents-source-block/documents-source-block.component";
import { FiltersAddonBlockComponent } from "./policy-viewer/blocks/filters-addon-block/filters-addon-block.component";
import { InformationBlockComponent } from "./policy-viewer/blocks/information-block/information-block.component";
import { RequestDocumentBlockComponent } from "./policy-viewer/blocks/request-document-block/request-document-block.component";
import { RolesBlockComponent } from "./policy-viewer/blocks/roles-block/roles-block.component";
import { StepBlockComponent } from "./policy-viewer/blocks/step-block/step-block.component";
import { CalculateConfigComponent } from './policy-configuration/blocks/calculate/calculate-config/calculate-config.component';
import { CalculateMathConfigComponent } from './policy-configuration/blocks/calculate/calculate-math-config/calculate-math-config.component';
import { BlockNode } from "./helpers/tree-data-source/tree-data-source";
import { ReportBlockComponent } from "./policy-viewer/blocks/report-block/report-block.component";
import { ReportItemConfigComponent } from "./policy-configuration/blocks/report/report-item-config/report-item-config.component";
import { PaginationAddonBlockComponent } from './policy-viewer/blocks/pagination-addon-block/pagination-addon-block.component';
import { ReassigningConfigComponent } from "./policy-configuration/blocks/documents/reassigning-config/reassigning-config.component";

export enum BlockType {
    Container = 'interfaceContainerBlock',
    DocumentsViewer = 'interfaceDocumentsSourceBlock',
    Information = 'informationBlock',
    PolicyRoles = 'policyRolesBlock',
    Request = 'requestVcDocumentBlock',
    SendToGuardian = 'sendToGuardianBlock',
    Action = 'interfaceActionBlock',
    Step = 'interfaceStepBlock',
    Mint = 'mintDocumentBlock',
    ExternalData = 'externalDataBlock',
    AggregateDocument = 'aggregateDocumentBlock',
    Wipe = 'retirementDocumentBlock',
    FiltersAddon = 'filtersAddon',
    DocumentsSourceAddon = 'documentsSourceAddon',
    Calculate = 'calculateContainerBlock',
    CalculateMathAddon = 'calculateMathAddon',
    Report = 'reportBlock',
    ReportItem = 'reportItemBlock',
    ReassigningBlock = 'reassigningBlock',
    PaginationAddon = 'paginationAddon',
}

export enum BlockGroup {
    Main = 'Main',
    Documents = 'Documents',
    Tokens = 'Tokens',
    Calculate = 'Calculate',
    Report = 'Report'
}

export interface IBlockAbout {
    post: boolean;
    get: boolean;
    input: InputType;
    output: InputType;
    children: ChildrenType;
    control: ControlType;
}

export interface IBlockAboutConfig {
    post: boolean | ((block: any) => boolean);
    get: boolean | ((block: any) => boolean);
    input: InputType | ((block: any) => InputType);
    output: InputType | ((block: any) => InputType);
    children: ChildrenType | ((block: any) => ChildrenType);
    control: ControlType | ((block: any) => ControlType);
}

export enum InputType {
    None = 'None',
    Single = 'Single',
    Multiple = 'Multiple',
    Any = 'Any',
}

export enum ChildrenType {
    None = 'None',
    Special = 'Special',
    Any = 'Any',
}

export enum ControlType {
    UI = 'UI',
    Special = 'Special',
    Server = 'Server',
    None = 'None',
}

export class BlockAbout {
    private _propFunc: any = {};
    private _propVal: any = {};
    private _setProp(about: any, name: string) {
        if (typeof about[name] == 'function') {
            this._propFunc[name] = about[name];
        } else {
            this._propVal[name] = about[name];
            this._propFunc[name] = (block: any) => {
                return this._propVal[name];
            };
        }
    }

    constructor(about: IBlockAboutConfig) {
        this._setProp(about, 'post');
        this._setProp(about, 'get');
        this._setProp(about, 'input');
        this._setProp(about, 'output');
        this._setProp(about, 'children');
        this._setProp(about, 'control');
    }

    public get(block: any): IBlockAbout {
        return {
            post: this._propFunc.post(block),
            get: this._propFunc.get(block),
            input: this._propFunc.input(block),
            output: this._propFunc.output(block),
            children: this._propFunc.children(block),
            control: this._propFunc.control(block),
        }
    }

    public bind(block: any): IBlockAbout {
        const bind = {
            _block: block,
            _post: this._propFunc.post,
            _get: this._propFunc.get,
            _input: this._propFunc.input,
            _output: this._propFunc.output,
            _children: this._propFunc.children,
            _control: this._propFunc.control,
            get post() {
                return this._post(this._block);
            },
            get get() {
                return this._get(this._block);
            },
            get input() {
                return this._input(this._block);
            },
            get output() {
                return this._output(this._block);
            },
            get children() {
                return this._children(this._block);
            },
            get control() {
                return this._control(this._block);
            }
        }
        return bind
    }
}

export interface IBlockSetting {
    type: BlockType;
    icon: string;
    name: string;
    title: string;
    group: BlockGroup;
    factory: any;
    property: any;
    about: IBlockAboutConfig;
}

@Injectable()
export class RegisteredBlocks {
    public readonly blocks: BlockType[];
    public readonly icons: any;
    public readonly names: any;
    public readonly titles: any;
    public readonly groups: any;
    public readonly factories: any;
    public readonly properties: any;
    public readonly about: any;

    private readonly defaultA = new BlockAbout({
        post: false,
        get: false,
        input: InputType.None,
        output: InputType.None,
        children: ChildrenType.None,
        control: ControlType.None,
    })

    constructor() {
        this.blocks = [];
        this.icons = {};
        this.names = {};
        this.titles = {};
        this.groups = {};
        this.factories = {};
        this.properties = {};
        this.about = {};

        this.addHeaderGroup(BlockGroup.Main, 'UI Components');
        this.addBlock({
            type: BlockType.Container,
            icon: 'tab',
            name: 'Container',
            title: `Add 'Container' Block`,
            group: BlockGroup.Main,
            factory: ContainerBlockComponent,
            property: ContainerConfigComponent,
            about: {
                post: false,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.Any,
                control: ControlType.UI,
            }
        });
        this.addBlock({
            type: BlockType.Step,
            icon: 'vertical_split',
            name: 'Step',
            title: `Add 'Step' Block`,
            group: BlockGroup.Main,
            factory: StepBlockComponent,
            property: ContainerConfigComponent,
            about: {
                post: false,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.Any,
                control: ControlType.UI,
            }
        });
        this.addBlock({
            type: BlockType.PolicyRoles,
            icon: 'manage_accounts',
            name: 'Roles',
            title: `Add 'Choice Of Roles' Block`,
            group: BlockGroup.Main,
            factory: RolesBlockComponent,
            property: RolesConfigComponent,
            about: {
                post: true,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.None,
                control: ControlType.UI,
            }
        });
        this.addBlock({
            type: BlockType.Information,
            icon: 'info',
            name: 'Information',
            title: `Add 'Information' Block`,
            group: BlockGroup.Main,
            factory: InformationBlockComponent,
            property: InformationConfigComponent,
            about: {
                post: false,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.None,
                control: ControlType.UI,
            }
        });
        this.addBlock({
            type: BlockType.Action,
            icon: 'flash_on',
            name: 'Action',
            title: `Add 'Action' Block`,
            group: BlockGroup.Main,
            factory: ActionBlockComponent,
            property: ActionConfigComponent,
            about: {
                post: true,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.Special,
                control: ControlType.UI,
            }
        });

        this.addHeaderGroup(BlockGroup.Documents, 'UI Components');
        this.addBlock({
            type: BlockType.DocumentsViewer,
            icon: 'table_view',
            name: 'Documents',
            title: `Add 'Documents Source' Block`,
            group: BlockGroup.Documents,
            factory: DocumentsSourceBlockComponent,
            property: DocumentSourceComponent,
            about: {
                post: false,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.Special,
                control: ControlType.UI,
            }
        });
        this.addBlock({
            type: BlockType.Request,
            icon: 'dynamic_form',
            name: 'Request',
            title: `Add 'Request' Block`,
            group: BlockGroup.Documents,
            factory: RequestDocumentBlockComponent,
            property: RequestConfigComponent,
            about: {
                post: true,
                get: true,
                input: InputType.None,
                output: InputType.Single,
                children: ChildrenType.Special,
                control: ControlType.UI,
            }
        });
        this.addHeaderGroup(BlockGroup.Documents, 'Server Blocks');
        this.addBlock({
            type: BlockType.SendToGuardian,
            icon: 'send',
            name: 'Send',
            title: `Add 'Send' Block`,
            group: BlockGroup.Documents,
            factory: null,
            property: SendConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.Single,
                output: InputType.Single,
                children: ChildrenType.None,
                control: ControlType.Server,
            }
        });
        this.addBlock({
            type: BlockType.ExternalData,
            icon: 'cloud',
            name: 'External Data',
            title: `Add 'External Data' Block`,
            group: BlockGroup.Documents,
            factory: null,
            property: ExternalDataConfigComponent,
            about: {
                post: true,
                get: false,
                input: InputType.Single,
                output: InputType.Single,
                children: ChildrenType.None,
                control: ControlType.Server,
            }
        });
        this.addBlock({
            type: BlockType.AggregateDocument,
            icon: 'calendar_month',
            name: 'Aggregate Data',
            title: `Add 'Aggregate' Block`,
            group: BlockGroup.Documents,
            factory: null,
            property: AggregateConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.Single,
                output: InputType.Multiple,
                children: ChildrenType.None,
                control: ControlType.Server,
            }
        });
        this.addBlock({
            type: BlockType.ReassigningBlock,
            icon: 'content_copy',
            name: 'Reassigning',
            title: `Add 'Reassigning' Block`,
            group: BlockGroup.Documents,
            factory: null,
            property: ReassigningConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.Single,
                output: InputType.Single,
                children: ChildrenType.None,
                control: ControlType.Server,
            }
        });
        this.addHeaderGroup(BlockGroup.Documents, 'Addons');
        this.addBlock({
            type: BlockType.FiltersAddon,
            icon: 'filter_alt',
            name: 'Filters Addon',
            title: `Add 'Filters' Addon`,
            group: BlockGroup.Documents,
            factory: FiltersAddonBlockComponent,
            property: FiltersAddonConfigComponent,
            about: {
                post: true,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.Special,
                control: ControlType.Special,
            }
        });
        this.addBlock({
            type: BlockType.DocumentsSourceAddon,
            icon: 'source',
            name: 'Source',
            title: `Add 'DocumentsSourceAddon' Addon`,
            group: BlockGroup.Documents,
            factory: null,
            property: SourceAddonConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.Special,
                control: ControlType.Special,
            }
        });
        this.addBlock({
            type: BlockType.PaginationAddon,
            icon: 'pages',
            name: 'Pagination',
            title: `Add 'Pagination' Addon`,
            group: BlockGroup.Documents,
            factory: PaginationAddonBlockComponent,
            property: null,
            about: {
                post: true,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.None,
                control: ControlType.Special,
            }
        });


        this.addHeaderGroup(BlockGroup.Tokens, 'Server Blocks');
        this.addBlock({
            type: BlockType.Mint,
            icon: 'paid',
            name: 'Mint',
            title: `Add 'Mint' Block`,
            group: BlockGroup.Tokens,
            factory: null,
            property: MintConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.Any,
                output: InputType.Any,
                children: ChildrenType.None,
                control: ControlType.Server,
            }
        });
        this.addBlock({
            type: BlockType.Wipe,
            icon: 'delete',
            name: 'Wipe',
            title: `Add 'Wipe' Block`,
            group: BlockGroup.Tokens,
            factory: null,
            property: MintConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.Any,
                output: InputType.Any,
                children: ChildrenType.None,
                control: ControlType.Server,
            }
        });


        this.addHeaderGroup(BlockGroup.Calculate, 'Server Blocks');
        this.addBlock({
            type: BlockType.Calculate,
            icon: 'bar_chart',
            name: 'Calculate',
            title: `Add 'Calculate' Block`,
            group: BlockGroup.Calculate,
            factory: null,
            property: CalculateConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.Any,
                output: function (block: any) {
                    return block.inputDocuments == "separate" ?
                        InputType.Multiple : InputType.Single;
                },
                children: ChildrenType.Special,
                control: ControlType.Server,
            }
        });
        this.addHeaderGroup(BlockGroup.Calculate, 'Addons');
        this.addBlock({
            type: BlockType.CalculateMathAddon,
            icon: 'calculate',
            name: 'Math Addon',
            title: `Add 'Math' Addon`,
            group: BlockGroup.Calculate,
            factory: null,
            property: CalculateMathConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.Single,
                output: InputType.Single,
                children: ChildrenType.None,
                control: ControlType.Special,
            }
        });

        this.addHeaderGroup(BlockGroup.Report, 'UI Components');
        this.addBlock({
            type: BlockType.Report,
            icon: 'addchart',
            name: 'Report',
            title: `Add 'Report' Block`,
            group: BlockGroup.Report,
            factory: ReportBlockComponent,
            property: null,
            about: {
                post: true,
                get: true,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.Special,
                control: ControlType.UI,
            }
        });
        this.addHeaderGroup(BlockGroup.Report, 'Addons');
        this.addBlock({
            type: BlockType.ReportItem,
            icon: 'list_alt',
            name: 'Report Item',
            title: `Add 'Report Item' Block`,
            group: BlockGroup.Report,
            factory: null,
            property: ReportItemConfigComponent,
            about: {
                post: false,
                get: false,
                input: InputType.None,
                output: InputType.None,
                children: ChildrenType.None,
                control: ControlType.Special,
            }
        });
    }

    public addBlock(setting: IBlockSetting) {
        this.register(setting.type, setting.icon, setting.name, setting.title);
        if (setting.group) {
            this.registerGroup(setting.group, setting.type);
        }

        if (setting.factory) {
            this.registerFactory(setting.type, setting.factory);
        }

        if (setting.property) {
            this.registerProperties(setting.type, setting.property);
        }

        if (setting.about) {
            this.registerAbout(setting.type, setting.about);
        }
    }

    public register(type: BlockType, icon: string, name: string, title: string) {
        this.blocks.push(type);
        this.icons[type] = icon;
        this.names[type] = name;
        this.titles[type] = title;
    }

    public getIcon(blockType: string): string {
        return this.icons[blockType] || 'code';
    }

    public getName(blockType: string): string {
        return this.names[blockType] || '';
    }

    public getTitle(blockType: string): string {
        return this.titles[blockType] || '';
    }

    public registerGroup(group: BlockGroup, type: BlockType) {
        if (!this.groups[group]) {
            this.groups[group] = [];
        }
        this.groups[group].push({
            type: type,
            icon: this.getIcon(type),
            name: this.getName(type),
            title: this.getTitle(type)
        });
    }

    public addHeaderGroup(group: BlockGroup, header: string) {
        if (!this.groups[group]) {
            this.groups[group] = [];
        }
        this.groups[group].push({
            type: null,
            name: header
        });
    }

    public registerFactory(type: BlockType, factory: any) {
        this.factories[type] = factory;
    }

    public getFactory(blockType: string): any {
        return this.factories[blockType];
    }

    public registerProperties(type: BlockType, factory: any) {
        this.properties[type] = factory;
    }

    public getProperties(blockType: string): any {
        return this.properties[blockType];
    }


    public registerAbout(type: BlockType, about: IBlockAboutConfig) {
        this.about[type] = new BlockAbout(about);
    }

    public getAbout(blockType: string, block: any): IBlockAbout {
        const f: BlockAbout = this.about[blockType] || this.defaultA;
        return f.get(block);
    }

    public bindAbout(blockType: string, block: any): IBlockAbout {
        const f: BlockAbout = this.about[blockType] || this.defaultA;
        return f.bind(block);
    }

    public newBlock(type: BlockType, permissions: any, index: any): BlockNode {
        return {
            id: this.generateUUIDv4(),
            tag: `Block_${index}`,
            blockType: type,
            defaultActive: !!this.factories[type],
            children: [],
            permissions: permissions
        };
    }

    public generateUUIDv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

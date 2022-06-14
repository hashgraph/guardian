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
import { TimerConfigComponent } from "./policy-configuration/blocks/documents/timer-config/timer-config.component";
import { CustomLogicConfigComponent } from './policy-configuration/blocks/calculate/custom-logic-config/custom-logic-config.component';
import { SwitchConfigComponent } from "./policy-configuration/blocks/main/switch-config/switch-config.component";
import { PolicyBlockModel } from "./policy-model";
import { RevokeConfigComponent } from "./policy-configuration/blocks/documents/revoke-config/revoke-config.component";
import { ButtonConfigComponent } from "./policy-configuration/blocks/main/button-config/button-config.component";
import { ButtonBlockComponent } from "./policy-viewer/blocks/button-block/button-block.component";

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
    TimerBlock = 'timerBlock',
    CustomLogicBlock = 'customLogicBlock',
    Switch = 'switchBlock',
    RevokeBlock = 'revokeBlock',
    SetRelationshipsBlock = 'setRelationshipsBlock',
    ButtonBlock = 'buttonBlock'
}

export enum BlockGroup {
    Main = 'Main',
    Documents = 'Documents',
    Tokens = 'Tokens',
    Calculate = 'Calculate',
    Report = 'Report',
    UnGrouped = 'UnGrouped'
}

export enum BlockHeaders {
    UIComponents = 'UI Components',
    ServerBlocks = 'Server Blocks',
    Addons = 'Addons'
}

export interface IBlockAbout {
    post: boolean;
    get: boolean;
    input: any;
    output: any;
    children: ChildrenType;
    control: ControlType;
    defaultEvent: boolean;
    prev?: IBlockAbout;
    next?: boolean;
}

type ConfigFunction<T> = ((value: any, block: PolicyBlockModel, prev?: IBlockAbout, next?: boolean) => T) | T;

export interface IBlockAboutConfig {
    post: boolean;
    get: boolean;
    input: any;
    output: any;
    children: ChildrenType;
    control: ControlType;
    defaultEvent: boolean;
}

export interface IBlockDynamicAboutConfig {
    post?: ConfigFunction<boolean>;
    get?: ConfigFunction<boolean>;
    input?: ConfigFunction<any>;
    output?: ConfigFunction<any>;
    children?: ConfigFunction<ChildrenType>;
    control?: ConfigFunction<ControlType>;
    defaultEvent?: ConfigFunction<boolean>;
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
    private _propFunc: { [x: string]: Function } = {};
    private _propVal: { [x: string]: any } = {};
    private _setProp(about: any, dynamic: any, name: string) {
        this._propVal[name] = about[name];
        if (dynamic && dynamic[name]) {
            this._propFunc[name] = dynamic[name];
        } else {
            this._propFunc[name] = (value: any, block: any, prev?: IBlockAbout, next?: boolean) => {
                return this._propVal[name];
            };
        }
    }

    constructor(about: IBlockAboutConfig, dynamic?: IBlockDynamicAboutConfig) {
        this._setProp(about, dynamic, 'post');
        this._setProp(about, dynamic, 'get');
        this._setProp(about, dynamic, 'input');
        this._setProp(about, dynamic, 'output');
        this._setProp(about, dynamic, 'children');
        this._setProp(about, dynamic, 'control');
        this._setProp(about, dynamic, 'defaultEvent');
    }

    public get(block: PolicyBlockModel): IBlockAbout {
        return {
            post: this._propFunc.post(this._propVal.post, block),
            get: this._propFunc.get(this._propVal.get, block),
            input: this._propFunc.input(this._propVal.input, block),
            output: this._propFunc.output(this._propVal.output, block),
            children: this._propFunc.children(this._propVal.children, block),
            control: this._propFunc.control(this._propVal.control, block),
            defaultEvent: this._propFunc.defaultEvent(this._propVal.defaultEvent, block),
        }
    }

    public bind(block: PolicyBlockModel, prev?: IBlockAbout, next?: boolean): IBlockAbout {
        const bind = {
            _block: block,
            _prev: prev,
            _next: next,
            _func: this._propFunc,
            _val: this._propVal,
            get post() {
                return this._func.post(this._val.post, this._block, this._prev, this._next);
            },
            get get() {
                return this._func.get(this._val.get, this._block, this._prev, this._next);
            },
            get input() {
                return this._func.input(this._val.input, this._block, this._prev, this._next);
            },
            get output() {
                return this._func.output(this._val.output, this._block, this._prev, this._next);
            },
            get children() {
                return this._func.children(this._val.children, this._block, this._prev, this._next);
            },
            get control() {
                return this._func.control(this._val.control, this._block, this._prev, this._next);
            },
            get defaultEvent() {
                return this._func.defaultEvent(this._val.defaultEvent, this._block, this._prev, this._next);
            },
            set prev(value: IBlockAbout) {
                this._prev = value;
            },
            set next(value: boolean) {
                this._next = value;
            }
        }
        return bind
    }
}

export interface IBlockSetting {
    type: BlockType;
    icon: string;
    group: BlockGroup;
    header: BlockHeaders;
    factory: any;
    property: any;
    allowedChildren?: ChildrenDisplaySettings[];
    about?: IBlockDynamicAboutConfig
}

export interface ChildrenDisplaySettings {
    type: BlockType,
    group?: BlockGroup,
    header?: BlockHeaders
}

@Injectable()
export class RegisteredBlocks {
    private group: any;
    private header: any;
    private icons: any;
    private names: any;
    private titles: any;
    private factories: any;
    private properties: any;
    private about: any;
    private allowedChildren: any;
    private dynamicAbout: any;

    private readonly defaultA = new BlockAbout({
        post: false,
        get: false,
        input: null,
        output: null,
        children: ChildrenType.None,
        control: ControlType.None,
        defaultEvent: false
    })

    constructor() {
        this.group = {};
        this.header = {};
        this.icons = {};
        this.names = {};
        this.titles = {};
        this.factories = {};
        this.properties = {};
        this.about = {};
        this.allowedChildren = {};
        this.dynamicAbout = {};

        const allowedChildrenStepContainerBlocks = [
            { type: BlockType.Information },
            { type: BlockType.PolicyRoles },
            { type: BlockType.Action },
            { type: BlockType.Container },
            { type: BlockType.Step },
            { type: BlockType.Switch },
            { type: BlockType.DocumentsViewer },
            { type: BlockType.Request },
            { type: BlockType.SendToGuardian },
            { type: BlockType.ExternalData },
            { type: BlockType.AggregateDocument },
            { type: BlockType.ReassigningBlock },
            { type: BlockType.TimerBlock },
            { type: BlockType.Mint },
            { type: BlockType.Wipe },
            { type: BlockType.Calculate },
            { type: BlockType.CustomLogicBlock },
            { type: BlockType.Report },
            { type: BlockType.RevokeBlock },
            { type: BlockType.SetRelationshipsBlock },
            { type: BlockType.ButtonBlock }
        ];

        // Main, UI Components
        this.registerBlock({
            type: BlockType.Container,
            icon: 'tab',
            group: BlockGroup.Main,
            header: BlockHeaders.UIComponents,
            factory: ContainerBlockComponent,
            property: ContainerConfigComponent,
            allowedChildren: allowedChildrenStepContainerBlocks
        });
        this.registerBlock({
            type: BlockType.Step,
            icon: 'vertical_split',
            group: BlockGroup.Main,
            header: BlockHeaders.UIComponents,
            factory: StepBlockComponent,
            property: ContainerConfigComponent,
            allowedChildren: allowedChildrenStepContainerBlocks
        });
        this.registerBlock({
            type: BlockType.PolicyRoles,
            icon: 'manage_accounts',
            group: BlockGroup.Main,
            header: BlockHeaders.UIComponents,
            factory: RolesBlockComponent,
            property: RolesConfigComponent
        });
        this.registerBlock({
            type: BlockType.Information,
            icon: 'info',
            group: BlockGroup.Main,
            header: BlockHeaders.UIComponents,
            factory: InformationBlockComponent,
            property: InformationConfigComponent,
        });
        this.registerBlock({
            type: BlockType.Action,
            icon: 'flash_on',
            group: BlockGroup.Main,
            header: BlockHeaders.UIComponents,
            factory: ActionBlockComponent,
            property: ActionConfigComponent,
            allowedChildren: [{
                type: BlockType.DocumentsSourceAddon,
                group: BlockGroup.UnGrouped
            }],
            about: {
                output: (value: any, block: PolicyBlockModel, prev?: IBlockAbout, next?: boolean) => {
                    const result = value ? value.slice() : [];
                    if (block.properties.type == 'selector') {
                        if (block.properties.uiMetaData?.options) {
                            for (const c of block.properties.uiMetaData.options) {
                                if (c.tag) {
                                    result.push(c.tag);
                                }

                            }
                        }
                    }
                    if (block.properties.type == 'dropdown') {
                        result.push("DropdownEvent");
                    }
                    return result;
                }
            }
        });

        this.registerBlock({
            type: BlockType.ButtonBlock,
            icon: 'radio_button_checked',
            group: BlockGroup.Main,
            header: BlockHeaders.UIComponents,
            factory: ButtonBlockComponent,
            property: ButtonConfigComponent,
            about: {
                output: (value: any, block: PolicyBlockModel, prev?: IBlockAbout, next?: boolean) => {
                    const result = value ? value.slice() : [];
                    if (block.properties.uiMetaData?.buttons) {
                        for (const c of block.properties.uiMetaData.buttons) {
                            if (c.tag) {
                                result.push(c.tag);
                            }

                        }
                    }
                    return result;
                }
            }
        });

        // Main, Server Blocks
        this.registerBlock({
            type: BlockType.Switch,
            icon: 'rule',
            group: BlockGroup.Main,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: SwitchConfigComponent,
            about: {
                output: (value: any, block: PolicyBlockModel, prev?: IBlockAbout, next?: boolean) => {
                    const result = value ? value.slice() : [];
                    if (block.properties.conditions) {
                        for (const c of block.properties.conditions) {
                            if (c.tag) {
                                result.push(c.tag);
                            }
                        }
                    }
                    return result;
                }
            }
        });

        // Documents, UI Components
        this.registerBlock({
            type: BlockType.DocumentsViewer,
            icon: 'table_view',
            group: BlockGroup.Documents,
            header: BlockHeaders.UIComponents,
            factory: DocumentsSourceBlockComponent,
            property: DocumentSourceComponent,
            allowedChildren: [{
                type: BlockType.FiltersAddon,
                group: BlockGroup.UnGrouped
            },{
                type: BlockType.DocumentsSourceAddon,
                group: BlockGroup.UnGrouped
            }, {
                type: BlockType.PaginationAddon,
                group: BlockGroup.UnGrouped
            }]
        });
        this.registerBlock({
            type: BlockType.Request,
            icon: 'dynamic_form',
            group: BlockGroup.Documents,
            header: BlockHeaders.UIComponents,
            factory: RequestDocumentBlockComponent,
            property: RequestConfigComponent,
            allowedChildren: [{
                type: BlockType.DocumentsSourceAddon,
                group: BlockGroup.UnGrouped
            }]
        });
        this.registerBlock({
            type: BlockType.RevokeBlock,
            icon: 'restart_alt',
            group: BlockGroup.Documents,
            header: BlockHeaders.UIComponents,
            factory: null,
            property: RevokeConfigComponent,
        });

        // Documents, Server Blocks
        this.registerBlock({
            type: BlockType.SendToGuardian,
            icon: 'send',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: SendConfigComponent,
        });
        this.registerBlock({
            type: BlockType.ExternalData,
            icon: 'cloud',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: ExternalDataConfigComponent,
        });
        this.registerBlock({
            type: BlockType.AggregateDocument,
            icon: 'calendar_month',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: AggregateConfigComponent,
        });
        this.registerBlock({
            type: BlockType.ReassigningBlock,
            icon: 'content_copy',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: ReassigningConfigComponent,
        });
        this.registerBlock({
            type: BlockType.SetRelationshipsBlock,
            icon: 'settings',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: null,
            allowedChildren: [
                {
                    type: BlockType.DocumentsSourceAddon,
                    group: BlockGroup.UnGrouped
                }
            ]
        });

        // Documents, Addons
        this.registerBlock({
            type: BlockType.FiltersAddon,
            icon: 'filter_alt',
            group: BlockGroup.Documents,
            header: BlockHeaders.Addons,
            factory: FiltersAddonBlockComponent,
            property: FiltersAddonConfigComponent,
            allowedChildren: [{
                type: BlockType.DocumentsSourceAddon,
                group: BlockGroup.UnGrouped
            }]
        });
        this.registerBlock({
            type: BlockType.DocumentsSourceAddon,
            icon: 'source',
            group: BlockGroup.Documents,
            header: BlockHeaders.Addons,
            factory: null,
            property: SourceAddonConfigComponent,
            allowedChildren: [{
                type: BlockType.FiltersAddon,
                group: BlockGroup.UnGrouped
            }]
        });
        this.registerBlock({
            type: BlockType.PaginationAddon,
            icon: 'pages',
            group: BlockGroup.Documents,
            header: BlockHeaders.Addons,
            factory: PaginationAddonBlockComponent,
            property: null,
        });
        this.registerBlock({
            type: BlockType.TimerBlock,
            icon: 'schedule',
            group: BlockGroup.Documents,
            header: BlockHeaders.Addons,
            factory: null,
            property: TimerConfigComponent,
        });

        // Tokens, Server Blocks
        this.registerBlock({
            type: BlockType.Mint,
            icon: 'paid',
            group: BlockGroup.Tokens,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: MintConfigComponent,
        });
        this.registerBlock({
            type: BlockType.Wipe,
            icon: 'delete',
            group: BlockGroup.Tokens,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: MintConfigComponent,
        });

        // Calculate, Server Blocks
        this.registerBlock({
            type: BlockType.Calculate,
            icon: 'bar_chart',
            group: BlockGroup.Calculate,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: CalculateConfigComponent,
            allowedChildren: [{
                type: BlockType.CalculateMathAddon,
                group: BlockGroup.UnGrouped,
            }]
        });
        this.registerBlock({
            type: BlockType.CustomLogicBlock,
            icon: 'bar_chart',
            group: BlockGroup.Calculate,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: CustomLogicConfigComponent,
        });

        // Calculate, Addons
        this.registerBlock({
            type: BlockType.CalculateMathAddon,
            icon: 'calculate',
            group: BlockGroup.Calculate,
            header: BlockHeaders.Addons,
            factory: null,
            property: CalculateMathConfigComponent,
        });

        // Report, UIComponents
        this.registerBlock({
            type: BlockType.Report,
            icon: 'addchart',
            group: BlockGroup.Report,
            header: BlockHeaders.UIComponents,
            factory: ReportBlockComponent,
            property: null,
            allowedChildren: [{
                type: BlockType.ReportItem,
                group: BlockGroup.UnGrouped
            }]
        });

        // Report, Addons
        this.registerBlock({
            type: BlockType.ReportItem,
            icon: 'list_alt',
            group: BlockGroup.Report,
            header: BlockHeaders.Addons,
            factory: null,
            property: ReportItemConfigComponent
        });
    }

    public registerBlock(setting: IBlockSetting) {
        const type: BlockType = setting.type;
        this.icons[type] = setting.icon;
        this.group[type] = setting.group;
        this.header[type] = setting.header;
        this.allowedChildren[type] = setting.allowedChildren;
        this.factories[type] = setting.factory;
        this.properties[type] = setting.property;
        this.dynamicAbout[type] = setting.about;
    }

    public registerConfig(config: any) {
        this.clear();
        const types: BlockType[] = Object.keys(config) as BlockType[];
        for (let type of types) {
            const setting = config[type];
            this.names[type] = setting.label;
            this.titles[type] = setting.title;
            this.about[type] = new BlockAbout({
                post: setting.post,
                get: setting.get,
                input: setting.input,
                output: setting.output,
                children: setting.children,
                control: setting.control,
                defaultEvent: setting.defaultEvent
            }, this.dynamicAbout[type]);
        }
    }

    private clear() {
        this.names = {};
        this.titles = {};
        this.about = {};
    }

    public getHeader(blockType: string): string {
        return this.header[blockType] || '';
    }

    public getGroup(blockType: string): string {
        return this.group[blockType] || '';
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

    public getAllowedChildren(blockType: string): {
        type: string,
        header?: string
        group?: string
    }[] {
        return this.allowedChildren[blockType] || [];
    }

    public getFactory(blockType: string): any {
        return this.factories[blockType];
    }

    public getProperties(blockType: string): any {
        return this.properties[blockType];
    }

    public getAbout(blockType: string, block: any): IBlockAbout {
        const f: BlockAbout = this.about[blockType] || this.defaultA;
        return f.get(block);
    }

    public bindAbout(blockType: string, block: any, prev?: IBlockAbout, next?: boolean): IBlockAbout {
        const f: BlockAbout = this.about[blockType] || this.defaultA;
        return f.bind(block, prev, next);
    }

    public newBlock(type: BlockType): BlockNode {
        return {
            id: this.generateUUIDv4(),
            tag: '',
            blockType: type,
            defaultActive: !!this.factories[type],
            children: [],
            permissions: []
        };
    }

    public generateUUIDv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

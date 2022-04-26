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
import {
    PaginationAddonBlockComponent
} from './policy-viewer/blocks/pagination-addon-block/pagination-addon-block.component';
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

        this.register(BlockType.Container, 'tab', 'Container', `Add 'Container' Block`);
        this.register(BlockType.Step, 'vertical_split', 'Step', `Add 'Step' Block`);
        this.register(BlockType.PolicyRoles, 'manage_accounts', 'Roles', `Add 'Choice Of Roles' Block`);
        this.register(BlockType.Information, 'info', 'Information', `Add 'Information' Block`);
        this.register(BlockType.Action, 'flash_on', 'Action', `Add 'Action' Block`);
        this.register(BlockType.DocumentsViewer, 'table_view', 'Documents', `Add 'Documents Source' Block`);
        this.register(BlockType.Request, 'dynamic_form', 'Request', `Add 'Request' Block`);
        this.register(BlockType.SendToGuardian, 'send', 'Send', `Add 'Send' Block`);
        this.register(BlockType.ExternalData, 'cloud', 'External Data', `Add 'External Data' Block`);
        this.register(BlockType.AggregateDocument, 'merge_type', 'Aggregate Data', `Add 'Aggregate' Block`);
        this.register(BlockType.FiltersAddon, 'filter_alt', 'Filters Addon', `Add 'Filters' Block`);
        this.register(BlockType.Mint, 'paid', 'Mint', `Add 'Mint' Block`);
        this.register(BlockType.Wipe, 'delete', 'Wipe', `Add 'Wipe' Block`);
        this.register(BlockType.DocumentsSourceAddon, 'source', 'Source', `Add 'DocumentsSourceAddon' Block`);
        this.register(BlockType.Calculate, 'bar_chart', 'Calculate', `Add 'Calculate' Addon`);
        this.register(BlockType.CalculateMathAddon, 'calculate', 'Math Addon', `Add 'Math' Addon`);
        this.register(BlockType.Report, 'addchart', 'Report', `Add 'Report' Block`);
        this.register(BlockType.ReportItem, 'list_alt', 'Report Item', `Add 'Report Item' Block`);
        this.register(BlockType.ReassigningBlock, 'content_copy', 'Reassigning', `Add 'Reassigning' Block`);
        this.register(BlockType.PaginationAddon, 'filter_alt', 'Pagination', `Add 'Pagination' Addon`);

        this.registerGroup(BlockGroup.Main, BlockType.Container);
        this.registerGroup(BlockGroup.Main, BlockType.Step);
        this.registerGroup(BlockGroup.Main, BlockType.PolicyRoles);
        this.registerGroup(BlockGroup.Main, BlockType.Information);
        this.registerGroup(BlockGroup.Main, BlockType.Action);
        this.registerGroup(BlockGroup.Documents, BlockType.DocumentsViewer);
        this.registerGroup(BlockGroup.Documents, BlockType.Request);
        this.registerGroup(BlockGroup.Documents, BlockType.SendToGuardian);
        this.registerGroup(BlockGroup.Documents, BlockType.ExternalData);
        this.registerGroup(BlockGroup.Documents, BlockType.AggregateDocument);
        this.registerGroup(BlockGroup.Documents, BlockType.FiltersAddon);
        this.registerGroup(BlockGroup.Documents, BlockType.DocumentsSourceAddon);
        this.registerGroup(BlockGroup.Documents, BlockType.ReassigningBlock);
        this.registerGroup(BlockGroup.Documents, BlockType.PaginationAddon);
        this.registerGroup(BlockGroup.Tokens, BlockType.Mint);
        this.registerGroup(BlockGroup.Tokens, BlockType.Wipe);
        this.registerGroup(BlockGroup.Calculate, BlockType.Calculate);
        this.registerGroup(BlockGroup.Calculate, BlockType.CalculateMathAddon);
        this.registerGroup(BlockGroup.Report, BlockType.Report);
        this.registerGroup(BlockGroup.Report, BlockType.ReportItem);

        this.registerFactory(BlockType.Container, ContainerBlockComponent);
        this.registerFactory(BlockType.DocumentsViewer, DocumentsSourceBlockComponent);
        this.registerFactory(BlockType.Request, RequestDocumentBlockComponent);
        this.registerFactory(BlockType.Action, ActionBlockComponent);
        this.registerFactory(BlockType.Step, StepBlockComponent);
        this.registerFactory(BlockType.Information, InformationBlockComponent);
        this.registerFactory(BlockType.PolicyRoles, RolesBlockComponent);
        this.registerFactory(BlockType.FiltersAddon, FiltersAddonBlockComponent);
        this.registerFactory(BlockType.PaginationAddon, PaginationAddonBlockComponent);
        this.registerFactory(BlockType.Report, ReportBlockComponent);

        this.registerProperties(BlockType.DocumentsViewer, DocumentSourceComponent);
        this.registerProperties(BlockType.Action, ActionConfigComponent);
        this.registerProperties(BlockType.Container, ContainerConfigComponent);
        this.registerProperties(BlockType.Request, RequestConfigComponent);
        this.registerProperties(BlockType.Step, ContainerConfigComponent);
        this.registerProperties(BlockType.Mint, MintConfigComponent);
        this.registerProperties(BlockType.SendToGuardian, SendConfigComponent);
        this.registerProperties(BlockType.ExternalData, ExternalDataConfigComponent);
        this.registerProperties(BlockType.AggregateDocument, AggregateConfigComponent);
        this.registerProperties(BlockType.Wipe, MintConfigComponent);
        this.registerProperties(BlockType.Information, InformationConfigComponent);
        this.registerProperties(BlockType.PolicyRoles, RolesConfigComponent);
        this.registerProperties(BlockType.FiltersAddon, FiltersAddonConfigComponent);
        this.registerProperties(BlockType.DocumentsSourceAddon, SourceAddonConfigComponent);
        this.registerProperties(BlockType.ReportItem, ReportItemConfigComponent);
        this.registerProperties(BlockType.Calculate, CalculateConfigComponent);
        this.registerProperties(BlockType.CalculateMathAddon, CalculateMathConfigComponent);
        this.registerProperties(BlockType.ReassigningBlock, ReassigningConfigComponent);

        this.registerAbout(BlockType.AggregateDocument, {
            post: false,
            get: false,
            input: InputType.Single,
            output: InputType.Multiple,
            children: ChildrenType.None,
            control: ControlType.Server,
        });
        this.registerAbout(BlockType.Calculate, {
            post: false,
            get: false,
            input: InputType.Any,
            output: function (block: any) {
                return block.inputDocuments == "separate" ?
                    InputType.Multiple : InputType.Single;
            },
            children: ChildrenType.Special,
            control: ControlType.Server,
        });
        this.registerAbout(BlockType.CalculateMathAddon, {
            post: false,
            get: false,
            input: InputType.Single,
            output: InputType.Single,
            children: ChildrenType.None,
            control: ControlType.Special,
        });
        this.registerAbout(BlockType.DocumentsSourceAddon, {
            post: false,
            get: false,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.Special,
            control: ControlType.Special,
        });
        this.registerAbout(BlockType.ExternalData, {
            post: true,
            get: false,
            input: InputType.Single,
            output: InputType.Single,
            children: ChildrenType.None,
            control: ControlType.Server,
        });
        this.registerAbout(BlockType.FiltersAddon, {
            post: true,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.Special,
            control: ControlType.Special,
        });
        this.registerAbout(BlockType.Information, {
            post: false,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.None,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.Action, {
            post: true,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.Special,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.DocumentsViewer, {
            post: false,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.Special,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.Step, {
            post: false,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.Any,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.Mint, {
            post: false,
            get: false,
            input: InputType.Any,
            output: InputType.Any,
            children: ChildrenType.None,
            control: ControlType.Server,
        });
        this.registerAbout(BlockType.Wipe, {
            post: false,
            get: false,
            input: InputType.Any,
            output: InputType.Any,
            children: ChildrenType.None,
            control: ControlType.Server,
        });
        this.registerAbout(BlockType.PaginationAddon, {
            post: true,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.None,
            control: ControlType.Special,
        });
        this.registerAbout(BlockType.PolicyRoles, {
            post: true,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.None,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.ReassigningBlock, {
            post: false,
            get: false,
            input: InputType.Single,
            output: InputType.Single,
            children: ChildrenType.None,
            control: ControlType.Server,
        });
        this.registerAbout(BlockType.Report, {
            post: true,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.Special,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.ReportItem, {
            post: false,
            get: false,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.None,
            control: ControlType.Special,
        });
        this.registerAbout(BlockType.Request, {
            post: true,
            get: true,
            input: InputType.None,
            output: InputType.Single,
            children: ChildrenType.Special,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.Container, {
            post: false,
            get: true,
            input: InputType.None,
            output: InputType.None,
            children: ChildrenType.Any,
            control: ControlType.UI,
        });
        this.registerAbout(BlockType.SendToGuardian, {
            post: false,
            get: false,
            input: InputType.Single,
            output: InputType.Single,
            children: ChildrenType.None,
            control: ControlType.Server,
        });
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

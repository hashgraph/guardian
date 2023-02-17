import { Injectable } from '@angular/core';
import { ActionConfigComponent } from './policy-configuration/blocks/main/action-config/action-config.component';
import {
    AggregateConfigComponent
} from './policy-configuration/blocks/documents/aggregate-config/aggregate-config.component';
import {
    ContainerConfigComponent
} from './policy-configuration/blocks/main/container-config/container-config.component';
import {
    DocumentSourceComponent
} from './policy-configuration/blocks/documents/document-viewer-config/document-viewer-config.component';
import {
    ExternalDataConfigComponent
} from './policy-configuration/blocks/documents/external-data-config/external-data-config.component';
import {
    FiltersAddonConfigComponent
} from './policy-configuration/blocks/documents/filters-addon-config/filters-addon-config.component';
import {
    InformationConfigComponent
} from './policy-configuration/blocks/main/information-config/information-config.component';
import { MintConfigComponent } from './policy-configuration/blocks/tokens/mint-config/mint-config.component';
import {
    RequestConfigComponent
} from './policy-configuration/blocks/documents/request-config/request-config.component';
import { RolesConfigComponent } from './policy-configuration/blocks/main/roles-config/roles-config.component';
import { SendConfigComponent } from './policy-configuration/blocks/documents/send-config/send-config.component';
import {
    SourceAddonConfigComponent
} from './policy-configuration/blocks/documents/source-addon-config/source-addon-config.component';
import { ActionBlockComponent } from './policy-viewer/blocks/action-block/action-block.component';
import { ContainerBlockComponent } from './policy-viewer/blocks/container-block/container-block.component';
import {
    DocumentsSourceBlockComponent
} from './policy-viewer/blocks/documents-source-block/documents-source-block.component';
import { FiltersAddonBlockComponent } from './policy-viewer/blocks/filters-addon-block/filters-addon-block.component';
import { InformationBlockComponent } from './policy-viewer/blocks/information-block/information-block.component';
import {
    RequestDocumentBlockComponent
} from './policy-viewer/blocks/request-document-block/request-document-block.component';
import { RolesBlockComponent } from './policy-viewer/blocks/roles-block/roles-block.component';
import { StepBlockComponent } from './policy-viewer/blocks/step-block/step-block.component';
import {
    CalculateConfigComponent
} from './policy-configuration/blocks/calculate/calculate-config/calculate-config.component';
import {
    CalculateMathConfigComponent
} from './policy-configuration/blocks/calculate/calculate-math-config/calculate-math-config.component';
import { BlockNode } from './helpers/tree-data-source/tree-data-source';
import { ReportBlockComponent } from './policy-viewer/blocks/report-block/report-block.component';
import {
    ReportItemConfigComponent
} from './policy-configuration/blocks/report/report-item-config/report-item-config.component';
import {
    PaginationAddonBlockComponent
} from './policy-viewer/blocks/pagination-addon-block/pagination-addon-block.component';
import {
    ReassigningConfigComponent
} from './policy-configuration/blocks/documents/reassigning-config/reassigning-config.component';
import { TimerConfigComponent } from './policy-configuration/blocks/documents/timer-config/timer-config.component';
import {
    CustomLogicConfigComponent
} from './policy-configuration/blocks/calculate/custom-logic-config/custom-logic-config.component';
import { SwitchConfigComponent } from './policy-configuration/blocks/main/switch-config/switch-config.component';
import { PolicyBlockModel } from './structures/policy-model';
import { RevokeConfigComponent } from './policy-configuration/blocks/documents/revoke-config/revoke-config.component';
import { ButtonConfigComponent } from './policy-configuration/blocks/main/button-config/button-config.component';
import { ButtonBlockComponent } from './policy-viewer/blocks/button-block/button-block.component';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import {
    TokenActionConfigComponent
} from './policy-configuration/blocks/tokens/token-action-config/token-action-config.component';
import {
    DocumentValidatorConfigComponent
} from './policy-configuration/blocks/documents/document-validator-config/document-validator-config.component';
import {
    TokenConfirmationConfigComponent
} from './policy-configuration/blocks/tokens/token-confirmation-config/token-confirmation-config.component';
import {
    TokenConfirmationBlockComponent
} from './policy-viewer/blocks/token-confirmation-block/token-confirmation-block.component';
import {
    GroupManagerConfigComponent
} from './policy-configuration/blocks/main/group-manager-config/group-manager-config.component';
import { GroupManagerBlockComponent } from './policy-viewer/blocks/group-manager-block/group-manager-block.component';
import { BlockType } from './structures/types/block-type.type';
import { BlockGroup } from './structures/types/block-group.type';
import { BlockHeaders } from './structures/types/block-headers.type';
import { IBlockAbout } from './structures/interfaces/block-about.interface';
import { ChildrenType } from './structures/types/children-type.type';
import { ControlType } from './structures/types/control-type.type';
import { BlockAbout } from './structures/block-about';
import { IBlockSetting } from './structures/interfaces/block-setting.interface';
import { MultiSignBlockComponent } from './policy-viewer/blocks/multi-sign-block/multi-sign-block.component';
import {
    CreateTokenConfigComponent
} from './policy-configuration/blocks/tokens/create-token-config/create-token-config.component';
import { CreateTokenBlockComponent } from './policy-viewer/blocks/create-token-block/create-token-block.component';
import {
    HttpRequestConfigComponent
} from './policy-configuration/blocks/main/http-request-config/http-request-config.component';

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
    private customProperties: any;

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
        this.customProperties = {};

        const allowedChildrenStepContainerBlocks = [
            { type: BlockType.Information },
            { type: BlockType.PolicyRoles },
            { type: BlockType.GroupManagerBlock },
            { type: BlockType.Action },
            { type: BlockType.Container },
            { type: BlockType.Step },
            { type: BlockType.Switch },
            { type: BlockType.HttpRequest },
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
            { type: BlockType.ButtonBlock },
            { type: BlockType.TokenActionBlock },
            { type: BlockType.TokenConfirmationBlock },
            { type: BlockType.DocumentValidatorBlock },
            { type: BlockType.MultiSignBlock },
            { type: BlockType.CreateToken },
            { type: BlockType.SplitBlock },
        ];

        // #region Main, UI Components
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
            property: null,
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
            type: BlockType.GroupManagerBlock,
            icon: 'groups',
            group: BlockGroup.Main,
            header: BlockHeaders.UIComponents,
            factory: GroupManagerBlockComponent,
            property: GroupManagerConfigComponent
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
        // #endregion

        // #region Main, Server Blocks
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
        // #endregion

        // #region Main, Server Blocks
        this.registerBlock({
            type: BlockType.HttpRequest,
            icon: 'http',
            group: BlockGroup.Main,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: HttpRequestConfigComponent,
        });
        // #endregion

        // #region Documents, UI Components
        this.registerBlock({
            type: BlockType.DocumentsViewer,
            icon: 'table_view',
            group: BlockGroup.Documents,
            header: BlockHeaders.UIComponents,
            factory: DocumentsSourceBlockComponent,
            property: DocumentSourceComponent,
            allowedChildren: [
                {
                    type: BlockType.FiltersAddon,
                    group: BlockGroup.UnGrouped,
                },
                {
                    type: BlockType.PaginationAddon,
                    group: BlockGroup.UnGrouped,
                },
                {
                    type: BlockType.DocumentsSourceAddon,
                    group: BlockGroup.UnGrouped,
                },
            ],
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
            }, {
                type: BlockType.DocumentValidatorBlock,
                group: BlockGroup.UnGrouped
            }]
        });
        this.registerBlock({
            type: BlockType.MultiSignBlock,
            icon: 'done_all',
            group: BlockGroup.Documents,
            header: BlockHeaders.UIComponents,
            factory: MultiSignBlockComponent,
            property: null,
        });
        // #endregion

        // #region Documents, Server Blocks
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
            allowedChildren: [{
                type: BlockType.DocumentValidatorBlock,
                group: BlockGroup.UnGrouped
            }]
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
            type: BlockType.RevokeBlock,
            icon: 'restart_alt',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: RevokeConfigComponent,
        });
        this.registerBlock({
            type: BlockType.SetRelationshipsBlock,
            icon: 'settings',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: null,
            allowedChildren: [{
                type: BlockType.DocumentsSourceAddon,
                group: BlockGroup.UnGrouped
            }]
        });
        this.registerBlock({
            type: BlockType.SplitBlock,
            icon: 'content_cut',
            group: BlockGroup.Documents,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: null,
        });
        // #endregion

        // #region Documents, Addons
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
        this.registerBlock({
            type: BlockType.DocumentValidatorBlock,
            icon: 'task_alt',
            group: BlockGroup.Documents,
            header: BlockHeaders.Addons,
            factory: null,
            property: DocumentValidatorConfigComponent
        });
        // #endregion

        // #region Tokens, UI blocks
        this.registerBlock({
            type: BlockType.CreateToken,
            icon: 'token',
            group: BlockGroup.Tokens,
            header: BlockHeaders.UIComponents,
            factory: CreateTokenBlockComponent,
            property: CreateTokenConfigComponent,
        });
        // #endregion

        // #region Tokens, Server Blocks
        this.registerBlock({
            type: BlockType.Mint,
            icon: 'paid',
            group: BlockGroup.Tokens,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: MintConfigComponent,
            allowedChildren: [{
                type: BlockType.ImpactAddon,
                group: BlockGroup.UnGrouped,
            }]
        });
        this.registerBlock({
            type: BlockType.Wipe,
            icon: 'delete',
            group: BlockGroup.Tokens,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: MintConfigComponent,
        });
        this.registerBlock({
            type: BlockType.TokenActionBlock,
            icon: 'generating_tokens',
            group: BlockGroup.Tokens,
            header: BlockHeaders.ServerBlocks,
            factory: null,
            property: TokenActionConfigComponent,
        });
        this.registerBlock({
            type: BlockType.TokenConfirmationBlock,
            icon: 'key',
            group: BlockGroup.Tokens,
            header: BlockHeaders.UIComponents,
            factory: TokenConfirmationBlockComponent,
            property: TokenConfirmationConfigComponent,
        });
        // #endregion

        // #region Calculate, Addons
        this.registerBlock({
            type: BlockType.ImpactAddon,
            icon: 'receipt',
            group: BlockGroup.Tokens,
            header: BlockHeaders.Addons,
            factory: null,
            property: null,
        });
        // #endregion

        // #region Calculate, Server Blocks
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
            }, {
                type: BlockType.CalculateMathVariables,
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
        // #endregion

        // #region Calculate, Addons
        this.registerBlock({
            type: BlockType.CalculateMathAddon,
            icon: 'calculate',
            group: BlockGroup.Calculate,
            header: BlockHeaders.Addons,
            factory: null,
            property: CalculateMathConfigComponent,
        });
        this.registerBlock({
            type: BlockType.CalculateMathVariables,
            icon: '123',
            group: BlockGroup.Calculate,
            header: BlockHeaders.Addons,
            factory: null,
            property: null,
        });
        // #endregion

        // #region Report, UIComponents
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
        // #endregion

        // #region Report, Addons
        this.registerBlock({
            type: BlockType.ReportItem,
            icon: 'list_alt',
            group: BlockGroup.Report,
            header: BlockHeaders.Addons,
            factory: null,
            property: ReportItemConfigComponent
        });
        // #endregion
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
            this.customProperties[type] = setting?.properties;
        }
    }

    private clear() {
        this.names = {};
        this.titles = {};
        this.about = {};
        this.customProperties = {};
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

    public getCustomProperties(blockType: string): any[] {
        return this.customProperties[blockType];
    }

    public newBlock(type: BlockType): BlockNode {
        return {
            id: GenerateUUIDv4(),
            tag: '',
            blockType: type,
            defaultActive: !!this.factories[type],
            children: [],
            permissions: []
        };
    }
}

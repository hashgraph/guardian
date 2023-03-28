import { ActionConfigComponent } from '../policy-configuration/blocks/main/action-config/action-config.component';
import { AggregateConfigComponent } from '../policy-configuration/blocks/documents/aggregate-config/aggregate-config.component';
import { ContainerConfigComponent } from '../policy-configuration/blocks/main/container-config/container-config.component';
import { DocumentSourceComponent } from '../policy-configuration/blocks/documents/document-viewer-config/document-viewer-config.component';
import { ExternalDataConfigComponent } from '../policy-configuration/blocks/documents/external-data-config/external-data-config.component';
import { FiltersAddonConfigComponent } from '../policy-configuration/blocks/documents/filters-addon-config/filters-addon-config.component';
import { InformationConfigComponent } from '../policy-configuration/blocks/main/information-config/information-config.component';
import { MintConfigComponent } from '../policy-configuration/blocks/tokens/mint-config/mint-config.component';
import { RequestConfigComponent } from '../policy-configuration/blocks/documents/request-config/request-config.component';
import { RolesConfigComponent } from '../policy-configuration/blocks/main/roles-config/roles-config.component';
import { SendConfigComponent } from '../policy-configuration/blocks/documents/send-config/send-config.component';
import { SourceAddonConfigComponent } from '../policy-configuration/blocks/documents/source-addon-config/source-addon-config.component';
import { ActionBlockComponent } from '../policy-viewer/blocks/action-block/action-block.component';
import { ContainerBlockComponent } from '../policy-viewer/blocks/container-block/container-block.component';
import { DocumentsSourceBlockComponent } from '../policy-viewer/blocks/documents-source-block/documents-source-block.component';
import { FiltersAddonBlockComponent } from '../policy-viewer/blocks/filters-addon-block/filters-addon-block.component';
import { InformationBlockComponent } from '../policy-viewer/blocks/information-block/information-block.component';
import { RequestDocumentBlockComponent } from '../policy-viewer/blocks/request-document-block/request-document-block.component';
import { RolesBlockComponent } from '../policy-viewer/blocks/roles-block/roles-block.component';
import { StepBlockComponent } from '../policy-viewer/blocks/step-block/step-block.component';
import { CalculateConfigComponent } from '../policy-configuration/blocks/calculate/calculate-config/calculate-config.component';
import { CalculateMathConfigComponent } from '../policy-configuration/blocks/calculate/calculate-math-config/calculate-math-config.component';
import { ReportBlockComponent } from '../policy-viewer/blocks/report-block/report-block.component';
import { ReportItemConfigComponent } from '../policy-configuration/blocks/report/report-item-config/report-item-config.component';
import { PaginationAddonBlockComponent } from '../policy-viewer/blocks/pagination-addon-block/pagination-addon-block.component';
import { ReassigningConfigComponent } from '../policy-configuration/blocks/documents/reassigning-config/reassigning-config.component';
import { TimerConfigComponent } from '../policy-configuration/blocks/documents/timer-config/timer-config.component';
import { CustomLogicConfigComponent } from '../policy-configuration/blocks/calculate/custom-logic-config/custom-logic-config.component';
import { SwitchConfigComponent } from '../policy-configuration/blocks/main/switch-config/switch-config.component';
import { RevokeConfigComponent } from '../policy-configuration/blocks/documents/revoke-config/revoke-config.component';
import { ButtonConfigComponent } from '../policy-configuration/blocks/main/button-config/button-config.component';
import { ButtonBlockComponent } from '../policy-viewer/blocks/button-block/button-block.component';
import { TokenActionConfigComponent } from '../policy-configuration/blocks/tokens/token-action-config/token-action-config.component';
import { DocumentValidatorConfigComponent } from '../policy-configuration/blocks/documents/document-validator-config/document-validator-config.component';
import { TokenConfirmationConfigComponent } from '../policy-configuration/blocks/tokens/token-confirmation-config/token-confirmation-config.component';
import { TokenConfirmationBlockComponent } from '../policy-viewer/blocks/token-confirmation-block/token-confirmation-block.component';
import { GroupManagerConfigComponent } from '../policy-configuration/blocks/main/group-manager-config/group-manager-config.component';
import { GroupManagerBlockComponent } from '../policy-viewer/blocks/group-manager-block/group-manager-block.component';
import { MultiSignBlockComponent } from '../policy-viewer/blocks/multi-sign-block/multi-sign-block.component';
import { CreateTokenConfigComponent } from '../policy-configuration/blocks/tokens/create-token-config/create-token-config.component';
import { CreateTokenBlockComponent } from '../policy-viewer/blocks/create-token-block/create-token-block.component';
import { HttpRequestConfigComponent } from '../policy-configuration/blocks/main/http-request-config/http-request-config.component';
import {
    BlockType,
    BlockGroup,
    BlockHeaders,
    PolicyBlockModel,
    IBlockSetting
} from "../structures";
import { TagsManagerBlockComponent } from '../policy-viewer/blocks/tags-manager-block/tags-manager-block.component';

const Container: IBlockSetting = {
    type: BlockType.Container,
    icon: 'tab',
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: ContainerBlockComponent,
    property: ContainerConfigComponent,
    allowedChildren: [
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
        { type: BlockType.SplitBlock }
    ]
}

const Step: IBlockSetting = {
    type: BlockType.Step,
    icon: 'vertical_split',
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: StepBlockComponent,
    property: null,
    allowedChildren: [
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
        { type: BlockType.SplitBlock }
    ]
}

const PolicyRoles: IBlockSetting = {
    type: BlockType.PolicyRoles,
    icon: 'manage_accounts',
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: RolesBlockComponent,
    property: RolesConfigComponent
}

const GroupManagerBlock: IBlockSetting = {
    type: BlockType.GroupManagerBlock,
    icon: 'groups',
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: GroupManagerBlockComponent,
    property: GroupManagerConfigComponent
}

const container: IBlockSetting = {
    type: BlockType.Information,
    icon: 'info',
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: InformationBlockComponent,
    property: InformationConfigComponent,
}

const Action: IBlockSetting = {
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
        output: (value: any, block: PolicyBlockModel) => {
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
}

const ButtonBlock: IBlockSetting = {
    type: BlockType.ButtonBlock,
    icon: 'radio_button_checked',
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: ButtonBlockComponent,
    property: ButtonConfigComponent,
    about: {
        output: (value: any, block: PolicyBlockModel) => {
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
}

const Switch: IBlockSetting = {
    type: BlockType.Switch,
    icon: 'rule',
    group: BlockGroup.Main,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: SwitchConfigComponent,
    about: {
        output: (value: any, block: PolicyBlockModel) => {
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
}

const HttpRequest: IBlockSetting = {
    type: BlockType.HttpRequest,
    icon: 'http',
    group: BlockGroup.Main,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: HttpRequestConfigComponent,
}

const DocumentsViewer: IBlockSetting = {
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
        {
            type: BlockType.HistoryAddon,
            group: BlockGroup.UnGrouped,
        }
    ],
}

const Request: IBlockSetting = {
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
}

const MultiSignBlock: IBlockSetting = {
    type: BlockType.MultiSignBlock,
    icon: 'done_all',
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: MultiSignBlockComponent,
    property: null,
}

const SendToGuardian: IBlockSetting = {
    type: BlockType.SendToGuardian,
    icon: 'send',
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: SendConfigComponent,
}

const ExternalData: IBlockSetting = {
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
}

const AggregateDocument: IBlockSetting = {
    type: BlockType.AggregateDocument,
    icon: 'calendar_month',
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: AggregateConfigComponent,
}

const ReassigningBlock: IBlockSetting = {
    type: BlockType.ReassigningBlock,
    icon: 'content_copy',
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: ReassigningConfigComponent,
}

const RevokeBlock: IBlockSetting = {
    type: BlockType.RevokeBlock,
    icon: 'restart_alt',
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: RevokeConfigComponent,
}

const SetRelationshipsBlock: IBlockSetting = {
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
}

const SplitBlock: IBlockSetting = {
    type: BlockType.SplitBlock,
    icon: 'content_cut',
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: null,
}

const FiltersAddon: IBlockSetting = {
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
}

const DocumentsSourceAddon: IBlockSetting = {
    type: BlockType.DocumentsSourceAddon,
    icon: 'source',
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: SourceAddonConfigComponent,
    allowedChildren: [{
        type: BlockType.FiltersAddon,
        group: BlockGroup.UnGrouped
    }, {
        type: BlockType.SelectiveAttributes,
        group: BlockGroup.UnGrouped
    }]
}

const PaginationAddon: IBlockSetting = {
    type: BlockType.PaginationAddon,
    icon: 'pages',
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: PaginationAddonBlockComponent,
    property: null,
}

const HistoryAddon: IBlockSetting = {
    type: BlockType.HistoryAddon,
    icon: 'history',
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
};

const SelectiveAttributes: IBlockSetting = {
    type: BlockType.SelectiveAttributes,
    icon: 'rule_folder',
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
};

const TimerBlock: IBlockSetting = {
    type: BlockType.TimerBlock,
    icon: 'schedule',
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: TimerConfigComponent,
}

const DocumentValidatorBlock: IBlockSetting = {
    type: BlockType.DocumentValidatorBlock,
    icon: 'task_alt',
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: DocumentValidatorConfigComponent
}

const CreateToken: IBlockSetting = {
    type: BlockType.CreateToken,
    icon: 'token',
    group: BlockGroup.Tokens,
    header: BlockHeaders.UIComponents,
    factory: CreateTokenBlockComponent,
    property: CreateTokenConfigComponent,
}

const Mint: IBlockSetting = {
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
}

const Wipe: IBlockSetting = {
    type: BlockType.Wipe,
    icon: 'delete',
    group: BlockGroup.Tokens,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: MintConfigComponent,
}

const TokenActionBlock: IBlockSetting = {
    type: BlockType.TokenActionBlock,
    icon: 'generating_tokens',
    group: BlockGroup.Tokens,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: TokenActionConfigComponent,
}

const TokenConfirmationBlock: IBlockSetting = {
    type: BlockType.TokenConfirmationBlock,
    icon: 'key',
    group: BlockGroup.Tokens,
    header: BlockHeaders.UIComponents,
    factory: TokenConfirmationBlockComponent,
    property: TokenConfirmationConfigComponent,
}

const ImpactAddon: IBlockSetting = {
    type: BlockType.ImpactAddon,
    icon: 'receipt',
    group: BlockGroup.Tokens,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
}

const Calculate: IBlockSetting = {
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
}

const CustomLogicBlock: IBlockSetting = {
    type: BlockType.CustomLogicBlock,
    icon: 'bar_chart',
    group: BlockGroup.Calculate,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: CustomLogicConfigComponent,
}

const CalculateMathAddon: IBlockSetting = {
    type: BlockType.CalculateMathAddon,
    icon: 'calculate',
    group: BlockGroup.Calculate,
    header: BlockHeaders.Addons,
    factory: null,
    property: CalculateMathConfigComponent,
}

const CalculateMathVariables: IBlockSetting = {
    type: BlockType.CalculateMathVariables,
    icon: '123',
    group: BlockGroup.Calculate,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
}

const Report: IBlockSetting = {
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
}

const ReportItem: IBlockSetting = {
    type: BlockType.ReportItem,
    icon: 'list_alt',
    group: BlockGroup.Report,
    header: BlockHeaders.Addons,
    factory: null,
    property: ReportItemConfigComponent
}

const TagManager: IBlockSetting = {
    type: BlockType.TagsManager,
    icon: 'sell',
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: TagsManagerBlockComponent,
    property: null
}

export default [
    Container,
    Step,
    PolicyRoles,
    GroupManagerBlock,
    container,
    Action,
    ButtonBlock,
    Switch,
    HttpRequest,
    DocumentsViewer,
    Request,
    MultiSignBlock,
    SendToGuardian,
    ExternalData,
    AggregateDocument,
    ReassigningBlock,
    RevokeBlock,
    SetRelationshipsBlock,
    SplitBlock,
    FiltersAddon,
    DocumentsSourceAddon,
    PaginationAddon,
    TimerBlock,
    DocumentValidatorBlock,
    CreateToken,
    Mint,
    Wipe,
    TokenActionBlock,
    TokenConfirmationBlock,
    ImpactAddon,
    Calculate,
    CustomLogicBlock,
    CalculateMathAddon,
    CalculateMathVariables,
    Report,
    ReportItem,
    HistoryAddon,
    SelectiveAttributes,
    TagManager
];
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
import { ExternalTopicBlockComponent } from '../policy-viewer/blocks/external-topic-block/external-topic-block.component';
import { UploadDocumentBlockComponent } from '../policy-viewer/blocks/upload-document-block/upload-document-block.component';
import { TagsManagerBlockComponent } from '../policy-viewer/blocks/tags-manager-block/tags-manager-block.component';
import { MessagesReportBlockComponent } from '../policy-viewer/blocks/messages-report-block/messages-report-block.component';
import { ButtonBlockAddonComponent } from '../policy-viewer/blocks/button-block-addon/button-block-addon.component';
import { DropdownBlockAddonComponent } from '../policy-viewer/blocks/dropdown-block-addon/dropdown-block-addon.component';
import { RequestDocumentBlockAddonComponent } from '../policy-viewer/blocks/request-document-block-addon/request-document-block-addon.component';
import { RequestAddonConfigComponent } from '../policy-configuration/blocks/documents/request-addon-config/request-addon-config.component';
import { BlockGroup, BlockHeaders, IBlockSetting, PolicyBlock } from '../structures';
import { BlockType } from '@guardian/interfaces';
import BlockIcons from './block-icons';
import { DataTransformationConfigComponent } from '../policy-configuration/blocks/calculate/data-transformation-config/data-transformation-config.component';
import { TransformationButtonBlockComponent } from '../policy-viewer/blocks/transformation-button-block/transformation-button-block.component';
import { IntegrationButtonBlockComponent } from '../policy-viewer/blocks/integration-button-block/integration-button-block.component';
import { HttpRequestUIAddonCode } from '../policy-viewer/code/http-request-ui-addon';
import { TransformationUIAddonCode } from '../policy-viewer/code/transformation-ui-addon';
import { WipeConfigComponent } from '../policy-configuration/blocks/tokens/wipe-config/wipe-config.component';
import { GlobalTopicReaderBlockComponent } from '../policy-viewer/blocks/global-topic-reader-block/global-topic-reader-block.component';


const Container: IBlockSetting = {
    type: BlockType.Container,
    icon: BlockIcons[BlockType.Container],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: ContainerBlockComponent,
    property: ContainerConfigComponent,
    code: null,
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
        { type: BlockType.Upload },
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
        { type: BlockType.RevocationBlock },
        { type: BlockType.SetRelationshipsBlock },
        { type: BlockType.ButtonBlock },
        { type: BlockType.TransformationButtonBlock },
        { type: BlockType.IntegrationButtonBlock },
        { type: BlockType.TokenActionBlock },
        { type: BlockType.TokenConfirmationBlock },
        { type: BlockType.DocumentValidatorBlock },
        { type: BlockType.MultiSignBlock },
        { type: BlockType.CreateToken },
        { type: BlockType.SplitBlock },
        { type: BlockType.ExternalTopic },
        { type: BlockType.MessagesReportBlock },
        { type: BlockType.NotificationBlock },
        { type: BlockType.ExtractDataBlock },
        { type: BlockType.GlobalTopicReaderBlock },
    ]
}

const Step: IBlockSetting = {
    type: BlockType.Step,
    icon: BlockIcons[BlockType.Step],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: StepBlockComponent,
    property: null,
    code: null,
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
        { type: BlockType.Upload },
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
        { type: BlockType.RevocationBlock },
        { type: BlockType.SetRelationshipsBlock },
        { type: BlockType.ButtonBlock },
        { type: BlockType.TransformationButtonBlock },
        { type: BlockType.IntegrationButtonBlock },
        { type: BlockType.TokenActionBlock },
        { type: BlockType.TokenConfirmationBlock },
        { type: BlockType.DocumentValidatorBlock },
        { type: BlockType.MultiSignBlock },
        { type: BlockType.CreateToken },
        { type: BlockType.SplitBlock },
        { type: BlockType.ExternalTopic },
        { type: BlockType.MessagesReportBlock },
        { type: BlockType.NotificationBlock },
        { type: BlockType.ExtractDataBlock },
        { type: BlockType.GlobalTopicReaderBlock },
    ]
}

const PolicyRoles: IBlockSetting = {
    type: BlockType.PolicyRoles,
    icon: BlockIcons[BlockType.PolicyRoles],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: RolesBlockComponent,
    property: RolesConfigComponent,
    code: null
}

const GroupManagerBlock: IBlockSetting = {
    type: BlockType.GroupManagerBlock,
    icon: BlockIcons[BlockType.GroupManagerBlock],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: GroupManagerBlockComponent,
    property: GroupManagerConfigComponent,
    code: null,
}

const container: IBlockSetting = {
    type: BlockType.Information,
    icon: BlockIcons[BlockType.Information],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: InformationBlockComponent,
    property: InformationConfigComponent,
    code: null
}

const Action: IBlockSetting = {
    type: BlockType.Action,
    icon: BlockIcons[BlockType.Action],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: ActionBlockComponent,
    property: ActionConfigComponent,
    code: null,
    allowedChildren: [{
        type: BlockType.DocumentsSourceAddon,
        group: BlockGroup.UnGrouped
    }],
    about: {
        output: (value: any, block: PolicyBlock) => {
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
                result.push('DropdownEvent');
            }
            return result;
        }
    }
}

const ButtonBlock: IBlockSetting = {
    type: BlockType.ButtonBlock,
    icon: BlockIcons[BlockType.ButtonBlock],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: ButtonBlockComponent,
    property: ButtonConfigComponent,
    code: null,
    about: {
        output: (value: any, block: PolicyBlock) => {
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

const TransformationButtonBlock: IBlockSetting = {
    type: BlockType.TransformationButtonBlock,
    icon: BlockIcons[BlockType.TransformationButtonBlock],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: TransformationButtonBlockComponent,
    property: null,
    code: null,
}

const IntegrationButtonBlock: IBlockSetting = {
    type: BlockType.IntegrationButtonBlock,
    icon: BlockIcons[BlockType.IntegrationButtonBlock],
    group: BlockGroup.Main,
    header: BlockHeaders.UIComponents,
    factory: IntegrationButtonBlockComponent,
    property: null,
    code: null,
}

const ButtonBlockAddon: IBlockSetting = {
    type: BlockType.ButtonBlockAddon,
    icon: BlockIcons[BlockType.ButtonBlockAddon],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: ButtonBlockAddonComponent,
    property: null,
    code: null
}

const DropdownBlockAddon: IBlockSetting = {
    type: BlockType.DropdownBlockAddon,
    icon: BlockIcons[BlockType.DropdownBlockAddon],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: DropdownBlockAddonComponent,
    property: null,
    code: null,
    allowedChildren: [
        {
            type: BlockType.DocumentsSourceAddon,
            group: BlockGroup.UnGrouped,
        },
    ]
}

const RequestBlockAddon: IBlockSetting = {
    type: BlockType.RequestBlockAddon,
    icon: BlockIcons[BlockType.RequestBlockAddon],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: RequestDocumentBlockAddonComponent,
    property: RequestAddonConfigComponent,
    code: null,
}

const Switch: IBlockSetting = {
    type: BlockType.Switch,
    icon: BlockIcons[BlockType.Switch],
    group: BlockGroup.Main,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: SwitchConfigComponent,
    code: null,
    about: {
        output: (value: any, block: PolicyBlock) => {
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
    icon: BlockIcons[BlockType.HttpRequest],
    group: BlockGroup.Main,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: HttpRequestConfigComponent,
    code: null,
}

const DocumentsViewer: IBlockSetting = {
    type: BlockType.DocumentsViewer,
    icon: BlockIcons[BlockType.DocumentsViewer],
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: DocumentsSourceBlockComponent,
    property: DocumentSourceComponent,
    code: null,
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
        },
        {
            type: BlockType.ButtonBlockAddon,
            group: BlockGroup.UnGrouped,
        },
        {
            type: BlockType.DropdownBlockAddon,
            group: BlockGroup.UnGrouped,
        },
        {
            type: BlockType.RequestBlockAddon,
            group: BlockGroup.UnGrouped,
        }
    ],
    about: {
        output: (value: any, block: PolicyBlock) => {
            const result = value ? value.slice() : [];
            const buttons = block.children.filter((child) =>
                [
                    BlockType.RequestBlockAddon,
                    BlockType.ButtonBlockAddon,
                    BlockType.DropdownBlockAddon,
                ].includes(child.blockType as any)
            );
            for (const button of buttons) {
                result.push(button.tag);
            }
            return result;
        },
    },
};

const Request: IBlockSetting = {
    type: BlockType.Request,
    icon: BlockIcons[BlockType.Request],
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: RequestDocumentBlockComponent,
    property: RequestConfigComponent,
    code: null,
    allowedChildren: [{
        type: BlockType.DocumentsSourceAddon,
        group: BlockGroup.UnGrouped
    }, {
        type: BlockType.DocumentValidatorBlock,
        group: BlockGroup.UnGrouped
    }]
}

const Upload: IBlockSetting = {
    type: BlockType.Upload,
    icon: BlockIcons[BlockType.Upload],
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: UploadDocumentBlockComponent,
    property: null,
    code: null,
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
    icon: BlockIcons[BlockType.MultiSignBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: MultiSignBlockComponent,
    property: null,
    code: null,
}

const SendToGuardian: IBlockSetting = {
    type: BlockType.SendToGuardian,
    icon: BlockIcons[BlockType.SendToGuardian],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: SendConfigComponent,
    code: null,
}

const ExternalData: IBlockSetting = {
    type: BlockType.ExternalData,
    icon: BlockIcons[BlockType.ExternalData],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: ExternalDataConfigComponent,
    code: null,
    allowedChildren: [{
        type: BlockType.DocumentValidatorBlock,
        group: BlockGroup.UnGrouped
    }]
}

const ExternalTopic: IBlockSetting = {
    type: BlockType.ExternalTopic,
    icon: BlockIcons[BlockType.ExternalTopic],
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: ExternalTopicBlockComponent,
    property: null,
    code: null,
    allowedChildren: [{
        type: BlockType.DocumentValidatorBlock,
        group: BlockGroup.UnGrouped
    }]
}

const GlobalTopicReaderBlock: IBlockSetting = {
    type: BlockType.GlobalTopicReaderBlock,
    icon: BlockIcons[BlockType.GlobalTopicReaderBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: GlobalTopicReaderBlockComponent,
    property: null,
    code: null,
    allowedChildren: [{
        type: BlockType.DocumentValidatorBlock,
        group: BlockGroup.UnGrouped
    }],
    about: {
        output: (value: any, block: PolicyBlock) => {
            const result = value ? value.slice() : [];

            const messageTypes = (block as any).properties?.messageTypes;
            if (Array.isArray(messageTypes)) {
                for (const mt of messageTypes) {
                    if (mt && typeof mt.messageType === 'string' && mt.messageType.trim()) {
                        result.push(mt.messageType.trim());
                    }
                }
            }

            return result;
        }
    }
}

const AggregateDocument: IBlockSetting = {
    type: BlockType.AggregateDocument,
    icon: BlockIcons[BlockType.AggregateDocument],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: AggregateConfigComponent,
    code: null,
}

const ReassigningBlock: IBlockSetting = {
    type: BlockType.ReassigningBlock,
    icon: BlockIcons[BlockType.ReassigningBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: ReassigningConfigComponent,
    code: null,
}

const RevokeBlock: IBlockSetting = {
    type: BlockType.RevokeBlock,
    icon: BlockIcons[BlockType.RevokeBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: RevokeConfigComponent,
    code: null,
}

const RevocationBlock: IBlockSetting = {
    type: BlockType.RevocationBlock,
    icon: BlockIcons[BlockType.RevocationBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: null,
    code: null,
}

const SetRelationshipsBlock: IBlockSetting = {
    type: BlockType.SetRelationshipsBlock,
    icon: BlockIcons[BlockType.SetRelationshipsBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: null,
    code: null,
    allowedChildren: [{
        type: BlockType.DocumentsSourceAddon,
        group: BlockGroup.UnGrouped
    }]
}

const SplitBlock: IBlockSetting = {
    type: BlockType.SplitBlock,
    icon: BlockIcons[BlockType.SplitBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: null,
    code: null,
}

const FiltersAddon: IBlockSetting = {
    type: BlockType.FiltersAddon,
    icon: BlockIcons[BlockType.FiltersAddon],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: FiltersAddonBlockComponent,
    property: FiltersAddonConfigComponent,
    code: null,
    allowedChildren: [{
        type: BlockType.DocumentsSourceAddon,
        group: BlockGroup.UnGrouped
    }]
}

const DocumentsSourceAddon: IBlockSetting = {
    type: BlockType.DocumentsSourceAddon,
    icon: BlockIcons[BlockType.DocumentsSourceAddon],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: SourceAddonConfigComponent,
    code: null,
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
    icon: BlockIcons[BlockType.PaginationAddon],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: PaginationAddonBlockComponent,
    property: null,
    code: null,
}

const DataTransformationAddon: IBlockSetting = {
    type: BlockType.DataTransformationAddon,
    icon: BlockIcons[BlockType.DataTransformationAddon],
    group: BlockGroup.UnGrouped,
    header: BlockHeaders.Addons,
    factory: null,
    property: DataTransformationConfigComponent,
    code: null,
}

const HistoryAddon: IBlockSetting = {
    type: BlockType.HistoryAddon,
    icon: BlockIcons[BlockType.HistoryAddon],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
    code: null,
}

const SelectiveAttributes: IBlockSetting = {
    type: BlockType.SelectiveAttributes,
    icon: BlockIcons[BlockType.SelectiveAttributes],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
    code: null,
}

const TimerBlock: IBlockSetting = {
    type: BlockType.TimerBlock,
    icon: BlockIcons[BlockType.TimerBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: TimerConfigComponent,
    code: null,
}

const DocumentValidatorBlock: IBlockSetting = {
    type: BlockType.DocumentValidatorBlock,
    icon: BlockIcons[BlockType.DocumentValidatorBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.Addons,
    factory: null,
    property: DocumentValidatorConfigComponent,
    code: null
}

const ExtractData: IBlockSetting = {
    type: BlockType.ExtractDataBlock,
    icon: BlockIcons[BlockType.ExtractDataBlock],
    group: BlockGroup.Documents,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: null,
    code: null
}

const CreateToken: IBlockSetting = {
    type: BlockType.CreateToken,
    icon: BlockIcons[BlockType.CreateToken],
    group: BlockGroup.Tokens,
    header: BlockHeaders.UIComponents,
    factory: CreateTokenBlockComponent,
    property: CreateTokenConfigComponent,
    code: null,
}

const Mint: IBlockSetting = {
    type: BlockType.Mint,
    icon: BlockIcons[BlockType.Mint],
    group: BlockGroup.Tokens,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: MintConfigComponent,
    code: null,
    allowedChildren: [{
        type: BlockType.ImpactAddon,
        group: BlockGroup.UnGrouped,
    }]
}

const Wipe: IBlockSetting = {
    type: BlockType.Wipe,
    icon: BlockIcons[BlockType.Wipe],
    group: BlockGroup.Tokens,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: WipeConfigComponent,
    code: null,
}

const TokenActionBlock: IBlockSetting = {
    type: BlockType.TokenActionBlock,
    icon: BlockIcons[BlockType.TokenActionBlock],
    group: BlockGroup.Tokens,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: TokenActionConfigComponent,
    code: null,
}

const TokenConfirmationBlock: IBlockSetting = {
    type: BlockType.TokenConfirmationBlock,
    icon: BlockIcons[BlockType.TokenConfirmationBlock],
    group: BlockGroup.Tokens,
    header: BlockHeaders.UIComponents,
    factory: TokenConfirmationBlockComponent,
    property: TokenConfirmationConfigComponent,
    code: null,
}

const ImpactAddon: IBlockSetting = {
    type: BlockType.ImpactAddon,
    icon: BlockIcons[BlockType.ImpactAddon],
    group: BlockGroup.Tokens,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
    code: null,
}

const Calculate: IBlockSetting = {
    type: BlockType.Calculate,
    icon: BlockIcons[BlockType.Calculate],
    group: BlockGroup.Calculate,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: CalculateConfigComponent,
    code: null,
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
    icon: BlockIcons[BlockType.CustomLogicBlock],
    group: BlockGroup.Calculate,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: CustomLogicConfigComponent,
    code: null,
}

const CalculateMathAddon: IBlockSetting = {
    type: BlockType.CalculateMathAddon,
    icon: BlockIcons[BlockType.CalculateMathAddon],
    group: BlockGroup.Calculate,
    header: BlockHeaders.Addons,
    factory: null,
    property: CalculateMathConfigComponent,
    code: null,
}

const CalculateMathVariables: IBlockSetting = {
    type: BlockType.CalculateMathVariables,
    icon: BlockIcons[BlockType.CalculateMathVariables],
    group: BlockGroup.Calculate,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
    code: null,
}

const AutoReport: IBlockSetting = {
    type: BlockType.MessagesReportBlock,
    icon: BlockIcons[BlockType.MessagesReportBlock],
    group: BlockGroup.Report,
    header: BlockHeaders.UIComponents,
    factory: MessagesReportBlockComponent,
    property: null,
    code: null
}

const Report: IBlockSetting = {
    type: BlockType.Report,
    icon: BlockIcons[BlockType.Report],
    group: BlockGroup.Report,
    header: BlockHeaders.UIComponents,
    factory: ReportBlockComponent,
    property: null,
    code: null,
    allowedChildren: [{
        type: BlockType.ReportItem,
        group: BlockGroup.UnGrouped
    }]
}

const ReportItem: IBlockSetting = {
    type: BlockType.ReportItem,
    icon: BlockIcons[BlockType.ReportItem],
    group: BlockGroup.Report,
    header: BlockHeaders.Addons,
    factory: null,
    property: ReportItemConfigComponent,
    code: null
}

const TagManager: IBlockSetting = {
    type: BlockType.TagsManager,
    icon: BlockIcons[BlockType.TagsManager],
    group: BlockGroup.Documents,
    header: BlockHeaders.UIComponents,
    factory: TagsManagerBlockComponent,
    property: null,
    code: null
}

const NotificationBlock: IBlockSetting = {
    type: BlockType.NotificationBlock,
    icon: BlockIcons[BlockType.NotificationBlock],
    group: BlockGroup.Main,
    header: BlockHeaders.ServerBlocks,
    factory: null,
    property: null,
    code: null,
}

const HttpRequestUIAddon: IBlockSetting = {
    type: BlockType.HttpRequestUIAddon,
    icon: BlockIcons[BlockType.HttpRequestUIAddon],
    group: BlockGroup.Main,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
    code: HttpRequestUIAddonCode,
}

const TransformationUIAddon: IBlockSetting = {
    type: BlockType.TransformationUIAddon,
    icon: BlockIcons[BlockType.TransformationUIAddon],
    group: BlockGroup.Main,
    header: BlockHeaders.Addons,
    factory: null,
    property: null,
    code: TransformationUIAddonCode,
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
    Upload,
    MultiSignBlock,
    SendToGuardian,
    ExternalData,
    AggregateDocument,
    ReassigningBlock,
    RevokeBlock,
    RevocationBlock,
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
    TagManager,
    ExternalTopic,
    GlobalTopicReaderBlock,
    AutoReport,
    NotificationBlock,
    ExtractData,
    ButtonBlockAddon,
    DropdownBlockAddon,
    RequestBlockAddon,
    DataTransformationAddon,
    TransformationButtonBlock,
    IntegrationButtonBlock,
    HttpRequestUIAddon,
    TransformationUIAddon
];

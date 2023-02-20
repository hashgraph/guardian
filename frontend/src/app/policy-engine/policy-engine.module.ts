import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { CommonPropertiesComponent } from './policy-configuration/common-properties/common-properties.component';
import { DocumentSourceComponent } from './policy-configuration/blocks/documents/document-viewer-config/document-viewer-config.component';
import { ActionConfigComponent } from './policy-configuration/blocks/main/action-config/action-config.component';
import { PolicyConfigurationComponent } from './policy-configuration/policy-configuration/policy-configuration.component';
import { ContainerConfigComponent } from './policy-configuration/blocks/main/container-config/container-config.component';
import { RequestConfigComponent } from './policy-configuration/blocks/documents/request-config/request-config.component';
import { PolicyPropertiesComponent } from './policy-configuration/policy-properties/policy-properties.component';
import { MintConfigComponent } from './policy-configuration/blocks/tokens/mint-config/mint-config.component';
import { SendConfigComponent } from './policy-configuration/blocks/documents/send-config/send-config.component';
import { ExternalDataConfigComponent } from './policy-configuration/blocks/documents/external-data-config/external-data-config.component';
import { AggregateConfigComponent } from './policy-configuration/blocks/documents/aggregate-config/aggregate-config.component';
import { InformationConfigComponent } from './policy-configuration/blocks/main/information-config/information-config.component';
import { RolesConfigComponent } from './policy-configuration/blocks/main/roles-config/roles-config.component';
import { FiltersAddonConfigComponent } from './policy-configuration/blocks/documents/filters-addon-config/filters-addon-config.component';
import { SourceAddonConfigComponent } from './policy-configuration/blocks/documents/source-addon-config/source-addon-config.component';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { PolicyViewerComponent } from './policy-viewer/policy-viewer/policy-viewer.component';
import { DialogBlock } from './policy-viewer/dialog-block/dialog-block.component';
import { RequestDocumentBlockComponent } from './policy-viewer/blocks/request-document-block/request-document-block.component';
import { DocumentsSourceBlockComponent } from './policy-viewer/blocks/documents-source-block/documents-source-block.component';
import { ContainerBlockComponent } from './policy-viewer/blocks/container-block/container-block.component';
import { InformationBlockComponent } from './policy-viewer/blocks/information-block/information-block.component';
import { RenderBlockComponent } from './policy-viewer/render-block/render-block.component.ts';
import { ActionBlockComponent } from './policy-viewer/blocks/action-block/action-block.component';
import { DocumentDialogBlock } from './policy-viewer/blocks/document-dialog-block/document-dialog-block.component';
import { StepBlockComponent } from './policy-viewer/blocks/step-block/step-block.component';
import { RolesBlockComponent } from './policy-viewer/blocks/roles-block/roles-block.component';
import { FiltersAddonBlockComponent } from './policy-viewer/blocks/filters-addon-block/filters-addon-block.component';
import { HelpIcon } from './helpers/help-icon/help-icon.component';
import { SchemaEngineModule } from '../schema-engine/schema-engine.module';
import { AppRoutingModule } from '../app-routing.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SavePolicyDialog } from './helpers/save-policy-dialog/save-policy-dialog.component';
import { ImportPolicyDialog } from './helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from './helpers/preview-policy-dialog/preview-policy-dialog.component';
import { ExportPolicyDialog } from './helpers/export-policy-dialog/export-policy-dialog.component';
import { CalculateConfigComponent } from './policy-configuration/blocks/calculate/calculate-config/calculate-config.component';
import { CalculateMathConfigComponent } from './policy-configuration/blocks/calculate/calculate-math-config/calculate-math-config.component';
import { JsonPropertiesComponent } from './policy-configuration/json-properties/json-properties.component';
import { ReportBlockComponent } from './policy-viewer/blocks/report-block/report-block.component';
import { ReportItemConfigComponent } from './policy-configuration/blocks/report/report-item-config/report-item-config.component';
import { PaginationAddonBlockComponent } from './policy-viewer/blocks/pagination-addon-block/pagination-addon-block.component';
import { ReassigningConfigComponent } from './policy-configuration/blocks/documents/reassigning-config/reassigning-config.component';
import { CommonComponentsModule } from '../common-components.module';
import { CronConfigDialog } from './helpers/cron-config-dialog/cron-config-dialog.component';
import { TimerConfigComponent } from './policy-configuration/blocks/documents/timer-config/timer-config.component';
import { CustomLogicConfigComponent } from './policy-configuration/blocks/calculate/custom-logic-config/custom-logic-config.component';
import { CodeEditorDialogComponent } from './helpers/code-editor-dialog/code-editor-dialog.component';
import { SwitchConfigComponent } from './policy-configuration/blocks/main/switch-config/switch-config.component';
import { ConfirmationDialog } from './policy-viewer/blocks/confirmation-dialog/confirmation-dialog.component';
import { RevokeConfigComponent } from './policy-configuration/blocks/documents/revoke-config/revoke-config.component';
import { ButtonConfigComponent } from './policy-configuration/blocks/main/button-config/button-config.component';
import { ButtonBlockComponent } from './policy-viewer/blocks/button-block/button-block.component';
import { TokenActionConfigComponent } from './policy-configuration/blocks/tokens/token-action-config/token-action-config.component';
import { DocumentValidatorConfigComponent } from './policy-configuration/blocks/documents/document-validator-config/document-validator-config.component';
import { TokenConfirmationConfigComponent } from './policy-configuration/blocks/tokens/token-confirmation-config/token-confirmation-config.component';
import { TokenConfirmationBlockComponent } from './policy-viewer/blocks/token-confirmation-block/token-confirmation-block.component';
import { SaveBeforeDialogComponent } from './helpers/save-before-dialog/save-before-dialog.component';
import { PoliciesComponent } from './policies/policies.component';
import { GroupManagerConfigComponent } from './policy-configuration/blocks/main/group-manager-config/group-manager-config.component';
import { GroupManagerBlockComponent } from './policy-viewer/blocks/group-manager-block/group-manager-block.component';
import { InviteDialogComponent } from './helpers/invite-dialog/invite-dialog.component';
import { DocumentPath } from './helpers/document-path/document-path.component';
import { CommonPropertyComponent } from './policy-configuration/common-property/common-property.component';
import { MultiSignBlockComponent } from './policy-viewer/blocks/multi-sign-block/multi-sign-block.component';
import { SelectBlock } from './helpers/select-block/select-block.component';
import { CreateTokenBlockComponent } from './policy-viewer/blocks/create-token-block/create-token-block.component';
import { CreateTokenConfigComponent } from './policy-configuration/blocks/tokens/create-token-config/create-token-config.component';
import { TokenConfigurationComponent } from '../components/token-configuration/token-configuration.component';
import { MultiPolicyDialogComponent } from './helpers/multi-policy-dialog/multi-policy-dialog.component';
import { ComparePolicyDialog } from './helpers/compare-policy-dialog/compare-policy-dialog.component';
import { HttpRequestConfigComponent } from './policy-configuration/blocks/main/http-request-config/http-request-config.component';
import { PolicyTreeComponent } from './policy-configuration/policy-tree/policy-tree.component';
import { ModulePropertiesComponent } from './policy-configuration/module-properties/module-properties.component';
import { RegisteredService } from './registered-service/registered.service';

@NgModule({
    declarations: [
        PoliciesComponent,
        PolicyConfigurationComponent,
        DocumentSourceComponent,
        CommonPropertiesComponent,
        ActionConfigComponent,
        ContainerConfigComponent,
        RequestConfigComponent,
        PolicyPropertiesComponent,
        MintConfigComponent,
        SendConfigComponent,
        ExternalDataConfigComponent,
        AggregateConfigComponent,
        InformationConfigComponent,
        RolesConfigComponent,
        FiltersAddonConfigComponent,
        SourceAddonConfigComponent,
        ActionBlockComponent,
        RequestDocumentBlockComponent,
        ContainerBlockComponent,
        DocumentsSourceBlockComponent,
        PolicyViewerComponent,
        RenderBlockComponent,
        DialogBlock,
        DocumentDialogBlock,
        InformationBlockComponent,
        StepBlockComponent,
        RolesBlockComponent,
        PaginationAddonBlockComponent,
        FiltersAddonBlockComponent,
        HelpIcon,
        SavePolicyDialog,
        ImportPolicyDialog,
        PreviewPolicyDialog,
        ExportPolicyDialog,
        CalculateConfigComponent,
        CalculateMathConfigComponent,
        JsonPropertiesComponent,
        ReportBlockComponent,
        ReportItemConfigComponent,
        ReassigningConfigComponent,
        CronConfigDialog,
        TimerConfigComponent,
        CustomLogicConfigComponent,
        CodeEditorDialogComponent,
        SwitchConfigComponent,
        HttpRequestConfigComponent,
        ConfirmationDialog,
        RevokeConfigComponent,
        ButtonConfigComponent,
        ButtonBlockComponent,
        TokenActionConfigComponent,
        DocumentValidatorConfigComponent,
        TokenConfirmationConfigComponent,
        TokenConfirmationBlockComponent,
        SaveBeforeDialogComponent,
        GroupManagerConfigComponent,
        GroupManagerBlockComponent,
        InviteDialogComponent,
        DocumentPath,
        CommonPropertyComponent,
        MultiSignBlockComponent,
        SelectBlock,
        CreateTokenConfigComponent,
        CreateTokenBlockComponent,
        TokenConfigurationComponent,
        MultiPolicyDialogComponent,
        ComparePolicyDialog,
        PolicyTreeComponent,
        ModulePropertiesComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        CommonComponentsModule,
        CodemirrorModule,
        MaterialModule,
        SchemaEngineModule,
        AppRoutingModule,
        DragDropModule
    ],
    exports: [
        PoliciesComponent,
        ButtonBlockComponent,
        ButtonConfigComponent,
        RevokeConfigComponent,
        PolicyConfigurationComponent,
        DocumentSourceComponent,
        CommonPropertiesComponent,
        ActionConfigComponent,
        ContainerConfigComponent,
        RequestConfigComponent,
        PolicyPropertiesComponent,
        MintConfigComponent,
        SendConfigComponent,
        ExternalDataConfigComponent,
        AggregateConfigComponent,
        InformationConfigComponent,
        RolesConfigComponent,
        FiltersAddonConfigComponent,
        SourceAddonConfigComponent,
        ActionBlockComponent,
        RequestDocumentBlockComponent,
        ContainerBlockComponent,
        DocumentsSourceBlockComponent,
        PolicyViewerComponent,
        RenderBlockComponent,
        DialogBlock,
        DocumentDialogBlock,
        InformationBlockComponent,
        StepBlockComponent,
        RolesBlockComponent,
        FiltersAddonBlockComponent,
        HelpIcon,
        SavePolicyDialog,
        SchemaEngineModule,
        PreviewPolicyDialog,
        ExportPolicyDialog,
        CalculateConfigComponent,
        CalculateMathConfigComponent,
        JsonPropertiesComponent,
        ReassigningConfigComponent,
        CronConfigDialog,
        TokenActionConfigComponent,
        DocumentValidatorConfigComponent,
        TokenConfirmationConfigComponent,
        TokenConfirmationBlockComponent,
        GroupManagerConfigComponent,
        GroupManagerBlockComponent,
        InviteDialogComponent,
        TokenConfigurationComponent
    ],
    providers: [
        RegisteredService
    ]
})
export class PolicyEngineModule { }

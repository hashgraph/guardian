import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MaterialModule } from 'src/app/modules/common/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
//Modules
import { SchemaEngineModule } from '../schema-engine/schema-engine.module';
import { CommonComponentsModule } from '../common/common-components.module';
import { TagEngineModule } from '../tag-engine/tag-engine.module';
import { ArtifactEngineModule } from '../artifact-engine/artifact-engine.module';
import { CompareModule } from '../analytics/analytics.module';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { PaginatorModule } from 'primeng/paginator';
//Configuration
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
import { CalculateConfigComponent } from './policy-configuration/blocks/calculate/calculate-config/calculate-config.component';
import { CalculateMathConfigComponent } from './policy-configuration/blocks/calculate/calculate-math-config/calculate-math-config.component';
import { JsonPropertiesComponent } from './policy-configuration/json-properties/json-properties.component';
import { ReassigningConfigComponent } from './policy-configuration/blocks/documents/reassigning-config/reassigning-config.component';
import { ReportItemConfigComponent } from './policy-configuration/blocks/report/report-item-config/report-item-config.component';
import { TimerConfigComponent } from './policy-configuration/blocks/documents/timer-config/timer-config.component';
import { CustomLogicConfigComponent } from './policy-configuration/blocks/calculate/custom-logic-config/custom-logic-config.component';
import { RevokeConfigComponent } from './policy-configuration/blocks/documents/revoke-config/revoke-config.component';
import { ButtonConfigComponent } from './policy-configuration/blocks/main/button-config/button-config.component';
import { TokenActionConfigComponent } from './policy-configuration/blocks/tokens/token-action-config/token-action-config.component';
import { DocumentValidatorConfigComponent } from './policy-configuration/blocks/documents/document-validator-config/document-validator-config.component';
import { TokenConfirmationConfigComponent } from './policy-configuration/blocks/tokens/token-confirmation-config/token-confirmation-config.component';
import { HttpRequestConfigComponent } from './policy-configuration/blocks/main/http-request-config/http-request-config.component';
import { PolicyTreeComponent } from './policy-configuration/policy-tree/policy-tree.component';
import { ModulePropertiesComponent } from './policy-configuration/module-properties/module-properties.component';
import { ModuleComponent } from './policy-configuration/blocks/module/module.component';
import { ToolComponent } from "./policy-configuration/blocks/tool/tool.component";
import { CreateTokenConfigComponent } from './policy-configuration/blocks/tokens/create-token-config/create-token-config.component';
import { SwitchConfigComponent } from './policy-configuration/blocks/main/switch-config/switch-config.component';
import { CommonPropertyComponent } from './policy-configuration/common-property/common-property.component';
import { GroupManagerConfigComponent } from './policy-configuration/blocks/main/group-manager-config/group-manager-config.component';
import { PolicySettingsComponent } from './policy-configuration/policy-settings/policy-settings.component';
import { ButtonBlockAddonComponent } from './policy-viewer/blocks/button-block-addon/button-block-addon.component';
import { DropdownBlockAddonComponent } from './policy-viewer/blocks/dropdown-block-addon/dropdown-block-addon.component';
import { RequestAddonConfigComponent } from './policy-configuration/blocks/documents/request-addon-config/request-addon-config.component';
import { RequestDocumentBlockAddonComponent } from './policy-viewer/blocks/request-document-block-addon/request-document-block-addon.component';
//Viewer
import { DialogBlock } from './policy-viewer/dialog-block/dialog-block.component';
import { PolicyViewerComponent } from './policy-viewer/policy-viewer/policy-viewer.component';
import { RequestDocumentBlockComponent } from './policy-viewer/blocks/request-document-block/request-document-block.component';
import { DocumentsSourceBlockComponent } from './policy-viewer/blocks/documents-source-block/documents-source-block.component';
import { ContainerBlockComponent } from './policy-viewer/blocks/container-block/container-block.component';
import { InformationBlockComponent } from './policy-viewer/blocks/information-block/information-block.component';
import { RenderBlockComponent } from './policy-viewer/render-block/render-block.component';
import { ActionBlockComponent } from './policy-viewer/blocks/action-block/action-block.component';
import { DocumentDialogBlock } from './policy-viewer/blocks/document-dialog-block/document-dialog-block.component';
import { StepBlockComponent } from './policy-viewer/blocks/step-block/step-block.component';
import { RolesBlockComponent } from './policy-viewer/blocks/roles-block/roles-block.component';
import { FiltersAddonBlockComponent } from './policy-viewer/blocks/filters-addon-block/filters-addon-block.component';
import { ReportBlockComponent } from './policy-viewer/blocks/report-block/report-block.component';
import { PaginationAddonBlockComponent } from './policy-viewer/blocks/pagination-addon-block/pagination-addon-block.component';
import { ConfirmationDialog } from './policy-viewer/blocks/confirmation-dialog/confirmation-dialog.component';
import { ButtonBlockComponent } from './policy-viewer/blocks/button-block/button-block.component';
import { GroupManagerBlockComponent } from './policy-viewer/blocks/group-manager-block/group-manager-block.component';
import { TokenConfirmationBlockComponent } from './policy-viewer/blocks/token-confirmation-block/token-confirmation-block.component';
import { MultiSignBlockComponent } from './policy-viewer/blocks/multi-sign-block/multi-sign-block.component';
import { CreateTokenBlockComponent } from './policy-viewer/blocks/create-token-block/create-token-block.component';
import { TagsManagerBlockComponent } from './policy-viewer/blocks/tags-manager-block/tags-manager-block.component';
import { MessagesReportBlockComponent } from './policy-viewer/blocks/messages-report-block/messages-report-block.component';
import { ExternalTopicBlockComponent } from './policy-viewer/blocks/external-topic-block/external-topic-block.component';
import { UploadDocumentBlockComponent } from './policy-viewer/blocks/upload-document-block/upload-document-block.component';
import { GlobalTopicReaderBlockComponent } from "./policy-viewer/blocks/global-topic-reader-block/global-topic-reader-block.component";
//Helpers
import { HelpIcon } from './helpers/help-icon/help-icon.component';
import { SavePolicyDialog } from './dialogs/save-policy-dialog/save-policy-dialog.component';
import { PreviewPolicyDialog } from './dialogs/preview-policy-dialog/preview-policy-dialog.component';
import { ReplaceSchemasDialogComponent } from './dialogs/replace-schemas-dialog/replace-schemas-dialog.component';
import { ExportPolicyDialog } from './dialogs/export-policy-dialog/export-policy-dialog.component';
import { CronConfigDialog } from './dialogs/cron-config-dialog/cron-config-dialog.component';
import { CodeEditorDialogComponent } from './dialogs/code-editor-dialog/code-editor-dialog.component';
import { InviteDialogComponent } from './dialogs/invite-dialog/invite-dialog.component';
import { DocumentPath } from './helpers/document-path/document-path.component';
import { SelectBlock } from './helpers/select-block/select-block.component';
import { MultiPolicyDialogComponent } from './dialogs/multi-policy-dialog/multi-policy-dialog.component';
import { ComparePolicyDialog } from './dialogs/compare-policy-dialog/compare-policy-dialog.component';
import { NewModuleDialog } from './dialogs/new-module-dialog/new-module-dialog.component';
import { PolicyWizardDialogComponent } from './dialogs/policy-wizard-dialog/policy-wizard-dialog.component';
import { NewPolicyDialog } from './dialogs/new-policy-dialog/new-policy-dialog.component';
import { NewThemeDialog } from './dialogs/new-theme-dialog/new-theme-dialog.component';
import { ViewerDialog } from './dialogs/viewer-dialog/viewer-dialog.component';
import { CompareModulesDialogComponent } from './dialogs/compare-modules-dialog/compare-modules-dialog.component';
import { RecordControllerComponent } from './record/record-controller/record-controller.component';
import { RecordResultDialog } from './record/record-result-dialog/record-result-dialog.component';
import { RecordResultsComponent } from './record/record-results/record-results.component';
import { TestResultsComponent } from './record/test-results/test-results.component';
import { SearchBlocksComponent } from './helpers/search-blocks/search-blocks.component';
import { SelectSchema } from './helpers/select-schema/select-schema.component';
import { PolicyTestResult } from './helpers/policy-test-result/policy-test-result.component';
import { PublishPolicyDialog } from './dialogs/publish-policy-dialog/publish-policy-dialog.component';
import { SearchToolDialog } from './dialogs/search-tool-dialog/search-tool-dialog.component';
//Modules
import { ModulesListComponent } from './modules-list/modules-list.component';
import { ToolsListComponent } from './tools-list/tools-list.component';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CalendarModule } from 'primeng/calendar';
import { StepsModule } from 'primeng/steps';
import { CheckboxModule } from 'primeng/checkbox';
//Services
import { RegisteredService } from './services/registered.service';
import { WizardService } from './services/wizard.service';
//Policies Grid
import { PoliciesComponent } from './policies/policies.component';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { TabMenuModule } from 'primeng/tabmenu';
import { TooltipModule } from 'primeng/tooltip';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TabViewModule } from 'primeng/tabview';
import { DialogModule } from 'primeng/dialog';
import { DeleteDialogComponent } from './dialogs/delete-dialog/delete-dialog.component';
import { ProgressTrackerComponent } from './policy-viewer/progress-tracker/progress-tracker.component';
import { PolicyProgressService } from './services/policy-progress.service';
import { InputSwitchModule } from 'primeng/inputswitch';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RadioButtonModule } from 'primeng/radiobutton';
import { PasswordModule } from 'primeng/password';
// Directives
import { ResizingDirective } from './directives/resizing.directive';
import { CONFIGURATION_ERRORS } from './injectors/configuration.errors.injector';
// Dialogs
import { DiscontinuePolicy } from './dialogs/discontinue-policy/discontinue-policy.component';
import { MigrateData } from './dialogs/migrate-data/migrate-data.component';
import { JsonEditorDialogComponent } from './dialogs/json-editor-dialog/json-editor-dialog.component';
import { PolicyTestDialog } from './dialogs/policy-test-dialog/policy-test-dialog.component';
import { NewImportFileDialog } from './dialogs/new-import-file-dialog/new-import-file-dialog.component';
import { RequestDocumentBlockDialog } from './policy-viewer/blocks/request-document-block/dialog/request-document-block-dialog.component';
import { DataTransformationConfigComponent } from './policy-configuration/blocks/calculate/data-transformation-config/data-transformation-config.component';
import { ExternalPolicyComponent } from './external-policies/external-policies.component';
import { SearchExternalPolicyDialog } from './dialogs/search-external-policy-dialog/search-external-policy-dialog.component';
import { PolicyRequestsComponent } from './requests/requests.component';
import { TestCodeDialog } from './dialogs/test-code-dialog/test-code-dialog.component';
import { ProjectDataExportComponent } from './project-data-export/project-data-export.component';
import { TransformationButtonBlockComponent } from './policy-viewer/blocks/transformation-button-block/transformation-button-block.component';
import { IntegrationButtonBlockComponent } from './policy-viewer/blocks/integration-button-block/integration-button-block.component';
import { RestoreSavepointDialog } from './policy-viewer/dialogs/restore-savepoint-dialog/restore-savepoint-dialog.component';
import { AddSavepointDialog } from "./policy-viewer/dialogs/add-savepoint-dialog/add-savepoint-dialog.component";
import { OnLoadSavepointDialog } from "./policy-viewer/dialogs/on-load-savepoint-dialog/on-load-savepoint-dialog.component";
import { IgnoreRulesDialog } from "./dialogs/ignore-rules-dialog/ignore-rules-dialog.component";
import { PolicyRepositoryComponent } from './policy-repository/policy-repository.component';
import { WipeConfigComponent } from './policy-configuration/blocks/tokens/wipe-config/wipe-config.component';
import { PublishToolDialog } from './dialogs/publish-tool-dialog/publish-tool-dialog.component';
import { SaveToolDialog } from './dialogs/save-tool-dialog/save-tool-dialog.component';
import { UserPolicyDialog } from './dialogs/user-policy-dialog/user-policy-dialog.component';

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
        WipeConfigComponent,
        SendConfigComponent,
        ExternalDataConfigComponent,
        AggregateConfigComponent,
        InformationConfigComponent,
        RolesConfigComponent,
        FiltersAddonConfigComponent,
        SourceAddonConfigComponent,
        ActionBlockComponent,
        RequestDocumentBlockComponent,
        UploadDocumentBlockComponent,
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
        SaveToolDialog,
        PreviewPolicyDialog,
        ReplaceSchemasDialogComponent,
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
        TransformationButtonBlockComponent,
        IntegrationButtonBlockComponent,
        TokenActionConfigComponent,
        DocumentValidatorConfigComponent,
        TokenConfirmationConfigComponent,
        TokenConfirmationBlockComponent,
        GroupManagerConfigComponent,
        GroupManagerBlockComponent,
        InviteDialogComponent,
        DocumentPath,
        CommonPropertyComponent,
        MultiSignBlockComponent,
        SelectBlock,
        SelectSchema,
        PolicyTestResult,
        PublishPolicyDialog,
        PublishToolDialog,
        CreateTokenConfigComponent,
        CreateTokenBlockComponent,
        MultiPolicyDialogComponent,
        ComparePolicyDialog,
        CompareModulesDialogComponent,
        PolicyTreeComponent,
        ModulePropertiesComponent,
        ModuleComponent,
        ToolComponent,
        ModulesListComponent,
        ToolsListComponent,
        NewModuleDialog,
        TagsManagerBlockComponent,
        NewPolicyDialog,
        PolicySettingsComponent,
        NewThemeDialog,
        ExternalTopicBlockComponent,
        PolicyWizardDialogComponent,
        MessagesReportBlockComponent,
        ViewerDialog,
        SearchBlocksComponent,
        DeleteDialogComponent,
        ProgressTrackerComponent,
        RecordControllerComponent,
        RecordResultDialog,
        RecordResultsComponent,
        TestResultsComponent,
        ResizingDirective,
        DiscontinuePolicy,
        MigrateData,
        JsonEditorDialogComponent,
        PolicyTestDialog,
        NewImportFileDialog,
        ButtonBlockAddonComponent,
        DropdownBlockAddonComponent,
        RequestAddonConfigComponent,
        RequestDocumentBlockAddonComponent,
        RequestDocumentBlockDialog,
        DataTransformationConfigComponent,
        ProjectDataExportComponent,
        ExternalPolicyComponent,
        PolicyRequestsComponent,
        SearchExternalPolicyDialog,
        TestCodeDialog,
        SearchToolDialog,
        RestoreSavepointDialog,
        AddSavepointDialog,
        IgnoreRulesDialog,
        OnLoadSavepointDialog,
        PolicyRepositoryComponent,
        UserPolicyDialog,
        GlobalTopicReaderBlockComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
        CodemirrorModule,
        DragDropModule,
        CommonComponentsModule,
        SchemaEngineModule,
        ArtifactEngineModule,
        TagEngineModule,
        CompareModule,
        InputTextModule,
        TableModule,
        InputTextareaModule,
        ButtonModule,
        DropdownModule,
        MultiSelectModule,
        TableModule,
        DynamicDialogModule,
        TabMenuModule,
        TooltipModule,
        SplitButtonModule,
        TabViewModule,
        RadioButtonModule,
        PasswordModule,
        InputSwitchModule,
        AppRoutingModule,
        DialogModule,
        OverlayPanelModule,
        SelectButtonModule,
        CalendarModule,
        StepsModule,
        CheckboxModule,
        PaginatorModule,
        AngularSvgIconModule.forRoot(),
    ],
    exports: [],
    providers: [
        RegisteredService,
        WizardService,
        DialogService,
        PolicyProgressService,
        DatePipe,
        {
            provide: CONFIGURATION_ERRORS,
            useValue: new Map()
        }
    ],
})
export class PolicyEngineModule { }

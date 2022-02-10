import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { CommonPropertiesComponent } from './policy-configuration/common-properties/common-properties.component';
import { DocumentSourceComponent } from './policy-configuration/blocks/document-viewer-config/document-viewer-config.component';
import { ActionConfigComponent } from './policy-configuration/blocks/action-config/action-config.component';
import { PolicyConfigurationComponent } from './policy-configuration/policy-configuration/policy-configuration.component';
import { ContainerConfigComponent } from './policy-configuration/blocks/container-config/container-config.component';
import { RequestConfigComponent } from './policy-configuration/blocks/request-config/request-config.component';
import { PolicyPropertiesComponent } from './policy-configuration/policy-properties/policy-properties.component';
import { MintConfigComponent } from './policy-configuration/blocks/mint-config/mint-config.component';
import { SendConfigComponent } from './policy-configuration/blocks/send-config/send-config.component';
import { ExternalDataConfigComponent } from './policy-configuration/blocks/external-data-config/external-data-config.component';
import { AggregateConfigComponent } from './policy-configuration/blocks/aggregate-config/aggregate-config.component';
import { InformationConfigComponent } from './policy-configuration/blocks/information-config/information-config.component';
import { RolesConfigComponent } from './policy-configuration/blocks/roles-config/roles-config.component';
import { FiltersAddonConfigComponent } from './policy-configuration/blocks/filters-addon-config/filters-addon-config.component';
import { SourceAddonConfigComponent } from './policy-configuration/blocks/source-addon-config/source-addon-config.component';
import { TreeFlatOverview } from './helpers/tree-flat-overview/tree-flat-overview';
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
import { RegisteredBlocks } from './registered-blocks';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SavePolicyDialog } from './save-policy-dialog/save-policy-dialog.component';
import { ImportPolicyDialog } from './helpers/import-policy-dialog/import-policy-dialog.component';
import { PreviewPolicyDialog } from './helpers/preview-policy-dialog/preview-policy-dialog.component';
import { ExportPolicyDialog } from './helpers/export-policy-dialog/export-policy-dialog.component';

@NgModule({
    declarations: [
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
        TreeFlatOverview,
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
        ImportPolicyDialog,
        PreviewPolicyDialog,
        ExportPolicyDialog
    ],
    imports: [
        CommonModule,
        FormsModule,
        CodemirrorModule,
        MaterialModule,
        SchemaEngineModule,
        AppRoutingModule,
        DragDropModule,
        SchemaEngineModule
    ],
    exports: [
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
        TreeFlatOverview,
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
        ExportPolicyDialog
    ],
    providers: [
        RegisteredBlocks
    ]
})
export class PolicyEngineModule {
}

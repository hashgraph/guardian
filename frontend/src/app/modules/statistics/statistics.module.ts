import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/modules/common/material.module';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { SchemaEngineModule } from '../schema-engine/schema-engine.module';
import { CommonComponentsModule } from '../common/common-components.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { NewPolicyStatisticsDialog } from './policy-statistics/dialogs/new-policy-statistics-dialog/new-policy-statistics-dialog.component';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { MultiSelectModule } from 'primeng/multiselect';
import { ScoreDialog } from './policy-statistics/dialogs/score-dialog/score-dialog.component';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DragDropModule } from 'primeng/dragdrop';
import { TreeModule } from 'primeng/tree';
import { TreeDragDropService } from 'primeng/api';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { StatisticAssessmentConfigurationComponent } from './policy-statistics/statistic-assessment-configuration/statistic-assessment-configuration.component';
import { StatisticAssessmentViewComponent } from './policy-statistics/statistic-assessment-view/statistic-assessment-view.component';
import { StatisticAssessmentsComponent } from './policy-statistics/statistic-assessments/statistic-assessments.component';
import { StatisticDefinitionsComponent } from './policy-statistics/statistic-definitions/statistic-definitions.component';
import { StatisticDefinitionConfigurationComponent } from './policy-statistics/statistic-definition-configuration/statistic-definition-configuration.component';
import { StatisticPreviewDialog } from './policy-statistics/dialogs/statistic-preview-dialog/statistic-preview-dialog.component';
import { PolicyLabelsComponent } from './policy-labels/policy-labels/policy-labels.component';
import { PolicyLabelConfigurationComponent } from './policy-labels/policy-label-configuration/policy-label-configuration.component';
import { NewPolicyLabelDialog } from './policy-labels/dialogs/new-policy-label-dialog/new-policy-label-dialog.component';
import { PolicyLabelPreviewDialog } from './policy-labels/dialogs/policy-label-preview-dialog/policy-label-preview-dialog.component';
import { SchemaRulesComponent } from './schema-rules/schema-rules/schema-rules.component';
import { NewSchemaRuleDialog } from './schema-rules/dialogs/new-schema-rule-dialog/new-schema-rule-dialog.component';
import { SchemaRuleConfigurationComponent } from './schema-rules/schema-rule-configuration/schema-rule-configuration.component';
import { SchemaRulesPreviewDialog } from './schema-rules/dialogs/schema-rules-preview-dialog/schema-rules-preview-dialog.component';
import { SchemaRuleConfigDialog } from './schema-rules/dialogs/schema-rule-config-dialog/schema-rule-config-dialog.component';
import { SearchLabelDialog } from './policy-labels/dialogs/search-label-dialog/search-label-dialog.component';
import { PolicyLabelDocumentsComponent } from './policy-labels/policy-label-documents/policy-label-documents.component';
import { PolicyLabelDocumentViewComponent } from './policy-labels/policy-label-document-view/policy-label-document-view.component';
import { PolicyLabelDocumentConfigurationComponent } from './policy-labels/policy-label-document-configuration/policy-label-document-configuration.component';

@NgModule({
    declarations: [
        //policy-statistics
        NewPolicyStatisticsDialog,
        ScoreDialog,
        StatisticPreviewDialog,
        StatisticAssessmentConfigurationComponent,
        StatisticAssessmentViewComponent,
        StatisticAssessmentsComponent,
        StatisticDefinitionConfigurationComponent,
        StatisticDefinitionsComponent,
        //policy-labels
        PolicyLabelsComponent,
        PolicyLabelConfigurationComponent,
        PolicyLabelDocumentsComponent,
        PolicyLabelDocumentConfigurationComponent,
        PolicyLabelDocumentViewComponent,
        NewPolicyLabelDialog,
        PolicyLabelPreviewDialog,
        SearchLabelDialog,
        //schema-rules
        SchemaRulesComponent,
        SchemaRuleConfigurationComponent,
        NewSchemaRuleDialog,
        SchemaRulesPreviewDialog,
        SchemaRuleConfigDialog
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        CommonComponentsModule,
        SchemaEngineModule,
        AppRoutingModule,
        DynamicDialogModule,
        TableModule,
        TooltipModule,
        InputTextModule,
        DropdownModule,
        TabViewModule,
        CheckboxModule,
        RadioButtonModule,
        CodemirrorModule,
        MultiSelectModule,
        OverlayPanelModule,
        DragDropModule,
        TreeModule,
        TieredMenuModule,
        AngularSvgIconModule.forRoot(),
    ],
    exports: [],
    providers: [
        DialogService,
        TreeDragDropService
    ],
})
export class StatisticsModule { }

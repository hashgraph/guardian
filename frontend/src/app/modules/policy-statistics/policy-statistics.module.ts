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
import { NewPolicyStatisticsDialog } from './dialogs/new-policy-statistics-dialog/new-policy-statistics-dialog.component';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { MultiSelectModule } from 'primeng/multiselect';
import { ScoreDialog } from './dialogs/score-dialog/score-dialog.component';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { StatisticAssessmentConfigurationComponent } from './statistic-assessment-configuration/statistic-assessment-configuration.component';
import { StatisticAssessmentViewComponent } from './statistic-assessment-view/statistic-assessment-view.component';
import { StatisticAssessmentsComponent } from './statistic-assessments/statistic-assessments.component';
import { StatisticDefinitionsComponent } from './statistic-definitions/statistic-definitions.component';
import { StatisticDefinitionConfigurationComponent } from './statistic-definition-configuration/statistic-definition-configuration.component';
import { StatisticPreviewDialog } from './dialogs/statistic-preview-dialog/statistic-preview-dialog.component';

@NgModule({
    declarations: [
        NewPolicyStatisticsDialog,
        ScoreDialog,
        StatisticPreviewDialog,
        StatisticAssessmentConfigurationComponent,
        StatisticAssessmentViewComponent,
        StatisticAssessmentsComponent,
        StatisticDefinitionConfigurationComponent,
        StatisticDefinitionsComponent
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
        AngularSvgIconModule.forRoot(),
    ],
    exports: [],
    providers: [
        DialogService
    ],
})
export class PolicyStatisticsModule { }

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
import { PolicyStatisticsComponent } from './policy-statistics/policy-statistics.component';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { NewPolicyStatisticsDialog } from './dialogs/new-policy-statistics-dialog/new-policy-statistics-dialog.component';
import { PolicyStatisticsConfigurationComponent } from './policy-statistics-configuration/policy-statistics-configuration.component';
import { TreeGraphComponent } from './tree-graph/tree-graph.component';

@NgModule({
    declarations: [
        PolicyStatisticsComponent,
        PolicyStatisticsConfigurationComponent,
        NewPolicyStatisticsDialog,
        TreeGraphComponent
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
        AngularSvgIconModule.forRoot(),
    ],
    exports: [],
    providers: [
        DialogService
    ],
})
export class PolicyStatisticsModule { }

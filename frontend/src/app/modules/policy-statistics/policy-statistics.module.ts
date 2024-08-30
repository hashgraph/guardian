import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/modules/common/material.module';
import { FormsModule } from '@angular/forms';
//Modules
import { AppRoutingModule } from 'src/app/app-routing.module';
import { SchemaEngineModule } from '../schema-engine/schema-engine.module';
import { CommonComponentsModule } from '../common/common-components.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { PolicyStatisticsComponent } from './policy-statistics/policy-statistics.component';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

@NgModule({
    declarations: [
        PolicyStatisticsComponent
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
        AngularSvgIconModule.forRoot(),
    ],
    exports: [],
    providers: [
        DialogService
    ],
})
export class PolicyStatisticsModule { }

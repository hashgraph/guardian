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
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SchemaRulesComponent } from './schema-rules/schema-rules.component';
import { NewSchemaRuleDialog } from './dialogs/new-schema-rule-dialog/new-schema-rule-dialog.component';
import { SchemaRuleConfigurationComponent } from './schema-rule-configuration/schema-rule-configuration.component';

@NgModule({
    declarations: [
        SchemaRulesComponent,
        SchemaRuleConfigurationComponent,
        NewSchemaRuleDialog
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
export class SchemaRulesModule { }

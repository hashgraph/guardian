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
import { SchemaRuleConfigDialog } from './dialogs/schema-rule-config-dialog/schema-rule-config-dialog.component';
import { PolicyLabelsComponent } from './policy-labels/policy-labels.component';
import { PolicyLabelConfigurationComponent } from './policy-label-configuration/policy-label-configuration.component';
import { NewPolicyLabelDialog } from './dialogs/new-policy-label-dialog/new-policy-label-dialog.component';
import { PolicyLabelPreviewDialog } from './dialogs/policy-label-preview-dialog/policy-label-preview-dialog.component';
import { DragDropModule } from 'primeng/dragdrop';
import { TreeModule } from 'primeng/tree';
import { TreeDragDropService } from 'primeng/api';

@NgModule({
    declarations: [
        PolicyLabelsComponent,
        PolicyLabelConfigurationComponent,
        NewPolicyLabelDialog,
        PolicyLabelPreviewDialog,
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
        AngularSvgIconModule.forRoot(),
    ],
    exports: [],
    providers: [
        DialogService,
        TreeDragDropService
    ],
})
export class PolicyLabelsModule { }

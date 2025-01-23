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
import { DragDropModule } from 'primeng/dragdrop';
import { TreeModule } from 'primeng/tree';
import { TreeDragDropService } from 'primeng/api';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { LinkDialog } from './dialogs/link-dialog/link-dialog.component';
import { FormulasComponent } from './formulas/formulas.component';
import { FormulaConfigurationComponent } from './formula-configuration/formula-configuration.component';
import { NewFormulaDialog } from './dialogs/new-formula-dialog/new-formula-dialog.component';

@NgModule({
    declarations: [
        FormulasComponent,
        FormulaConfigurationComponent,
        NewFormulaDialog,
        LinkDialog
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
export class FormulasModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DragDropModule } from 'primeng/dragdrop';
import { TreeModule } from 'primeng/tree';
import { TreeDragDropService } from 'primeng/api';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { MaterialModule } from 'src/app/modules/common/material.module';
import { CommonComponentsModule } from '../common/common-components.module';
import { LinkDialog } from './dialogs/link-dialog/link-dialog.component';
import { FormulasComponent } from './formulas/formulas.component';
import { FormulaConfigurationComponent } from './formula-configuration/formula-configuration.component';
import { NewFormulaDialog } from './dialogs/new-formula-dialog/new-formula-dialog.component';
import { FormulasViewDialog } from './dialogs/formulas-view-dialog/formulas-view-dialog.component';
import { UploadFormulaFileDialog } from './dialogs/upload-formula-file-dialog/upload-formula-file-dialog.component';
import { FormulasGraphTabComponent } from "./dialogs/formulas-view-dialog/formulas-graph-tab/formulas-graph-tab.component";

@NgModule({
    declarations: [
        FormulasComponent,
        FormulaConfigurationComponent,
        NewFormulaDialog,
        LinkDialog,
        FormulasViewDialog,
        UploadFormulaFileDialog,
        FormulasGraphTabComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        CommonComponentsModule,
        AppRoutingModule,
        DynamicDialogModule,
        TableModule,
        TooltipModule,
        InputTextModule,
        DropdownModule,
        TabViewModule,
        CheckboxModule,
        RadioButtonModule,
        MultiSelectModule,
        OverlayPanelModule,
        DragDropModule,
        TreeModule,
        TieredMenuModule,
        AngularSvgIconModule.forRoot(),
    ],
    exports: [
        FormulasViewDialog
    ],
    providers: [
        DialogService,
        TreeDragDropService
    ],
})
export class FormulasModule { }

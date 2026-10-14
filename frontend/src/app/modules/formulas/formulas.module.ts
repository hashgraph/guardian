import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { GuardianDialogService } from '../../services/guardian-dialog.service';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { PopoverModule } from 'primeng/popover';
import { Textarea as InputTextareaModule } from 'primeng/textarea';
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
import { FormulaFilesDialog } from './dialogs/formula-files-dialog/formula-files-dialog.component';
import { FieldFormulasComponent } from './field-formulas/field-formulas.component';
import { LatexMarkupDirective } from './latex-markup.directive';
import { TruncateTooltipDirective } from './truncate-tooltip.directive';
import { FormulasGraphTabComponent } from "./dialogs/formulas-view-dialog/formulas-graph-tab/formulas-graph-tab.component";

@NgModule({
    declarations: [
        FormulasComponent,
        FormulaConfigurationComponent,
        NewFormulaDialog,
        LinkDialog,
        FormulasViewDialog,
        UploadFormulaFileDialog,
        FormulaFilesDialog,
        FormulasGraphTabComponent,
        FieldFormulasComponent,
        LatexMarkupDirective,
        TruncateTooltipDirective,
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
        InputTextareaModule,
        SelectModule,
        ButtonModule,
        TabsModule,
        CheckboxModule,
        RadioButtonModule,
        MultiSelectModule,
        PopoverModule,
        DragDropModule,
        TreeModule,
        TieredMenuModule,
        AngularSvgIconModule.forRoot(),
    ],
    exports: [
        FormulasViewDialog,
        FieldFormulasComponent,
        LatexMarkupDirective
    ],
    providers: [
        { provide: DialogService, useClass: GuardianDialogService },
        TreeDragDropService
    ],
})
export class FormulasModule { }

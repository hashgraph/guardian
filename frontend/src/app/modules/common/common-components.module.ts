import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxMatDatetimePickerModule } from '@angular-material-components/datetime-picker';
import { MaterialModule } from './material.module';
import { DatetimePicker } from './datetime-picker/datetime-picker.component';
import { HederaExplorer } from './hedera-explorer/hedera-explorer.component';
import { SelectMenuButton } from './select-menu/select-menu.component';
import { AsyncProgressComponent } from './async-progress/async-progress.component';
import { SwitchButton } from './switch-button/switch-button.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { FileDragNDropComponent } from './file-drag-n-drop/file-drag-n-drop.component';
import { IconPreviewDialog } from './icon-preview-dialog/icon-preview-dialog.component';
import { TokenConfigurationComponent } from './token-configuration/token-configuration.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { FileExplorer } from './file-explorer/file-explorer.component';
import { NgxColorsModule } from 'ngx-colors';
import { ConfirmDialog } from './confirm-dialog/confirm-dialog.component';
import { SelectorDialogComponent } from './selector-dialog/selector-dialog.component';
import { StepTreeComponent } from './step-tree/step-tree.component';
import { SeparateStepperComponent } from './separate-stepper/separate-stepper.component';
import { NgxMaskModule } from 'ngx-mask';
import { NewVersionsComponent } from './new-versions/new-versions.component';
import { DataInputDialogComponent } from './data-input-dialog/data-input-dialog.component';
import { CompareBtnComponent } from './compare-btn/compare-btn.component';
import { CompareViewerComponent } from './compare-viewer/compare-viewer.component';
import { AlertComponent } from './alert/alert.component';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { PaginatorComponent } from './paginator/paginator.component';
import { AngularSvgIconModule } from 'angular-svg-icon';

@NgModule({
    declarations: [
        DatetimePicker,
        HederaExplorer,
        SelectMenuButton,
        AsyncProgressComponent,
        SwitchButton,
        ConfirmationDialogComponent,
        FileDragNDropComponent,
        IconPreviewDialog,
        TokenConfigurationComponent,
        FileExplorer,
        ConfirmDialog,
        SelectorDialogComponent,
        StepTreeComponent,
        SeparateStepperComponent,
        NewVersionsComponent,
        DataInputDialogComponent,
        CompareBtnComponent,
        CompareViewerComponent,
        AlertComponent,
        PaginatorComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        NgxMatDatetimePickerModule,
        NgxFileDropModule,
        NgxColorsModule,
        NgxMaskModule.forRoot(),
        DialogModule,
        InputTextModule,
        DropdownModule,
        ProgressBarModule,
        ButtonModule,
        AngularSvgIconModule.forRoot()
    ],
    exports: [
        DatetimePicker,
        HederaExplorer,
        SelectMenuButton,
        SwitchButton,
        AsyncProgressComponent,
        ConfirmationDialogComponent,
        FileDragNDropComponent,
        IconPreviewDialog,
        TokenConfigurationComponent,
        FileExplorer,
        ConfirmDialog,
        NgxColorsModule,
        SelectorDialogComponent,
        SeparateStepperComponent,
        NgxMaskModule,
        NewVersionsComponent,
        CompareBtnComponent,
        CompareViewerComponent,
        PaginatorComponent,
        DataInputDialogComponent
    ]
})
export class CommonComponentsModule { }

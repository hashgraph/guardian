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
import { TokenDialog } from './token-dialog/token-dialog.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { FileExplorer } from './file-explorer/file-explorer.component';
import { NgxColorsModule } from 'ngx-colors';
import { ConfirmDialog } from './confirm-dialog/confirm-dialog.component';
import { SelectorDialogComponent } from './selector-dialog/selector-dialog.component';
import { StepTreeComponent } from './step-tree/step-tree.component';
import { SeparateStepperComponent } from './separate-stepper/separate-stepper.component';

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
        TokenDialog,
        FileExplorer,
        ConfirmDialog,
        SelectorDialogComponent,
        StepTreeComponent,
        SeparateStepperComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        NgxMatDatetimePickerModule,
        NgxFileDropModule,
        NgxColorsModule
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
        TokenDialog,
        FileExplorer,
        ConfirmDialog,
        NgxColorsModule,
        SelectorDialogComponent,
        SeparateStepperComponent
    ]
})
export class CommonComponentsModule { }

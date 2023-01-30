import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material.module';
import { DatetimePicker } from './components/datetime-picker/datetime-picker.component';
import { HederaExplorer } from './components/hedera-explorer/hedera-explorer.component';
import { NgxMatDateFormats, NgxMatDatetimePickerModule, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { SelectMenuButton } from './components/select-menu/select-menu.component';
import { AsyncProgressComponent } from './components/async-progress/async-progress.component';
import { SwitchButton } from './components/switch-button/switch-button.component';
import { FormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        DatetimePicker,
        HederaExplorer,
        SelectMenuButton,
        AsyncProgressComponent,
        SwitchButton
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        NgxMatDatetimePickerModule
    ],
    exports: [
        DatetimePicker,
        HederaExplorer,
        SelectMenuButton,
        SwitchButton,
        AsyncProgressComponent
    ]
})
export class CommonComponentsModule { }

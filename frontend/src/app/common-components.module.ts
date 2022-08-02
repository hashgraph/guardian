import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material.module';
import { DatetimePicker } from './components/datetime-picker/datetime-picker.component';
import { Dragonglass } from './components/dragonglass/dragonglass.component';
import { NgxMatDateFormats, NgxMatDatetimePickerModule, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { SelectMenuButton } from './components/select-menu/select-menu.component';

@NgModule({
    declarations: [
        DatetimePicker,
        Dragonglass,
        SelectMenuButton
    ],
    imports: [
        CommonModule,
        MaterialModule,
        NgxMatDatetimePickerModule
    ],
    exports: [
        DatetimePicker,
        Dragonglass,
        SelectMenuButton
    ]
})
export class CommonComponentsModule { }
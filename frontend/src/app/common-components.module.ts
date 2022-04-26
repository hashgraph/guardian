import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material.module';
import { DatetimePicker } from './components/datetime-picker/datetime-picker.component';
import { Dragonglass } from './components/dragonglass/dragonglass.component';
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';


@NgModule({
    declarations: [
        DatetimePicker,
        Dragonglass
    ],
    imports: [
        CommonModule,
        MaterialModule,
        NgxMatDatetimePickerModule
    ],
    exports: [
        DatetimePicker,
        Dragonglass
    ]
})
export class CommonComponentsModule { }
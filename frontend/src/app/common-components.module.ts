import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material.module';
import { DatetimePicker } from './components/datetime-picker/datetime-picker.component';
import { Dragonglass } from './components/dragonglass/dragonglass.component';
import { NgxMatDateFormats, NgxMatDatetimePickerModule, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { AsyncProgessComponent } from './components/async-progess/async-progess.component';

@NgModule({
    declarations: [
        DatetimePicker,
        Dragonglass,
        AsyncProgessComponent
    ],
    imports: [
        CommonModule,
        MaterialModule,
        NgxMatDatetimePickerModule
    ],
    exports: [
        DatetimePicker,
        Dragonglass,
        AsyncProgessComponent
    ]
})
export class CommonComponentsModule { }
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateTimeComponent } from './date-time/date-time.component';
import { EnumComponent } from './enum/enum';
import { InputComponent } from './input/input';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule, } from '@angular-material-components/datetime-picker';
import { MaterialModule } from '../../../common/material.module';
import { CommonComponentsModule } from '../../../common/common-components.module';
import { ArtifactEngineModule } from '../../../artifact-engine/artifact-engine.module';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

NgModule({
    declarations: [
        DateTimeComponent,
        EnumComponent,
        InputComponent
    ],
    exports: [
        DateTimeComponent,
        EnumComponent,
        InputComponent
    ],
    imports: [
        CommonComponentsModule,
        CodemirrorModule,
        ArtifactEngineModule,
        MaterialModule,
        NgxMatDatetimePickerModule,
        NgxMatNativeDateModule,
        NgxMatTimepickerModule,
        InputTextModule,
        FormsModule,
        CalendarModule,
        InputTextareaModule,
        CheckboxModule,
        DropdownModule,
        InputNumberModule
    ]
})

export class ControlsModule{
}

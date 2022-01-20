import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { SchemaDialog } from './schema-dialog/schema-dialog.component';
import { SchemaFormComponent } from './schema-form/schema-form.component';
import { SchemaConfigurationComponent } from './schema-configuration/schema-configuration.component';
import { ImportSchemaDialog } from './import-schema/import-schema-dialog.component';
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';

@NgModule({
    declarations: [
        SchemaDialog,
        SchemaFormComponent,
        SchemaConfigurationComponent,
        ImportSchemaDialog
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        NgxMatDatetimePickerModule,
        NgxMatNativeDateModule,
        NgxMatTimepickerModule,
    ],
    exports: [
        SchemaDialog,
        SchemaFormComponent,
        SchemaConfigurationComponent,
        ImportSchemaDialog
    ]
})
export class SchemaEngineModule {
}

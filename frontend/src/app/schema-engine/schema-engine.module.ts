import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { SchemaDialog } from './schema-dialog/schema-dialog.component';
import { SchemaFormComponent } from './schema-form/schema-form.component';
import { SchemaConfigurationComponent } from './schema-configuration/schema-configuration.component';
import { ImportSchemaDialog } from './import-schema/import-schema-dialog.component';
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { SchemaFormViewComponent } from './schema-form-view/schema-form-view.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { DocumentViewComponent } from './document-view/document-view.component';
import { SetVersionDialog } from './set-version-dialog/set-version-dialog.component';
import { VCViewerDialog } from './vc-dialog/vc-dialog.component';
import { SchemaViewDialog } from './schema-view-dialog/schema-view-dialog.component';
import { ExportSchemaDialog } from './export-schema-dialog/export-schema-dialog.component';

@NgModule({
    declarations: [
        SchemaDialog,
        SchemaFormComponent,
        SchemaConfigurationComponent,
        ImportSchemaDialog,
        SchemaFormViewComponent,
        DocumentViewComponent,
        SetVersionDialog,
        VCViewerDialog,
        SchemaViewDialog,
        ExportSchemaDialog
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        NgxMatDatetimePickerModule,
        NgxMatNativeDateModule,
        NgxMatTimepickerModule,
        ClipboardModule
    ],
    exports: [
        SchemaDialog,
        SchemaFormComponent,
        SchemaConfigurationComponent,
        ImportSchemaDialog,
        SchemaFormViewComponent,
        DocumentViewComponent,
        SetVersionDialog,
        VCViewerDialog,
        ExportSchemaDialog
    ]
})
export class SchemaEngineModule {
}

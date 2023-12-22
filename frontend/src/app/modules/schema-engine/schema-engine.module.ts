import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    NgxMatDatetimePickerModule,
    NgxMatNativeDateModule,
    NgxMatTimepickerModule,
} from '@angular-material-components/datetime-picker';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { GoogleMapsModule } from '@angular/google-maps';
import { GeojsonTypeComponent } from './geojson-type/geojson-type.component';
//Modules
import { MaterialModule } from '../common/material.module';
import { CommonComponentsModule } from '../common/common-components.module';
import { ArtifactEngineModule } from '../artifact-engine/artifact-engine.module';
//Components
import { SchemaDialog } from './schema-dialog/schema-dialog.component';
import { SchemaFormComponent } from './schema-form/schema-form.component';
import { SchemaConfigurationComponent } from './schema-configuration/schema-configuration.component';
import { ImportSchemaDialog } from './import-schema/import-schema-dialog.component';
import { SchemaFormViewComponent } from './schema-form-view/schema-form-view.component';
import { DocumentViewComponent } from './document-view/document-view.component';
import { SetVersionDialog } from './set-version-dialog/set-version-dialog.component';
import { VCViewerDialog } from './vc-dialog/vc-dialog.component';
import { SchemaViewDialog } from './schema-view-dialog/schema-view-dialog.component';
import { ExportSchemaDialog } from './export-schema-dialog/export-schema-dialog.component';
import { SchemaFieldConfigurationComponent } from './schema-field-configuration/schema-field-configuration.component';
import { EnumEditorDialog } from './enum-editor-dialog/enum-editor-dialog.component';
import { CompareSchemaDialog } from './compare-schema-dialog/compare-schema-dialog.component';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { DeleteSchemaDialogComponent } from './delete-schema-dialog/delete-schema-dialog.component';
import { ServiceUnavailableDialog } from './service-unavailable-dialog/service-unavailable-dialog.component';

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
        ExportSchemaDialog,
        SchemaFieldConfigurationComponent,
        EnumEditorDialog,
        CompareSchemaDialog,
        GeojsonTypeComponent,
        DeleteSchemaDialogComponent,
        ServiceUnavailableDialog
    ],
    imports: [
        CommonModule,
        FormsModule,
        CommonComponentsModule,
        MaterialModule,
        NgxMatDatetimePickerModule,
        NgxMatNativeDateModule,
        NgxMatTimepickerModule,
        ClipboardModule,
        CodemirrorModule,
        ArtifactEngineModule,
        GoogleMapsModule,
        ButtonModule,
        TabViewModule,
        InputTextModule,
        InputTextareaModule,
        CheckboxModule,
        DropdownModule,
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
        ExportSchemaDialog,
        SchemaFieldConfigurationComponent,
    ],
})
export class SchemaEngineModule {
}

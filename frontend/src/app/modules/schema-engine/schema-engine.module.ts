import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
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
import { GeoImageComponent } from './vc-dialog/components/geo-image.component';
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
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ServiceUnavailableDialog } from './service-unavailable-dialog/service-unavailable-dialog.component';
import { SchemaFormDialog } from './schema-form-dialog/schema-form-dialog.component';
import { SchemaTreeComponent } from './schema-tree/schema-tree.component';
import { CopySchemaDialog } from './copy-schema-dialog/copy-schema-dialog';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { SentinelHubTypeComponent } from './sentinel-hub-type/sentinel-hub-type.component';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AccordionModule } from 'primeng/accordion';
import { DateTimeComponent } from './schema-form/controls/date-time/date-time.component';
import { FormulasModule } from '../formulas/formulas.module';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaFormRootComponent } from './schema-form-root/schema-form-root.component';
import { UploadGeoDataDialog } from './upload-geo-data-dialog/upload-geo-data-dialog.component';

@NgModule({
    declarations: [
        SchemaDialog,
        SchemaFormComponent,
        CopySchemaDialog,
        SchemaConfigurationComponent,
        ImportSchemaDialog,
        SchemaFormViewComponent,
        DocumentViewComponent,
        SetVersionDialog,
        VCViewerDialog,
        GeoImageComponent,
        SchemaViewDialog,
        ExportSchemaDialog,
        SchemaFieldConfigurationComponent,
        EnumEditorDialog,
        CompareSchemaDialog,
        GeojsonTypeComponent,
        UploadGeoDataDialog,
        SentinelHubTypeComponent,
        ServiceUnavailableDialog,
        SchemaTreeComponent,
        SchemaFormDialog,
        DateTimeComponent,
        SchemaFormRootComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        CommonComponentsModule,
        MaterialModule,
        ClipboardModule,
        CodemirrorModule,
        ArtifactEngineModule,
        ButtonModule,
        TabViewModule,
        InputTextModule,
        InputTextareaModule,
        CheckboxModule,
        DropdownModule,
        CalendarModule,
        TooltipModule,
        RadioButtonModule,
        SelectButtonModule,
        AccordionModule,
        FormulasModule,
        AngularSvgIconModule.forRoot()
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
        GeoImageComponent,
        ExportSchemaDialog,
        SchemaFieldConfigurationComponent,
        SchemaFormDialog,
        SchemaFormRootComponent
    ],
    providers: [
        DialogService
    ],
})
export class SchemaEngineModule {
}

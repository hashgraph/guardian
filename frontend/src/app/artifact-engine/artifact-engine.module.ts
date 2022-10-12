import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ArtifactConfigComponent } from './artifact-config/artifact-config.component';
import { ArtifactImportDialog } from './artifact-import-dialog/artifact-import-dialog.component';
import { AppRoutingModule } from '../app-routing.module';
import { FileDragNDropComponent } from '../components/file-drag-n-drop/file-drag-n-drop.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { ArtifactPropertiesComponent } from './artifact-properties/artifact-properties.component';


@NgModule({
    declarations: [
        ArtifactConfigComponent,
        ArtifactImportDialog,
        FileDragNDropComponent,
        ArtifactPropertiesComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        AppRoutingModule,
        NgxFileDropModule
    ],
    exports: [
        ArtifactConfigComponent,
        ArtifactImportDialog,
        FileDragNDropComponent,
        ArtifactPropertiesComponent
    ]
})
export class ArtifactEngineModule { }

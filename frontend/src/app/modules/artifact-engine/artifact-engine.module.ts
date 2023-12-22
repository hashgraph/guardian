import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/modules/common/material.module';
import { FormsModule } from '@angular/forms';
import { ArtifactConfigComponent } from './artifact-config/artifact-config.component';
import { ArtifactImportDialog } from './artifact-import-dialog/artifact-import-dialog.component';
import { ArtifactPropertiesComponent } from './artifact-properties/artifact-properties.component';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { CommonComponentsModule } from '../common/common-components.module';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@NgModule({
    declarations: [
        ArtifactConfigComponent,
        ArtifactImportDialog,
        ArtifactPropertiesComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        CommonComponentsModule,
        AppRoutingModule,
        DropdownModule,
        ButtonModule,
        DialogModule
    ],
    exports: [
        ArtifactConfigComponent,
        ArtifactPropertiesComponent
    ]
})
export class ArtifactEngineModule { }

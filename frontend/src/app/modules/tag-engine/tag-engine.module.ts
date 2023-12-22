import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/modules/common/material.module';
import { FormsModule } from '@angular/forms';
import { TagsExplorer } from './tags-explorer/tags-explorer.component';
import { TagsExplorerDialog } from './tags-explorer-dialog/tags-explorer-dialog.component';
import { TagCreateDialog } from './tags-create-dialog/tags-create-dialog.component';
import { SchemaEngineModule } from '../schema-engine/schema-engine.module';
import { CommonComponentsModule } from '../common/common-components.module';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';

@NgModule({
    declarations: [TagsExplorer, TagsExplorerDialog, TagCreateDialog],
    imports: [
        CommonModule,
        FormsModule,
        CommonComponentsModule,
        MaterialModule,
        SchemaEngineModule,
        ButtonModule,
        DropdownModule,
    ],
    exports: [TagsExplorer, TagsExplorerDialog, TagCreateDialog],
})
export class TagEngineModule {
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from './material.module';
import { DatetimePicker } from './datetime-picker/datetime-picker.component';
import { HederaExplorer } from './hedera-explorer/hedera-explorer.component';
import { SelectMenuButton } from './select-menu/select-menu.component';
import { AsyncProgressComponent } from './async-progress/async-progress.component';
import { SwitchButton } from './switch-button/switch-button.component';
import { FileDragNDropComponent } from './file-drag-n-drop/file-drag-n-drop.component';
import { IconPreviewDialog } from './icon-preview-dialog/icon-preview-dialog.component';
import { TokenConfigurationComponent } from './token-configuration/token-configuration.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { FileExplorer } from './file-explorer/file-explorer.component';
import { NgxColorsModule } from 'ngx-colors';
import { ConfirmDialog } from './confirm-dialog/confirm-dialog.component';
import { SelectorDialogComponent } from './selector-dialog/selector-dialog.component';
import { StepTreeComponent } from './step-tree/step-tree.component';
import { SeparateStepperComponent } from './separate-stepper/separate-stepper.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { NewVersionsComponent } from './new-versions/new-versions.component';
import { DataInputDialogComponent } from './data-input-dialog/data-input-dialog.component';
import { CompareBtnComponent } from './compare-btn/compare-btn.component';
import { CompareViewerComponent } from './compare-viewer/compare-viewer.component';
import { AlertComponent } from './alert/alert.component';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { PaginatorComponent } from './paginator/paginator.component';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { StatusDropdown } from './status-dropdown/status-dropdown.component';
import { CustomConfirmDialogComponent } from './custom-confirm-dialog/custom-confirm-dialog.component';
import { TreeGraphComponent } from './tree-graph/tree-graph.component';
import { GuardianSwitchButton } from './guardian-switch-button/guardian-switch-button.component';
import { ImportEntityDialog } from './import-entity-dialog/import-entity-dialog.component';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { MathLiveComponent } from './mathlive/mathlive.component';
import { MenuButton } from './menu-button/menu-button.component';
import { CheckboxButton } from './checkbox-button/checkbox-button.component';
import { IPFSLinkComponent } from './ipfs-link/ipfs-link.component';
import {TableDialogComponent} from './table-dialog/table-dialog.component';
import {AgGridModule} from 'ag-grid-angular';
import { PolicyComments } from './policy-comments/policy-comments.component';
import { TextInputAutocompleteDirective } from './angular-text-input-autocomplete/text-input-autocomplete.directive';
import { TextInputAutocompleteContainerComponent } from './angular-text-input-autocomplete/text-input-autocomplete-container.component';
import { TextInputAutocompleteMenuComponent } from './angular-text-input-autocomplete/text-input-autocomplete-menu.component';

@NgModule({
    declarations: [
        DatetimePicker,
        HederaExplorer,
        SelectMenuButton,
        AsyncProgressComponent,
        SwitchButton,
        FileDragNDropComponent,
        IconPreviewDialog,
        TokenConfigurationComponent,
        FileExplorer,
        ConfirmDialog,
        SelectorDialogComponent,
        StepTreeComponent,
        SeparateStepperComponent,
        NewVersionsComponent,
        DataInputDialogComponent,
        CompareBtnComponent,
        CompareViewerComponent,
        AlertComponent,
        PaginatorComponent,
        StatusDropdown,
        CustomConfirmDialogComponent,
        TreeGraphComponent,
        GuardianSwitchButton,
        ImportEntityDialog,
        MathLiveComponent,
        MenuButton,
        CheckboxButton,
        IPFSLinkComponent,
	TableDialogComponent,
        PolicyComments,
        TextInputAutocompleteDirective,
        TextInputAutocompleteContainerComponent,
        TextInputAutocompleteMenuComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        NgxFileDropModule,
        NgxColorsModule,
        NgxMaskDirective,
        DialogModule,
        InputTextModule,
        DropdownModule,
        ProgressBarModule,
        ButtonModule,
        TabViewModule,
        DynamicDialogModule,
        AngularSvgIconModule.forRoot(),
        TooltipModule,
        DynamicDialogModule,
        AgGridModule,
    ],
    providers: [
        provideNgxMask(),
        DialogService
    ],
    exports: [
        DatetimePicker,
        HederaExplorer,
        SelectMenuButton,
        SwitchButton,
        AsyncProgressComponent,
        FileDragNDropComponent,
        IconPreviewDialog,
        TokenConfigurationComponent,
        FileExplorer,
        ConfirmDialog,
        NgxColorsModule,
        SelectorDialogComponent,
        SeparateStepperComponent,
        NgxMaskDirective,
        NewVersionsComponent,
        CompareBtnComponent,
        CompareViewerComponent,
        PaginatorComponent,
        DataInputDialogComponent,
        StatusDropdown,
        CustomConfirmDialogComponent,
        TreeGraphComponent,
        GuardianSwitchButton,
        ImportEntityDialog,
        MathLiveComponent,
        MenuButton,
        CheckboxButton,
        IPFSLinkComponent,
	TableDialogComponent,
        PolicyComments,
        TextInputAutocompleteDirective,
        TextInputAutocompleteContainerComponent,
        TextInputAutocompleteMenuComponent
    ]
})
export class CommonComponentsModule {
}

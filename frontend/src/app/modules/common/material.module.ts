import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatTreeModule } from '@angular/material/tree';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatNativeDateModule } from '@angular/material/core';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkTableModule } from '@angular/cdk/table';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatBadgeModule } from '@angular/material/badge';
import { TabViewModule } from 'primeng/tabview';
import { AccordionModule } from 'primeng/accordion';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';


@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        // MatTabsModule,
        TabViewModule,

        MatStepperModule,

        // MatExpansionModule,
        AccordionModule,
        TableModule,

        MatIconModule,
        ButtonModule,

        ReactiveFormsModule,
        MatInputModule,
        MatButtonModule,
        MatTableModule,
        MatDialogModule,
        MatDatepickerModule,
        MatRadioModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatToolbarModule,
        MatMenuModule,
        MatDividerModule,
        MatListModule,
        MatProgressBarModule,
        MatSelectModule,
        MatCheckboxModule,
        MatTreeModule,
        MatTooltipModule,
        MatSlideToggleModule,
        MatPaginatorModule,
        MatButtonToggleModule,
        DragDropModule,
        MatSliderModule,
        CdkTableModule,
        MatBadgeModule
    ],
    exports: [
        // MatTabsModule,
        TabViewModule,

        MatStepperModule,

        // MatExpansionModule,
        AccordionModule,
        TableModule,

        MatIconModule,
        ButtonModule,

        ReactiveFormsModule,
        MatInputModule,
        MatButtonModule,
        MatTableModule,
        MatDialogModule,
        MatDatepickerModule,
        MatRadioModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatToolbarModule,
        MatMenuModule,
        MatDividerModule,
        MatListModule,
        MatProgressBarModule,
        MatSelectModule,
        MatCheckboxModule,
        MatTreeModule,
        MatTooltipModule,
        MatSlideToggleModule,
        ClipboardModule,
        MatPaginatorModule,
        MatSortModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatButtonToggleModule,
        DragDropModule,
        MatSliderModule,
        CdkTableModule,
        MatBadgeModule
    ]
})
export class MaterialModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkTableModule } from '@angular/cdk/table';
import { TabViewModule } from 'primeng/tabview';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToolbarModule } from 'primeng/toolbar';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ProgressBarModule } from 'primeng/progressbar';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipsModule } from 'primeng/chips';
import { StepsModule } from 'primeng/steps';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { MenuModule } from 'primeng/menu';
import { PasswordModule } from 'primeng/password';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        TabViewModule,
        StepsModule,
        AccordionModule,
        TableModule,
        ReactiveFormsModule,
        ButtonModule,
        SelectButtonModule,
        CalendarModule,
        RadioButtonModule,
        ProgressSpinnerModule,
        ToolbarModule,
        OverlayPanelModule,
        ProgressBarModule,
        DropdownModule,
        CheckboxModule,
        TreeModule,
        TooltipModule,
        DragDropModule,
        CdkTableModule,
        MenuModule,
        PasswordModule
    ],
    exports: [
        TabViewModule,
        StepsModule,
        AccordionModule,
        TableModule,
        ReactiveFormsModule,
        ButtonModule,
        SelectButtonModule,
        CalendarModule,
        RadioButtonModule,
        ProgressSpinnerModule,
        ToolbarModule,
        OverlayPanelModule,
        ProgressBarModule,
        DropdownModule,
        MultiSelectModule,
        InputNumberModule,
        CheckboxModule,
        TreeModule,
        TooltipModule,
        ChipsModule,
        DragDropModule,
        CdkTableModule,
        MenuModule
    ]
})
export class MaterialModule {
}

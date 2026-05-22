import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkTableModule } from '@angular/cdk/table';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePickerModule } from 'primeng/datepicker';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToolbarModule } from 'primeng/toolbar';
import { PopoverModule } from 'primeng/popover';
import { ProgressBarModule } from 'primeng/progressbar';
import { CheckboxModule } from 'primeng/checkbox';
import { StepperModule } from 'primeng/stepper';
import { StepsModule } from 'primeng/steps';
import { SelectModule } from 'primeng/select';
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
        TabsModule,
        StepperModule,
        StepsModule,
        AccordionModule,
        TableModule,
        ReactiveFormsModule,
        ButtonModule,
        SelectButtonModule,
        DatePickerModule,
        RadioButtonModule,
        ProgressSpinnerModule,
        ToolbarModule,
        PopoverModule,
        ProgressBarModule,
        SelectModule,
        CheckboxModule,
        TreeModule,
        TooltipModule,
        DragDropModule,
        CdkTableModule,
        MenuModule,
        PasswordModule
    ],
    exports: [
        TabsModule,
        StepperModule,
        StepsModule,
        AccordionModule,
        TableModule,
        ReactiveFormsModule,
        ButtonModule,
        SelectButtonModule,
        DatePickerModule,
        RadioButtonModule,
        ProgressSpinnerModule,
        ToolbarModule,
        PopoverModule,
        ProgressBarModule,
        SelectModule,
        MultiSelectModule,
        InputNumberModule,
        CheckboxModule,
        TreeModule,
        TooltipModule,
        DragDropModule,
        CdkTableModule,
        MenuModule
    ]
})
export class MaterialModule {
}

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AnnotationBlockComponent } from './component/annotation-block/annotation-block.component';
import { ProjectsOverviewComponent } from './component/projects-overview/projects-overview.component';
import { ProjectsComparisonTableComponent } from './component/projects-comparison-table/projects-comparison-table.component';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CompareModule } from '../analytics/analytics.module';

@NgModule({
    declarations: [
        AnnotationBlockComponent,
        ProjectsOverviewComponent,
        ProjectsComparisonTableComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        BrowserModule,
        InputTextModule,
        DropdownModule,
        BrowserAnimationsModule,
        InputNumberModule,
        ButtonModule,
        MultiSelectModule,
        ReactiveFormsModule,
        HttpClientModule,
        AngularSvgIconModule.forRoot(),
        CompareModule
    ],
    exports: [
        AnnotationBlockComponent,
        ProjectsOverviewComponent,
        ProjectsComparisonTableComponent
    ]
})
export class ProjectComparisonModule {
}

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AnnotationBlockComponent } from './component/annotation-block/annotation-block.component';
import { ProjectsOverviewComponent } from './component/projects-overview/projects-overview.component';
import { ProjectsComparisonTableComponent } from './component/projects-comparison-table/projects-comparison-table.component';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
    declarations: [
        AppComponent,
        AnnotationBlockComponent,
        ProjectsOverviewComponent,
        ProjectsComparisonTableComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        InputTextModule,
        DropdownModule,
        BrowserAnimationsModule,
        InputNumberModule,
        ButtonModule,
        MultiSelectModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,
    ],
    providers: [ApiService],
    bootstrap: [AppComponent]
})
export class AppModule {
}

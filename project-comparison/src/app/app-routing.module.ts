import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnnotationBlockComponent } from './component/annotation-block/annotation-block.component';
import { ProjectsComparisonTableComponent } from './component/projects-comparison-table/projects-comparison-table.component';

const routes: Routes = [
    {
        path: '',
        component: AnnotationBlockComponent,
        data: {title: 'GUARDIAN / Project Overview'}
    },
    {
        path: 'projects',
        component: ProjectsComparisonTableComponent,
        data: {title: 'GUARDIAN / Project Comparison'}
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}

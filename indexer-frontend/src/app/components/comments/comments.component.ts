import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule } from '@jsverse/transloco';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';

@Component({
    selector: 'app-comments',
    templateUrl: './comments.component.html',
    styleUrls: [
        './comments.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        LoadingComponent,
        MatTabsModule,
        NgxEchartsDirective,
        MatInputModule,
        TranslocoModule,
        TabViewModule,
        ProgressSpinnerModule,
        ButtonModule,
        InputTextareaModule,
    ],
})
export class CommentsComponent {
    @Input('targetId') targetId!: string;

    public loading: boolean = true;

    constructor(
        private entitiesService: EntitiesService,
        private route: ActivatedRoute,
        private router: Router
    ) {

    }

    private loadData(): void {
        // if (this.targetId) {
        //     this.loading = true;
        //     this.entitiesService
        //         .getPolicyDiscussion(this.targetId)
        //         .subscribe({
        //             next: (result) => {
        //                 this.setResult(result);
        //                 setTimeout(() => {
        //                     this.loading = false;
        //                 }, 500);
        //             },
        //             error: ({ message }) => {
        //                 this.loading = false;
        //                 console.error(message);
        //             },
        //         });
        // } else {
        //     this.setResult();
        // }
    }

    private setResult(result?: any) {

    }
}

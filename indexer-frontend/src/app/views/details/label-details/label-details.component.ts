import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { TranslocoModule } from '@jsverse/transloco';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import {
    OverviewFormComponent,
    OverviewFormField,
} from '@components/overview-form/overview-form.component';
import { ActivityComponent } from '@components/activity/activity.component';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'label-details',
    templateUrl: './label-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './label-details.component.scss',
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
        OverviewFormComponent,
        ActivityComponent,
        InputTextareaModule,
    ],
})
export class LabelDetailsComponent extends BaseDetailsComponent {
    tabs: any[] = ['overview', 'activity', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.label.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.label.overview.policy_topic_id',
            path: 'options.policyTopicId',
            link: '/topics',
        },
        {
            label: 'details.label.overview.owner',
            path: 'options.owner',
        },
        {
            label: 'details.label.overview.name',
            path: 'options.name',
        },
        {
            label: 'details.label.overview.description',
            path: 'options.description',
        }
    ];

    constructor(
        entitiesService: EntitiesService,
        dialogService: DialogService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(entitiesService, dialogService, route, router);
    }

    protected override loadData(): void {
        if (this.id) {
            this.loading = true;
            this.entitiesService.getLabel(this.id).subscribe({
                next: (result) => {
                    this.setResult(result);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: ({ message }) => {
                    this.loading = false;
                    console.error(message);
                },
            });
        } else {
            this.setResult();
        }
    }

    protected override onNavigate(): void {}

    protected override getTabIndex(name: string): number {
        if (this.target) {
            const tabIndex = this.tabs.findIndex((item) => item === name);
            return tabIndex >= 0 ? tabIndex : 0;
        } else {
            return 0;
        }
    }

    protected override getTabName(index: number): string {
        if (this.target) {
            return this.tabs[index] || 'raw';
        } else {
            return 'raw';
        }
    }

    public override onOpenSchemas() {
        this.router.navigate(['/schemas'], {
            queryParams: {
                topicId: this.row.topicId,
            },
        });
    }


    public override onOpenVPs() {
        this.router.navigate(['/vp-documents'], {
            queryParams: {
                topicId: this.row.topicId
            },
        });
    }
}

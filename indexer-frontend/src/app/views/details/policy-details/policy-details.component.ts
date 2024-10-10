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

@Component({
    selector: 'policy-details',
    templateUrl: './policy-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './policy-details.component.scss',
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
export class PolicyDetailsComponent extends BaseDetailsComponent {
    tabs: any[] = ['overview', 'activity', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.policy.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.policy.overview.instance_topic_id',
            path: 'options.instanceTopicId',
            link: '/topics',
        },
        {
            label: 'details.policy.overview.owner',
            path: 'options.owner',
        },
        {
            label: 'details.policy.overview.name',
            path: 'options.name',
        },
        {
            label: 'details.policy.overview.description',
            path: 'options.description',
        },
        {
            label: 'details.policy.overview.version',
            path: 'options.version',
        },
        {
            label: 'details.policy.overview.policy_tag',
            path: 'options.policyTag',
        },
        {
            label: 'details.policy.overview.registry',
            path: 'analytics.registryId',
            link: '/registries',
        },
    ];

    constructor(
        private entitiesService: EntitiesService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
    }

    protected override loadData(): void {
        if (this.id) {
            this.loading = true;
            this.entitiesService.getPolicy(this.id).subscribe({
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

    public override onOpenRoles() {
        this.router.navigate(['/roles'], {
            queryParams: {
                'analytics.policyId': this.id,
            },
        });
    }

    public override onOpenVCs() {
        this.router.navigate(['/vc-documents'], {
            queryParams: {
                'analytics.policyId': this.id,
            },
        });
    }

    public override onOpenVPs() {
        this.router.navigate(['/vp-documents'], {
            queryParams: {
                'analytics.policyId': this.id,
            },
        });
    }
}

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
import { createChart } from '../base-details/relationships-chart.config';
import { EChartsOption } from 'echarts';
import { CompareComponent } from '@views/compare/compare/compare.component';
import { DerivationsComponent } from '@views/collections/derivations/derivations.component';
import { DialogService } from 'primeng/dynamicdialog';

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
        CompareComponent,
        DerivationsComponent
    ],
})
export class PolicyDetailsComponent extends BaseDetailsComponent {

    public chartOption: EChartsOption = createChart();

    tabs: any[] = ['overview', 'activity', 'relationships', 'raw', 'origin', 'derivations'];
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
        entitiesService: EntitiesService,
        dialogService: DialogService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(entitiesService, dialogService, route, router);
    }

    get showOriginTab(): boolean {
        return this.target && this.target?.options?.originalMessageId; 
    }

    get showDerivationsTab(): boolean {
        return this.target && this.target?.analytics?.derivationsCount;
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

    protected override onNavigate(): void {
        if (this.id && this.tab === 'relationships') {
            this.loading = true;
            this.entitiesService.getPolicyRelationships(this.id).subscribe({
                next: (result) => {
                    this.setRelationships(result);
                    this.setChartData();
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: ({ message }) => {
                    this.loading = false;
                    console.error(message);
                },
            });
        }
    }

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

    private setChartData() {
        this.chartOption = createChart(this.relationships);
    }

    public onSelect(event: any) {
        if (event.dataType === 'node') {
            this.toEntity(
                String(event.data?.entityType),
                event.name,
                'relationships'
            );
        }
    }

    public override onOpenSchemas() {
        this.router.navigate(['/schemas'], {
            queryParams: {
                topicId: this.row.topicId,
            },
        });
    }

    public override onOpenSchemaPackage() {
        this.router.navigate(['/schemas-packages'], {
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

    public override onOpenFormulas() {
        this.router.navigate(['/formulas'], {
            queryParams: {
                topicId: this.row.topicId,
            },
        });
    }
}

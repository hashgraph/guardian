import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { ECElementEvent, EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { TranslocoModule } from '@jsverse/transloco';
import { createChart } from '../base-details/relationships-chart.config';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ActivityComponent } from '@components/activity/activity.component';
import {
    OverviewFormComponent,
    OverviewFormField,
} from '@components/overview-form/overview-form.component';
import { InputTextareaModule } from 'primeng/inputtextarea';

@Component({
    selector: 'registry-details',
    templateUrl: './registry-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './registry-details.component.scss',
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
        ActivityComponent,
        OverviewFormComponent,
        InputTextareaModule,
    ],
})
export class RegistryDetailsComponent extends BaseDetailsComponent {

    tabs: any[] = ['overview', 'activity', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.registry.overview.account_id',
            path: 'owner',
        },
        {
            label: 'details.registry.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.registry.overview.did',
            path: 'options.did',
        },
        {
            label: 'details.registry.overview.lang',
            path: 'lang',
        },
        {
            label: 'details.registry.overview.registrant_topic_id',
            path: 'options.registrantTopicId',
            link: '/topics',
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
            this.entitiesService.getRegistry(this.id).subscribe({
                next: (result) => {
                    this.setResult(result);
                    //this.prepareActivityValue();
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

    public onSelect(event: ECElementEvent) {
        if (event.dataType === 'node') {
            this.toEntity(String(event.value), event.name, 'relationships');
        }
    }

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }

    public getDocument(item: any): string {
        return JSON.stringify(JSON.parse(item), null, 4);
    }

    public override onOpenUsers() {
        this.router.navigate(['/registry-users'], {
            queryParams: {
                topicId: this.target.options.registrantTopicId,
            },
        });
    }

    public override onOpenTools() {
        this.router.navigate(['/tools'], {
            queryParams: {
                'options.owner': this.target.options.did,
            },
        });
    }

    public override onOpenDIDs() {
        this.router.navigate(['/did-documents'], {
            queryParams: {
                'options.issuer': this.target.options.did,
            },
        });
    }

    public override onOpenVCs() {
        this.router.navigate(['/vc-documents'], {
            queryParams: {
                'options.issuer': this.target.options.did,
            },
        });
    }

    public override onOpenVPs() {
        this.router.navigate(['/vp-documents'], {
            queryParams: {
                'options.issuer': this.target.options.did,
            },
        });
    }

    public override onOpenModules() {
        this.router.navigate(['/modules'], {
            queryParams: {
                'options.owner': this.target.options.did,
            },
        });
    }

    public override onOpenPolicies() {
        this.router.navigate(['/policies'], {
            queryParams: {
                'options.owner': this.target.options.did,
            },
        });
    }

    public override onOpenTokens() {
        this.router.navigate(['/tokens'], {
            queryParams: {
                'treasury': this.target.owner,
            },
        });
    }

    public override onOpenRoles() {
        this.router.navigate(['/roles'], {
            queryParams: {
                'options.issuer': this.target.options.did,
            },
        });
    }
}

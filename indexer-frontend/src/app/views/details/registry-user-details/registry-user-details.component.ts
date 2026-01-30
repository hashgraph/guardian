import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { TranslocoModule } from '@jsverse/transloco';
import { createChart } from '../base-details/relationships-chart.config';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { OverviewFormComponent, OverviewFormField } from '@components/overview-form/overview-form.component';
import { ActivityComponent } from '@components/activity/activity.component';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'registry-user-details',
    templateUrl: './registry-user-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './registry-user-details.component.scss',
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
    ]
})
export class RegistryUserDetailsComponent extends BaseDetailsComponent {

    tabs: any[] = [
        'overview',
        'users',
        'raw'
    ]
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.registry.overview.account_id',
            path: 'owner',
            hederaExplorerType: HederaType.ACCOUNT,
        },
        {
            label: 'details.registry.overview.topic_id',
            path: 'topicId',
            link: '/topics'
        },
        {
            label: 'details.registry.overview.did',
            path: 'options.did',
        },
        {
            label: 'details.registry.overview.lang',
            path: 'lang',
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

    protected override loadData(): void {
        if (this.id) {
            this.loading = true;
            this.entitiesService.getRegistryUser(this.id).subscribe({
                next: (result) => {
                    this.setResult(result);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: ({ message }) => {
                    this.loading = false;
                    console.error(message);
                }
            });
        } else {
            this.setResult();
        }
    }

    protected override onNavigate(): void {}

    protected override getTabIndex(name: string): number {
        if (this.target) {
            const tabIndex = this.tabs.findIndex(item => item === name)
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

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }
}

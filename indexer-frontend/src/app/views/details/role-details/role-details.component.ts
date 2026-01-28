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
    selector: 'role-details',
    templateUrl: './role-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './role-details.component.scss',
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
export class RoleDetailsComponent extends BaseDetailsComponent {
    tabs: any[] = ['overview', 'document', 'activity', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.role.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.role.overview.issuer',
            path: 'options.issuer',
        },
        {
            label: 'details.role.overview.group',
            path: 'options.group',
        },
        {
            label: 'details.role.overview.role',
            path: 'options.role',
        },
        {
            label: 'details.role.overview.policy',
            path: 'analytics.policyId',
            link: '/policies',
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
            this.entitiesService.getRole(this.id).subscribe({
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

    protected override onOpenVCs(): void {
        this.router.navigate(['/vc-documents'], {
            queryParams: {
                'options.relationships': this.id,
            },
        });
    }

    protected override getTabName(index: number): string {
        if (this.target) {
            return this.tabs[index] || 'raw';
        } else {
            return 'raw';
        }
    }
}

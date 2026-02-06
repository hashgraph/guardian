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
import { OrganizationChartModule } from 'primeng/organizationchart';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'did-document-details',
    templateUrl: './did-document-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './did-document-details.component.scss',
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
        OrganizationChartModule,
    ],
})
export class DidDocumentDetailsComponent extends BaseDetailsComponent {
    tabs: any[] = ['overview', 'document', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.did.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.did.overview.did',
            path: 'options.did',
        },
    ];
    tree?: any;

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
            this.entitiesService.getDidDocument(this.id).subscribe({
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
        if (this.id && this.tab === 'tree') {
            this.loading = true;
            this.entitiesService.getSchemaTree(this.id).subscribe({
                next: (result) => {
                    this.tree = result;
                },
                complete: () => (this.loading = false),
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

    openSchema(id: string) {
        this.tree = null;
        this.router.navigate(['schemas', id]);
    }

    protected override onOpenVCs(): void {
        this.router.navigate(['/vc-documents'], {
            queryParams: {
                'analytics.schemaId': this.id,
            },
        });
    }

    protected override onOpenVPs(): void {
        this.router.navigate(['/vp-documents'], {
            queryParams: {
                'analytics.schemaIds': this.id,
            },
        });
    }
}

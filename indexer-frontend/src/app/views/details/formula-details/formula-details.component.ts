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
import CID from 'cids';
import { FormulaViewComponent } from '@components/formula-view/formula-view.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'formula-details',
    templateUrl: './formula-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './formula-details.component.scss',
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
        FormulaViewComponent
    ],
})
export class FormulaDetailsComponent extends BaseDetailsComponent {
    public subLoading: boolean = false;

    tabs: any[] = ['overview', 'view', 'document', 'raw'];
    overviewFields: OverviewFormField[] = [
        {
            label: 'details.formula.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.formula.overview.owner',
            path: 'options.owner',
        },
        {
            label: 'details.formula.overview.name',
            path: 'options.name',
        },
        {
            label: 'details.formula.overview.description',
            path: 'options.description',
        },
        {
            label: 'details.formula.overview.policy',
            path: 'analytics.policyId',
            link: '/policies',
        },
    ];
    formulaData: any;

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
            this.entitiesService.getFormula(this.id).subscribe({
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

    protected override setFiles(item: any) {
        if (item) {
            if (Array.isArray(item.files)) {
                item._ipfs = [];
                item._ipfsStatus = true;
                for (let i = 0; i < item.files.length; i++) {
                    const url = item.files[i];
                    const document = item.analytics?.config;
                    const json = this.getJson(document);
                    const cid = new CID(url);
                    const ipfs = {
                        version: cid.version,
                        cid: url,
                        global: cid.toV1().toString('base32'),
                        document,
                        json,
                    }
                    if (!document) {
                        item._ipfsStatus = false;
                    }
                    item._ipfs.push(ipfs);
                }
            }
        }
    }

    protected override onNavigate(): void {
        if (this.id && this.tab === 'view' && !this.formulaData) {
            this.subLoading = true;
            this.entitiesService.getFormulaRelationships(this.id).subscribe({
                next: (result) => {
                    this.formulaData = result;
                },
                complete: () => (this.subLoading = false),
            });
        }
    }


    protected getJson(item: any): string {
        try {
            return JSON.stringify(item, null, 4);
        } catch (error) {
            console.log(error);
            return '';
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
}

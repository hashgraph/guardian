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
import { OverviewFormComponent, OverviewFormField } from '@components/overview-form/overview-form.component';
import { TabViewModule } from 'primeng/tabview';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextareaModule } from 'primeng/inputtextarea';

@Component({
    selector: 'nft-details',
    templateUrl: './nft-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './nft-details.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        LoadingComponent,
        MatTabsModule,
        NgxEchartsDirective,
        MatInputModule,
        TranslocoModule,
        OverviewFormComponent,
        TabViewModule,
        TableComponent,
        ProgressSpinnerModule,
        InputTextareaModule
    ]
})
export class NFTDetailsComponent extends BaseDetailsComponent {

    overviewFields: OverviewFormField[] = [
        {
            label: 'details.nft.overview.token_id',
            path: 'tokenId',
            link: '/tokens',
        },
        {
            label: 'details.nft.overview.serial_number',
            path: 'serialNumber',
        },
        {
            label: 'details.nft.overview.metadata',
            path: 'metadata',
        }
    ]
    tabs: any[] = ['overview', 'history', 'raw'];
    historyColumns: any[] = [
        {
            title: 'details.hedera.transaction_id',
            field: 'transaction_id',
            type: ColumnType.TEXT,
            width: '400px'
        },
        {
            title: 'details.hedera.sender_account_id',
            field: 'sender_account_id',
            type: ColumnType.TEXT,
            width: '200px'
        },
        {
            title: 'details.hedera.receiver_account_id',
            field: 'receiver_account_id',
            type: ColumnType.TEXT,
            width: '200px'
        },
        {
            title: 'details.hedera.type',
            field: 'type',
            type: ColumnType.TEXT,
            width: '200px'
        },
    ]

    constructor(
        private entitiesService: EntitiesService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
    }

    protected override loadData(): void {
        if (this.id && this.serialNumber) {
            this.loading = true;
            this.entitiesService.getNFT(this.id, this.serialNumber).subscribe({
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
        return this.tabs[index] || 'raw';
    }
}

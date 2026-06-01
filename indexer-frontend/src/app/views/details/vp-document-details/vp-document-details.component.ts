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
import { ButtonModule } from 'primeng/button';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'vp-document-details',
    templateUrl: './vp-document-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './vp-document-details.component.scss',
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
        InputTextareaModule,
        ButtonModule
    ]
})
export class VpDocumentDetailsComponent extends BaseDetailsComponent {
    public labels: any[] = [];

    public chartOption: EChartsOption = createChart();

    overviewFields: OverviewFormField[] = [{
        label: 'details.hedera.topic_id',
        path: 'topicId',
        link: '/topics'
    }, {
        label: 'details.hedera.consensus_timestamp',
        path: 'consensusTimestamp'
    }, {
        label: 'details.hedera.uuid',
        path: 'uuid'
    }, {
        label: 'details.hedera.type',
        path: 'type'
    }, {
        label: 'details.hedera.action',
        path: 'action'
    }, {
        label: 'details.hedera.status',
        path: 'status'
    }, {
        label: 'details.hedera.status_reason',
        path: 'statusReason'
    }, {
        label: 'details.hedera.issuer',
        path: 'options.issuer'
    }, {
        label: 'details.hedera.token_id',
        path: 'analytics.tokenId',
        link: '/tokens'
    }, {
        label: 'details.hedera.token_amount',
        path: 'analytics.tokenAmount',
    }]

    historyColumns: any[] = [
        {
            title: 'details.hedera.consensus_timestamp',
            field: 'consensusTimestamp',
            type: ColumnType.TEXT,
            width: '250px'
        },
        {
            title: 'details.hedera.topic_id',
            field: 'topicId',
            type: ColumnType.TEXT,
            width: '100px'
        },
        {
            title: 'details.hedera.action',
            field: 'action',
            type: ColumnType.TEXT,
            width: '200px'
        },
        {
            title: 'details.hedera.status',
            field: 'status',
            type: ColumnType.TEXT,
            width: '100px'
        },
        {
            title: 'details.hedera.status_reason',
            field: 'statusReason',
            type: ColumnType.TEXT,
            width: '100px'
        }
    ]

    labelColumns: any[] = [
        {
            title: 'details.hedera.consensus_timestamp',
            field: 'consensusTimestamp',
            type: ColumnType.TEXT,
            width: '250px',
            link: {
                field: 'consensusTimestamp',
                url: '/label-documents',
            },
        },
        {
            title: 'details.hedera.topic_id',
            field: 'topicId',
            type: ColumnType.TEXT,
            width: '100px'
        },
        {
            title: 'details.hedera.name',
            field: 'analytics.labelName',
            type: ColumnType.TEXT,
            width: '200px'
        },
        {
            title: 'details.hedera.issuer',
            field: 'analytics.issuer',
            type: ColumnType.TEXT,
            width: '300px'
        }
    ]

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
            this.entitiesService.getVpDocument(this.id).subscribe({
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

    protected override setResult(result?: any) {
        super.setResult(result);
        if (result) {
            this.labels = result.labels || [];
        } else {
            this.labels = [];
        }
    }

    protected override onNavigate(): void {
        if (this.id && this.tab === 'relationships') {
            this.loading = true;
            this.entitiesService.getVpRelationships(this.id).subscribe({
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
                }
            });
        }
    }

    protected override getTabIndex(name: string): number {
        if (this.target) {
            switch (name) {
                case 'overview': return 0;
                case 'documents': return 1;
                case 'history': return 2;
                case 'relationships': return 3;
                case 'labels': return 4;
                case 'raw': return 5;
                default: return 0;
            }
        } else {
            return 0;
        }
    }

    protected override getTabName(index: number): string {
        if (this.target) {
            switch (index) {
                case 0: return 'overview';
                case 1: return 'documents';
                case 2: return 'history';
                case 3: return 'relationships';
                case 4: return 'labels';
                case 5: return 'raw';
                default: return 'raw';
            }
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

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }
}

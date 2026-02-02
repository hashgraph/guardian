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
import { IValidatorStep, LabelValidators } from '@indexer/interfaces';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'label-document-details',
    templateUrl: './label-document-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './label-document-details.component.scss',
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
        ButtonModule,
        RadioButtonModule,
        FormsModule
    ]
})
export class LabelDocumentDetailsComponent extends BaseDetailsComponent {
    public chartOption: EChartsOption = createChart();
    public label: any = null;
    public steps?: IValidatorStep[];

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
    }, {
        label: 'details.hedera.target',
        path: 'options.target',
        link: '/vp-documents'
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
            this.entitiesService.getLabelDocument(this.id).subscribe({
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
            this.label = result.label;
        } else {
            this.label = null;
        }
        const vp = this.getVpDocument();
        const labelConfig = this.label?.analytics?.config;
        if (vp && labelConfig) {
            const validator = new LabelValidators(labelConfig);
            this.steps = validator.getDocument();
            validator.setData([]);
            validator.setVp(vp);
        } else {
            this.steps = [];
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
                case 'view': return 2;
                case 'history': return 3;
                case 'relationships': return 4;
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
                case 2: return 'view';
                case 3: return 'history';
                case 4: return 'relationships';
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

    public getVariableValue(value: any): any {
        if (value === undefined) {
            return 'N/A';
        } else {
            return value;
        }
    }

    public getVpDocument() {
        const file = this.getFirstDocument();
        if (file && file.documentObject) {
            return {
                document: file.documentObject
            }
        }
        return null;
    }
}

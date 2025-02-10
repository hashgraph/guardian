import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { TranslocoModule } from '@jsverse/transloco';
import { createChart } from '../base-details/relationships-chart.config';
import { EntitiesService } from '@services/entities.service';
import { TabViewModule } from 'primeng/tabview';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SchemaFormViewComponent } from '@components/schema-form-view/schema-form-view.component';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Schema } from '@indexer/interfaces';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import {
    OverviewFormComponent,
    OverviewFormField,
} from '@components/overview-form/overview-form.component';
import { ButtonModule } from 'primeng/button';
import { FormulasTree } from '../../../models/formula-tree';
import { ProjectLocationsComponent } from '@components/project-locations/project-locations.component';

@Component({
    selector: 'vc-document-details',
    templateUrl: './vc-document-details.component.html',
    styleUrls: [
        '../base-details/base-details.component.scss',
        './vc-document-details.component.scss',
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
    TableComponent,
    ProgressSpinnerModule,
    SchemaFormViewComponent,
    InputTextareaModule,
    SelectButtonModule,
    FormsModule,
    OverviewFormComponent,
    ButtonModule,
    ProjectLocationsComponent
],
})
export class VcDocumentDetailsComponent extends BaseDetailsComponent {
    public chartOption: EChartsOption = createChart();

    overviewFields: OverviewFormField[] = [
        {
            label: 'details.vc.overview.topic_id',
            path: 'topicId',
            link: '/topics',
        },
        {
            label: 'details.vc.overview.issuer',
            path: 'options.issuer',
        },
        {
            label: 'details.vc.overview.policy',
            path: 'analytics.policyId',
            link: '/policies',
        },
        {
            label: 'details.hedera.action',
            path: 'action',
        },
        {
            label: 'details.hedera.status',
            path: 'status',
        },
    ];
    tabs: any[] = ['overview', 'document', 'history', 'relationships', 'raw'];
    historyColumns: any[] = [
        {
            title: 'details.hedera.consensus_timestamp',
            field: 'consensusTimestamp',
            type: ColumnType.TEXT,
            width: '250px',
        },
        {
            title: 'details.hedera.topic_id',
            field: 'topicId',
            type: ColumnType.TEXT,
            width: '100px',
        },
        {
            title: 'details.hedera.action',
            field: 'action',
            type: ColumnType.TEXT,
            width: '200px',
        },
        {
            title: 'details.hedera.status',
            field: 'status',
            type: ColumnType.TEXT,
            width: '100px',
        },
        {
            title: 'details.hedera.status_reason',
            field: 'statusReason',
            type: ColumnType.TEXT,
            width: '100px',
        },
    ];
    documentViewOptions = [
        {
            icon: 'pi pi-code',
            value: 'json',
        },
        {
            icon: 'pi pi-file',
            value: 'document',
        },
    ];
    documentViewOption = 'document';

    privateFields = {
        '@context': true,
        'type': true,
        'policyId': true,
        'ref': true
    };
    formulas?: FormulasTree | null;
    formulasResults?: any | null;

    
    mapTabs: any[] = ['json', 'table'];
    mapTabIndex: number = 0;

    constructor(
        entitiesService: EntitiesService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(entitiesService, route, router);
    }

    geoShapes: any = [];

    protected override setResult(result?: any) {
        super.setResult(result);

        try {
            if (result?.schema) {
                this.schema = new Schema(result?.schema, '');
                this.documentViewOption = 'document';
                
                if (result?.item?.documents?.length >= 0) {
                    const geoFieldPaths: string[] = this.findGeoField(this.schema);
                    
                    // console.log(this.schema);
                    // console.log(JSON.parse(result.item.documents[0]));

                    geoFieldPaths.forEach(path => {
                        result.item.documents.forEach((document: string) => {
                            const vc = this.getCredentialSubject(JSON.parse(document));
                            const locations = this.getValue(vc, path);
                            
                            if (locations) {
                                this.geoShapes.push(locations);
                            }
                        });
                    });
                }
            } else {
                this.documentViewOption = 'json';
            }
        } catch (error) {
            console.log(error);
        }
        try {
            if (result?.formulasData) {
                this.formulas = FormulasTree.from(result.formulasData);
                this.formulasResults = this.formulas?.getFields(this.schema?.iri);
            }
        } catch (error) {
            console.log(error);
        }
    }

    protected override setFiles(result?: any) {
        super.setFiles(result);
        try {
            if (result?.schema) {
                this.schema = new Schema(result?.schema, '');
                this.documentViewOption = 'document';
            } else {
                this.documentViewOption = 'json';
            }
        } catch (error) {
            console.log(error);
        }
    }

    protected override loadData(): void {
        if (this.id) {
            this.loading = true;
            this.entitiesService.getVcDocument(this.id).subscribe({
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
            this.entitiesService.getVcRelationships(this.id).subscribe({
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

    public findGeoField(obj: any): string[] {
        const fieldNames: string[] = [];
        if (obj.fields && obj.fields.length > 0) {
            obj.fields.forEach((field: any) => {
                if (field?.context?.type === 'GeoJSON') {
                    fieldNames.push(field.name);
                }
                if (field.fields && field.fields.length > 0) {
                    fieldNames.push(...this.findGeoField(field));
                }
            });
        }
        return fieldNames;
    }
    
    public getValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }
}

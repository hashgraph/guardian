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
        TranslocoModule
    ]
})
export class VcDocumentDetailsComponent extends BaseDetailsComponent {
    public chartOption: EChartsOption = createChart();

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
                }
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
                case 'raw': return 4;
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
                case 4: return 'raw';
                default: return 'raw';
            }
        } else {
            return 'raw';
        }
    }

    private setChartData() {
        this.chartOption = createChart(this.relationships);
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
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

function createChart(data: any[], links: any): EChartsOption {
    return {
        title: {
            text: 'Relationships'
        },
        tooltip: {},
        animationDurationUpdate: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
            {
                type: 'graph',
                layout: 'none',
                symbolSize: 50,
                roam: true,
                label: {
                    show: true
                },
                edgeSymbol: ['circle', 'arrow'],
                edgeSymbolSize: [4, 10],
                edgeLabel: {
                    fontSize: 20
                },
                data,
                links,
                lineStyle: {
                    opacity: 0.9,
                    width: 2,
                    curveness: 0
                }
            }
        ]
    };
}

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
        NgxEchartsDirective
    ]
})
export class VpDocumentDetailsComponent extends BaseDetailsComponent {
    public chartOption: EChartsOption = createChart([], []);

    constructor(
        private searchService: SearchService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
    }

    protected loadData(): void {
        if (this.id) {
            this.loading = true;
            this.searchService.getVpDocument(this.id).subscribe({
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

    protected onNavigate(): void {
        if (this.id && this.tab === 'RELATIONSHIPS') {
            this.loading = true;
            this.searchService.getVpRelationships(this.id).subscribe({
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

    protected getTabIndex(): number {
        if (this.target) {
            switch (this.tab) {
                case 'OVERVIEW': return 0;
                case 'DOCUMENT': return 1;
                case 'HISTORY': return 2;
                case 'RELATIONSHIPS': return 3;
                case 'ROW DATA': return 4;
                default: return 0;
            }
        } else {
            return 0;
        }
    }

    private setChartData() {
        if (
            this.relationships &&
            this.relationships.relationships &&
            this.relationships.links
        ) {
            const data = [];
            let index = 0;
            for (const item of this.relationships.relationships) {
                data.push(
                    {
                        name: item.id,
                        x: Math.random() * 1000,
                        y: Math.random() * 1000,
                        itemStyle: {
                            color: item.id === this.relationships.target.id ? '#ff942c' : '#556fc3'
                        }
                    },
                )
                index += 100;
            }
            const links = [];
            for (const item of this.relationships.links) {
                links.push(
                    {
                        source: item.source,
                        target: item.target,
                        lineStyle: {
                            curveness: 0.2
                        }
                    }
                )
            }
            this.chartOption = createChart(data, links);
        } else {
            this.chartOption = createChart([], []);
        }
    }

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }
}

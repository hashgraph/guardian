import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchService } from '@services/search.service';
import { LoadingComponent } from '@components/loading/loading.component';
import { MatTabsModule } from '@angular/material/tabs';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatInputModule } from '@angular/material/input';
import { BaseDetailsComponent } from '../base-details/base-details.component';

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
                // layout: 'circular',
                // layout: 'force',
                draggable: true,
                symbolSize: 50,
                roam: true,
                label: {
                    show: true,
                    fontSize: 10,
                    width: 80,
                    color: '#fff',
                    overflow: 'truncate',
                    ellipsis: '...',
                    formatter: function (d: any) {
                        return d.data.value || d.data.name;
                    }
                },
                edgeSymbol: ['circle', 'arrow'],
                edgeSymbolSize: [4, 10],
                edgeLabel: {
                    fontSize: 20
                },
                emphasis: {
                    focus: 'adjacency'
                },
                data,
                links,
                lineStyle: {
                    opacity: 0.9,
                    width: 2,
                    curveness: 0
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{c}<br />{b}'
                },
                // force: {
                //     repulsion: 500,
                //     gravity: 0.1,
                //     edgeLength: 500,
                //     layoutAnimation: true,
                //     friction: 0.6,
                // }
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
        NgxEchartsDirective,
        MatInputModule
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
            const relationships = this.relationships.relationships.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });

            const f = 2 * Math.PI / (relationships.length - 1);
            for (const item of relationships) {
                data.push(
                    {
                        // symbol: 'rect',
                        symbolSize: [80, 80],
                        // symbolSize: 100,
                        name: item.id,
                        value: item.type,
                        // x: index * 100,
                        // y: Math.random() * 1000,
                        x: item.id === this.relationships.target.id ? 0 : 1000 * Math.cos(index * f),
                        y: item.id === this.relationships.target.id ? 0 : 1000 * Math.sin(index * f),
                        itemStyle: {
                            color: item.id === this.relationships.target.id ? '#cf6c17' : '#556fc3',
                            shadowColor: 'rgba(0, 0, 0, 0.5)',
                            shadowBlur: 10
                        }
                    },
                )
                index++;
            }
            const links = [];
            for (const item of this.relationships.links) {
                links.push(
                    {
                        source: item.source,
                        target: item.target,
                        lineStyle: {
                            curveness: 0.2
                        },
                        tooltip: {
                            show: false
                        }
                    }
                )
            }
            this.chartOption = createChart(data, links);
        } else {
            this.chartOption = createChart([], []);
        }
    }

    public onSelect(event: any) {
        if (event.dataType === 'node') {
            this.router.navigate([`/vp-documents/${event.name}`]);
        }
    }

    public getJson(item: any): string {
        return JSON.stringify(item, null, 4);
    }

    public getDocument(item: any): string {
        return JSON.stringify(JSON.parse(item), null, 4);
    }
}

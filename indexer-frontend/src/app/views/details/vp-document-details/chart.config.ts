import { EChartsOption } from "echarts";

export function createChart(data: any[] = [], links: any = []): EChartsOption {
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

export function createChartData(item: any, target: any, index: number, tool: number): any {
    const f = 2 * Math.PI / (tool - 1);
    const r = 1000;
    return {
        // symbol: 'rect',
        symbolSize: [80, 80],
        // symbolSize: 100,
        name: item.id,
        value: item.type,
        // x: index * 100,
        // y: Math.random() * 1000,
        x: item.id === target.id ? 0 : r * Math.cos(index * f),
        y: item.id === target.id ? 0 : r * Math.sin(index * f),
        itemStyle: {
            color: item.id === target.id ? '#cf6c17' : '#556fc3',
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            shadowBlur: 10
        }
    }
}

export function createChartLink(item: any): any {
    return {
        source: item.source,
        target: item.target,
        lineStyle: {
            curveness: 0.2
        },
        tooltip: {
            show: false
        }
    }
}

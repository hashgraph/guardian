import { IRelationshipsResults } from '@services/search.service';
import { EChartsOption } from 'echarts';

export function createChartConfig(
    data: any[] = [],
    links: any = [],
    categories = []
): EChartsOption {
    return {
        title: {
            text: 'Relationships',
        },
        tooltip: {},
        legend: [
            {
                data: categories,
            },
        ],
        animationDurationUpdate: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
            {
                legendHoverLink: false,
                type: 'graph',
                layout: 'none',
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
                    },
                },
                edgeSymbol: ['circle', 'arrow'],
                edgeSymbolSize: [4, 10],
                edgeLabel: {
                    fontSize: 20,
                },
                emphasis: {
                    focus: 'adjacency',
                    lineStyle: {
                        width: 10,
                    },
                },
                data,
                links,
                lineStyle: {
                    color: 'source',
                    curveness: 0.3,
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{c}<br />{b}',
                },
                categories,
            },
        ],
    };
}

export function createChartData(
    item: any,
    target: any,
    index: number,
    count: number
): any {
    const [x, y] = getCoordinates(item.category, index, count);
    return {
        symbolSize: [80, 80],
        name: item.id,
        value: item.name || item.type,
        entityType: item.type,
        x,
        y,
        itemStyle:
            item.id === target.id
                ? {
                      color: '#cf6c17',
                      shadowColor: 'rgba(0, 0, 0, 0.5)',
                      shadowBlur: 10,
                  }
                : undefined,
        category: item.category,
    };
}

function getCoordinates(categoryIndex: number, index: number, count: number) {
    const x = categoryIndex * 300 + (index % 2 === 0 ? 30 : -30);
    const y = index * 200 - (count / 2) * 200;
    return [x, y];
}

export function createChartLink(item: any): any {
    return {
        source: item.source,
        target: item.target,
    };
}

export function createChart(result: IRelationshipsResults | null = null) {
    if (result && result.relationships && result.links) {
        const data = [];
        const relationships = result.relationships.sort((a, b) => {
            return a.id > b.id ? 1 : -1;
        });
        const categoriesLength: any = {};
        const categoriesIndexes: any = {};
        for (let i = 0; i < result.categories.length; i++) {
            categoriesLength[i] = relationships.filter(
                (item: any) => item.category === i
            ).length;
            categoriesIndexes[i] = 0;
        }
        // tslint:disable-next-line:prefer-for-of
        for (let index = 0; index < relationships.length; index++) {
            const item: any = relationships[index];
            data.push(
                createChartData(
                    item,
                    result.target,
                    categoriesIndexes[item.category],
                    categoriesLength[item.category]
                )
            );
            categoriesIndexes[item.category]++;
        }
        const links = [];
        for (const item of result.links) {
            links.push(createChartLink(item));
        }
        return createChartConfig(data, links, result.categories);
    } else {
        return createChartConfig();
    }
}

import { Relationships } from '@indexer/interfaces';
import { EChartsOption } from 'echarts';

export function createChartConfig(
    data: any[] = [],
    links: any = [],
    categories: any[] = []
): EChartsOption {
    const nodes = data.map((n) => {
        const count =
            typeof n.tagsCount === 'number'
                ? n.tagsCount
                : Array.isArray(n.tags)
                    ? n.tags.length
                    : 0;

        if (!count) return n;
        const baseColor = n.itemStyle?.color ?? '#5470C6';

        return {
            ...n,
            symbol: getTagCounterNodeSymbol(baseColor, count),
        };
    });

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
                data: nodes,
                links,
                lineStyle: {
                    color: 'source',
                    curveness: 0.1,
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
    count: number,
    columnOffsetX: number,
    previousCategoryIndex: number | null,
): any {
    const [x, y] = getCoordinates(item.category, index, count, columnOffsetX, previousCategoryIndex);
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
        tagsCount: item.tagsCount,
    };
}

function getTagCounterNodeSymbol(baseColor: string, count: number): string {
    const text = count > 99 ? '99+' : String(count);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="${baseColor}" />
            <rect x="64" y="4" width="32" height="24" rx="12" ry="12"
                    fill="#E53935" stroke="white" stroke-width="1"/>
            <text x="80" y="17"
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="Inter, sans-serif"
            font-size="12"
            font-weight="500"
            fill="#fff">${text}</text>
        </svg>`.trim();
    return `image://data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getCoordinates(categoryIndex: number, index: number, count: number, columnOffsetX: number, previousCategoryIndex: number | null) {
    let x: number;
    let y: number;
    if (count > 5) {
        const column = Math.floor(index / 5);
        const row = index % 5;

        x = categoryIndex * 100 + column * 100;
        columnOffsetX = x;
        
        const totalRows = Math.ceil(count / 3);
        const centerOffset = (totalRows - 1) * 100;
    
        y = row * 200 - centerOffset;
    } else {
        x = columnOffsetX + categoryIndex * 300;
        y = index * 200 - (count / 2) * 200;
    }
    
    if (previousCategoryIndex !== categoryIndex)
        previousCategoryIndex = categoryIndex;

    x += columnOffsetX;
    return [x, y];
}

export function createChartLink(item: any): any {
    return {
        source: item.source,
        target: item.target,
    };
}

export function createChart(result: Relationships | null = null) {
    if (result && result.relationships && result.links) {
        const data = [];
        const relationships = result.relationships.sort((a, b) => {
            return a.id > b.id ? 1 : -1;
        });
        const categoriesLength: any = {};
        const categoriesIndexes: any = {};
        for (let i = 0; i < result.categories!.length; i++) {
            categoriesLength[i] = relationships.filter(
                (item: any) => item.category === i
            ).length;
            categoriesIndexes[i] = 0;
        }

        const sortedRelationships = relationships.sort((a,b) => a.category - b.category)
        
        let columnOffsetX = 0;
        let previousCategoryIndex: number | null = null;
        // tslint:disable-next-line:prefer-for-of
        for (let index = 0; index < sortedRelationships.length; index++) {
            const item: any = sortedRelationships[index];
            data.push(
                createChartData(
                    item,
                    result.target,
                    categoriesIndexes[item.category],
                    categoriesLength[item.category],
                    columnOffsetX,
                    previousCategoryIndex,
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

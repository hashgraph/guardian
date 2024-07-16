import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export const ApiPaginatedRequest = applyDecorators(
    ApiQuery({
        name: 'pageIndex',
        description: 'Page index',
        example: 0
    }),
    ApiQuery({
        name: 'pageSize',
        description: 'Page size',
        example: 10
    }),
    ApiQuery({
        name: 'orderField',
        description: 'Order field',
        example: 'consensusTimestamp'
    }),
    ApiQuery({
        name: 'orderDir',
        description: 'Order direction',
        examples: {
            'ASC': {
                value: 'ASC',
                description: 'Ascending ordering'
            },
            'DESC': {
                value: 'DESC',
                description: 'Descending ordering'
            }
        }
    })
);

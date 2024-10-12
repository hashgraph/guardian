import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export const ApiPaginatedRequest = applyDecorators(
    ApiQuery({
        name: 'pageIndex',
        description: 'Page index',
        example: 0,
        required: false,
        type: 'number',
    }),
    ApiQuery({
        name: 'pageSize',
        description: 'Page size',
        example: 10,
        required: false,
        schema: {
            type: 'number',
            maximum: 100
        }
    }),
    ApiQuery({
        name: 'orderField',
        description: 'Order field',
        example: 'consensusTimestamp',
        required: false,
    }),
    ApiQuery({
        name: 'orderDir',
        description: 'Order direction',
        examples: {
            ASC: {
                value: 'ASC',
                description: 'Ascending ordering',
            },
            DESC: {
                value: 'DESC',
                description: 'Descending ordering',
            },
        },
        required: false,
    })
);

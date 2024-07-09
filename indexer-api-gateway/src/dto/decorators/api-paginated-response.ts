import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PageDTO } from '#dto';

export const ApiPaginatedResponseWithDefinition = (
    description: string,
    def: any
) => {
    return applyDecorators(
        ApiExtraModels(PageDTO),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(PageDTO) },
                    {
                        properties: {
                            items: {
                                type: 'array',
                                items: def,
                            },
                        },
                    },
                ],
            },
        })
    );
};

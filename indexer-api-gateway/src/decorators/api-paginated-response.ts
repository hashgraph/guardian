import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PageDTO } from '#dto';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
    description: string,
    model: TModel,
) => {
    return applyDecorators(
        ApiExtraModels(PageDTO, model),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(PageDTO) },
                    {
                        properties: {
                            items: {
                                type: 'array',
                                items: { $ref: getSchemaPath(model) },
                            },
                        },
                    },
                ],
            },
        })
    );
};

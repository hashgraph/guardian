import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { DetailsDTO } from '#dto';

export const ApiDetailsRawResponse = <
    DType extends Type<DetailsDTO<any, any>>,
    TModel extends Type<any>
>(
    description: string,
    dModel: DType,
    model: TModel
) => {
    return applyDecorators(
        ApiExtraModels(dModel, model),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(dModel) },
                    {
                        properties: {
                            row: {
                                $ref: getSchemaPath(model),
                            },
                        },
                    },
                ],
            },
        })
    );
};

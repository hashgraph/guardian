import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { DetailsDTO, DetailsHistoryDTO, DetailsHistoryActivityDTO } from '#dto';

export const ApiDetailsResponse = <TModel extends Type<any>>(
    description: string,
    model: TModel
) => {
    return applyDecorators(
        ApiExtraModels(DetailsDTO, model),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(DetailsDTO) },
                    {
                        properties: {
                            item: {
                                $ref: getSchemaPath(model),
                            },
                        },
                    },
                ],
            },
        })
    );
};

export const ApiDetailsHistoryResponse = <TModel extends Type<any>>(
    description: string,
    model: TModel
) => {
    return applyDecorators(
        ApiExtraModels(DetailsHistoryDTO, model),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(DetailsHistoryDTO) },
                    {
                        properties: {
                            item: {
                                $ref: getSchemaPath(model),
                            },
                            history: {
                                type: 'array',
                                items: {
                                    $ref: getSchemaPath(model),
                                },
                            },
                        },
                    },
                ],
            },
        })
    );
};

export const ApiDetailsHistoryActivityResponse = <
    TModel extends Type<any>,
    ATModel extends Type<any>
>(
    description: string,
    model: TModel,
    activityModel: ATModel
) => {
    return applyDecorators(
        ApiExtraModels(DetailsHistoryActivityDTO, model, activityModel),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(DetailsHistoryActivityDTO) },
                    {
                        properties: {
                            item: {
                                $ref: getSchemaPath(model),
                            },
                            history: {
                                type: 'array',
                                items: {
                                    $ref: getSchemaPath(model),
                                },
                            },
                            activity: {
                                $ref: getSchemaPath(activityModel),
                            },
                        },
                    },
                ],
            },
        })
    );
};

import {
    Details,
    DetailsActivity,
    DetailsHistory,
    DetailsHistoryActivity,
} from '@indexer/interfaces';
import { MessageDTO } from './message.details.js';
import {
    ApiExtraModels,
    ApiOkResponse,
    ApiProperty,
    getSchemaPath,
} from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';

export class DetailsDTO<T extends MessageDTO> implements Details<T> {
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    id: string;
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid?: string;
    item?: T;
    row?: any;
}

export class DetailsHistoryDTO<T extends MessageDTO>
    extends DetailsDTO<T>
    implements DetailsHistory<T>
{
    history?: T[];
}

export class DetailsActivityDTO<T extends MessageDTO, AT>
    extends DetailsDTO<T>
    implements DetailsActivity<T, AT>
{
    activity?: AT;
}

export class DetailsHistoryActivityDTO<T extends MessageDTO, AT>
    extends DetailsDTO<T>
    implements DetailsHistoryActivity<T, AT>
{
    history?: T[];
    activity?: AT;
}

export const ApiDetailsResponseWithDefinition = (
    description: string,
    def: any
) => {
    return applyDecorators(
        ApiExtraModels(DetailsActivityDTO),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(DetailsActivityDTO) },
                    {
                        properties: {
                            item: def,
                        },
                    },
                ],
            },
        })
    );
};

export const ApiDetailsHistoryResponseWithDefinition = (
    description: string,
    def: any
) => {
    return applyDecorators(
        ApiExtraModels(DetailsActivityDTO),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(DetailsActivityDTO) },
                    {
                        properties: {
                            item: def,
                            history: {
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

export const ApiDetailsActivityResponseWithDefinition = <
    ATModel extends Type<any>
>(
    description: string,
    activity: ATModel,
    def: any
) => {
    return applyDecorators(
        ApiExtraModels(DetailsActivityDTO, activity),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(DetailsActivityDTO) },
                    {
                        properties: {
                            item: def,
                            activity: {
                                $ref: getSchemaPath(activity),
                            },
                        },
                    },
                ],
            },
        })
    );
};

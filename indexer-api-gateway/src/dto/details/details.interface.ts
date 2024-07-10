import {
    Details,
    DetailsActivity,
    DetailsHistory,
    DetailsHistoryActivity,
} from '@indexer/interfaces';
import { MessageDTO } from '../message.dto.js';
import {
    ApiExtraModels,
    ApiOkResponse,
    ApiProperty,
    getSchemaPath,
} from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';
import { RawMessageDTO } from '../raw-message.dto.js';
import { RawNFTDTO } from '../raw-nft.dto.js';
import { TokenDTO } from './token.details.js';
import { NFTDTO } from './nft.details.js';

export class DetailsDTO<
    T extends MessageDTO | TokenDTO | NFTDTO,
    RT = RawMessageDTO
> implements Details<T, RT>
{
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
    row?: RT;
}

export class DetailsHistoryDTO<T extends MessageDTO, RT = RawMessageDTO>
    extends DetailsDTO<T, RT>
    implements DetailsHistory<T, RT>
{
    history?: T[];
}

export class DetailsActivityDTO<T extends MessageDTO, AT, RT = RawMessageDTO>
    extends DetailsDTO<T, RT>
    implements DetailsActivity<T, AT, RT>
{
    activity?: AT;
}

export class DetailsHistoryActivityDTO<
        T extends MessageDTO,
        AT,
        RT = RawMessageDTO
    >
    extends DetailsDTO<T, RT>
    implements DetailsHistoryActivity<T, AT, RT>
{
    history?: T[];
    activity?: AT;
}

export const ApiDetailsResponseWithDefinition = <
    DType extends Type<DetailsDTO<any, any>>,
    RType extends Type<RawMessageDTO | RawNFTDTO>
>(
    dType: DType,
    rType: RType,
    description: string,
    def: any
) => {
    return applyDecorators(
        ApiExtraModels(dType, rType),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(dType) },
                    {
                        properties: {
                            item: def,
                            row: {
                                $ref: getSchemaPath(rType),
                            },
                        },
                    },
                ],
            },
        })
    );
};

export const ApiDetailsHistoryResponseWithDefinition = <
    DType extends Type<DetailsHistoryDTO<any, any>>,
    RType extends Type<RawMessageDTO>
>(
    dType: DType,
    rType: RType,
    description: string,
    def: any
) => {
    return applyDecorators(
        ApiExtraModels(dType, rType),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(dType) },
                    {
                        properties: {
                            item: def,
                            row: {
                                $ref: getSchemaPath(rType),
                            },
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
    DType extends Type<DetailsActivityDTO<any, any, any>>,
    RType extends Type<any>,
    ATModel extends Type<any>
>(
    dType: DType,
    rType: RType,
    description: string,
    activity: ATModel,
    def: any
) => {
    return applyDecorators(
        ApiExtraModels(dType, rType, activity),
        ApiOkResponse({
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(dType) },
                    {
                        properties: {
                            item: def,
                            row: {
                                $ref: getSchemaPath(rType),
                            },
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

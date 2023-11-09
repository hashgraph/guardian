import { ApiProperty } from '@nestjs/swagger';
import {
    ContractType,
    IContract,
    IRetirePool,
    IRetireRequest,
    RetireTokenPool,
    RetireTokenRequest,
    TokenType,
} from '@guardian/interfaces';

export class ContractDTO implements IContract {
    @ApiProperty({ required: true })
    id: string;
    @ApiProperty({ required: true })
    contractId: string;
    @ApiProperty({ required: true })
    description?: string;
    @ApiProperty({ required: true })
    owner: string;
    @ApiProperty({ required: true })
    permissions: number;
    @ApiProperty({ required: true })
    topicId: string;
    @ApiProperty({
        enum: ContractType,
        required: true,
    })
    type: ContractType;
    @ApiProperty()
    syncRequestsDate?: Date;
    @ApiProperty()
    syncPoolsDate?: Date;
    @ApiProperty()
    lastSyncEventTimeStamp?: string;
    @ApiProperty({ required: true })
    wipeContractIds: string[];
}

export class WiperRequestDTO {
    @ApiProperty({ required: true })
    id: string;
    @ApiProperty({ required: true })
    contractId: string;
    @ApiProperty({ required: true })
    user: string;
}

export class RetireRequestDTO implements IRetireRequest {
    @ApiProperty({ required: true })
    id: string;
    @ApiProperty({ required: true })
    contractId: string;
    @ApiProperty({
        required: true,
        type: 'object',
        properties: {
            token: {
                type: 'string',
            },
            count: {
                type: 'number',
            },
            serials: {
                type: 'array',
                items: {
                    type: 'number',
                },
            },
            decimals: {
                type: 'number',
            },
            type: {
                enum: ['non-fungible', 'fungible'],
            },
            tokenSymbol: {
                type: 'string',
            },
        },
    })
    tokens: (RetireTokenRequest & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
    })[];
    @ApiProperty({ required: true })
    tokenIds: string[];
    @ApiProperty({ required: true })
    user: string;
}

export class RetirePoolDTO implements IRetirePool {
    @ApiProperty({ required: true })
    id: string;
    @ApiProperty({ required: true })
    contractId: string;
    @ApiProperty({
        required: true,
        type: 'object',
        properties: {
            token: {
                type: 'string',
            },
            contract: {
                type: 'string',
            },
            count: {
                type: 'number',
            },
            decimals: {
                type: 'number',
            },
            type: {
                enum: ['non-fungible', 'fungible'],
            },
            tokenSymbol: {
                type: 'string',
            },
        },
    })
    tokens: (RetireTokenPool & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
        contract: string;
    })[];
    @ApiProperty({ required: true })
    tokenIds: string[];
    @ApiProperty({ required: true })
    immediately: boolean;
    @ApiProperty({ required: true })
    enabled: boolean = false;
}

export class RetireRequestTokenDTO implements RetireTokenRequest {
    @ApiProperty({ required: true })
    token: string;
    @ApiProperty({ required: true })
    count: number;
    @ApiProperty({ required: true })
    serials: number[];
}

export class RetirePoolTokenDTO implements RetireTokenPool {
    @ApiProperty({ required: true })
    token: string;
    @ApiProperty({ required: true })
    count: number;
}

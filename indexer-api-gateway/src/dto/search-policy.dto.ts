import {
    SearchPolicyBlocks,
    SearchPolicyParams,
    SearchPolicyResult,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SearchPolicyBlocksDTO implements SearchPolicyBlocks {
    @ApiProperty({
        description: 'Hash',
        example: 'DdQweGpEqbWgQUZcQjySQn2qYPd3yACGnSoRXiuLt5or',
    })
    @IsString()
    hash: string;
    @ApiProperty({
        description: 'Hash map',
        type: 'object',
    })
    @IsObject()
    hashMap: any;
    @ApiProperty({
        description: 'Threshold',
        example: 10,
    })
    @IsNumber()
    threshold: number;
}

/**
 * Search policy params
 */
export class SearchPolicyParamsDTO implements SearchPolicyParams {
    @ApiProperty({
        description: 'Text',
    })
    @IsString()
    @IsOptional()
    text?: string;
    @ApiProperty({
        description: 'Mint VC count',
        example: 10,
    })
    @IsNumber()
    @IsOptional()
    minVcCount?: number;
    @ApiProperty({
        description: 'Mint VP count',
        example: 10,
    })
    @IsNumber()
    @IsOptional()
    minVpCount?: number;
    @ApiProperty({
        description: 'Mint tokens count',
        example: 10,
    })
    @IsNumber()
    @IsOptional()
    minTokensCount?: number;
    @ApiProperty({
        description: 'Threshold',
        example: 10,
    })
    @IsNumber()
    @IsOptional()
    threshold?: number;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    @IsString()
    @IsOptional()
    owner?: string;
    @ApiProperty({
        type: SearchPolicyBlocksDTO,
    })
    @Type(() => SearchPolicyBlocksDTO)
    @IsOptional()
    blocks?: SearchPolicyBlocksDTO;
}

/**
 * Search policy result
 */
export class SearchPolicyResultDTO implements SearchPolicyResult {
    @ApiProperty({
        description: 'Type',
        example: 'Global',
    })
    type: 'Global';
    @ApiProperty({
        description: 'Topic identifier',
        example: '0.0.4481265',
    })
    topicId: string;
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Name',
        example: 'Verra REDD',
    })
    name: string;
    @ApiProperty({
        description: 'Description',
        example: 'Verra REDD Policy',
    })
    description: string;
    @ApiProperty({
        description: 'Version',
        example: '1.0.0',
    })
    version: string;
    @ApiProperty({
        description: 'Status',
        example: 'PUBLISH',
    })
    status: 'PUBLISH';
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    messageId: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
    @ApiProperty({
        description: 'Registry identifier',
        example: '1706823227.586179534',
    })
    registryId: string;
    @ApiProperty({
        description: 'VC count',
        example: 10,
    })
    vcCount: number;
    @ApiProperty({
        description: 'VP count',
        example: 10,
    })
    vpCount: number;
    @ApiProperty({
        description: 'Token count',
        example: 10,
    })
    tokensCount: number;
    @ApiProperty({
        description: 'Rate',
        example: 50,
        minimum: 0,
        maximum: 100,
    })
    rate: number;
    @ApiProperty({
        description: 'tags',
        example: ['iRec'],
    })
    tags: string[];
}

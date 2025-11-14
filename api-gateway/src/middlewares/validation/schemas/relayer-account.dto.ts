import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsOptional, IsString } from 'class-validator';

export class RelayerAccountDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'username'
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    parent?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    account?: string;
}

export class NewRelayerAccountDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: 'name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    account?: string;

    @ApiProperty({
        type: 'string',
        required: false,
    })
    @IsOptional()
    @IsString()
    key?: string;
}
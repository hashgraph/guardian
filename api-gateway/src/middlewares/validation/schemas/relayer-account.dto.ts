import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsOptional, IsString } from 'class-validator';

export class RelayerAccountDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Human-readable name of the relayer account',
        required: false,
        example: 'New Test Account'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'Username of the relayer account owner',
        required: false,
        example: 'ExampleUser'
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the relayer account owner',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the parent Standard Registry (for child users)',
        required: false,
        nullable: true,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    parent?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera account ID of the relayer',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    account?: string;

    @ApiProperty({
        type: String,
        description: 'Creation date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    updateDate?: string;
}

export class NewRelayerAccountDTO {
    @ApiProperty({
        type: String,
        description: 'Human-readable name for the new relayer account',
        required: false,
        example: 'My Relayer Account'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera account ID to use as relayer',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    account?: string;

    @ApiProperty({
        type: String,
        description: 'Private key for the Hedera account (stored securely in wallet)',
        required: false,
    })
    @IsOptional()
    @IsString()
    key?: string;
}

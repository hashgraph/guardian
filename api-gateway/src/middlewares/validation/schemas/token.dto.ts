import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class TokenDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    tokenId?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Token name'
    })
    tokenName?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Token symbol'
    })
    tokenSymbol?: string;

    @ApiProperty({
        type: 'string',
        enum: ['fungible', 'non-fungible'],
        required: true,
        example: 'non-fungible'
    })
    tokenType?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: '0'
    })
    initialSupply?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: '0'
    })
    decimals?: string;

    @ApiProperty({
        type: 'boolean',
        description: 'Add Supply key',
        required: true,
        example: true
    })
    changeSupply?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'Add Admin key',
        required: true,
        example: true
    })
    enableAdmin?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'Add Freeze key',
        required: true,
        example: true
    })
    enableFreeze?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'Add KYC key',
        required: true,
        example: true
    })
    enableKYC?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'Add Wipe key',
        required: true,
        example: true
    })
    enableWipe?: boolean;
}

export class TokenInfoDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    id: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    tokenId?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Token name'
    })
    tokenName?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Token symbol'
    })
    tokenSymbol?: string;

    @ApiProperty({
        type: 'string',
        enum: ['fungible', 'non-fungible'],
        required: true,
        example: 'non-fungible'
    })
    tokenType?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: '0'
    })
    decimals?: string;

    @ApiProperty({
        type: 'boolean',
        description: '',
        required: true,
        example: true
    })
    associated: boolean;

    @ApiProperty({
        type: 'boolean',
        description: '',
        required: true,
        example: true
    })
    frozen: boolean;

    @ApiProperty({
        type: 'boolean',
        description: '',
        required: true,
        example: true
    })
    kyc: boolean;

    @ApiProperty({
        type: 'string',
        description: 'User balance',
        required: true,
        example: '0'
    })
    balance: string;

    @ApiProperty({
        type: 'boolean',
        description: 'There is an Admin key',
        required: true,
        example: true
    })
    enableAdmin?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'There is an Freeze key',
        required: true,
        example: true
    })
    enableFreeze?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'There is an KYC key',
        required: true,
        example: true
    })
    enableKYC?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'There is an Wipe key',
        required: true,
        example: true
    })
    enableWipe?: boolean;
}
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateIf } from 'class-validator';
import { Examples } from '../examples.js';

export class TokenDTO {
    @ApiProperty({
        type: String,
        description: 'Hedera token ID (assigned after token creation on Hedera)',
        example: '0.0.6046500'
    })
    tokenId?: string;

    @ApiProperty({
        type: String,
        description: 'Human-readable name of the token',
        required: true,
        example: 'Carbon Credit Token'
    })
    tokenName?: string;

    @ApiProperty({
        type: String,
        description: 'Short ticker symbol for the token',
        required: true,
        example: 'CCT'
    })
    tokenSymbol?: string;

    @ApiProperty({
        type: String,
        description: 'Token type on Hedera',
        enum: ['fungible', 'non-fungible'],
        required: true,
        example: 'fungible'
    })
    tokenType?: string;

    @ApiProperty({
        type: String,
        description: 'Initial supply of the token (set to 0 for mintable tokens)',
        required: true,
        example: '0'
    })
    initialSupply?: string;

    @ApiProperty({
        type: String,
        description: 'Number of decimal places (0 for NFTs, typically 2 for fungible tokens)',
        required: true,
        example: '2'
    })
    decimals?: string;

    @ApiProperty({
        type: Boolean,
        description: 'Enable Supply key — allows minting and burning tokens',
        required: true,
        example: true
    })
    changeSupply?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Enable Admin key — allows managing token properties',
        required: true,
        example: true
    })
    enableAdmin?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Enable Freeze key — allows freezing token transfers for specific accounts',
        required: true,
        example: false
    })
    enableFreeze?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Enable KYC key — allows granting/revoking KYC status for accounts',
        required: true,
        example: true
    })
    enableKYC?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Enable Wipe key — allows wiping token balance from specific accounts',
        required: true,
        example: true
    })
    enableWipe?: boolean;
}

export class TokenInfoDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        required: true,
        example: Examples.DB_ID
    })
    id: string;

    @ApiProperty({
        type: String,
        description: 'Hedera token ID',
        required: true,
        example: '0.0.6046500'
    })
    tokenId?: string;

    @ApiProperty({
        type: String,
        description: 'Human-readable name of the token',
        required: true,
        example: 'Carbon Credit Token'
    })
    tokenName?: string;

    @ApiProperty({
        type: String,
        description: 'Short ticker symbol for the token',
        required: true,
        example: 'CCT'
    })
    tokenSymbol?: string;

    @ApiProperty({
        type: String,
        description: 'Token type on Hedera',
        enum: ['fungible', 'non-fungible'],
        required: true,
        example: 'fungible'
    })
    tokenType?: string;

    @ApiProperty({
        type: String,
        description: 'Number of decimal places',
        required: true,
        example: '2'
    })
    decimals?: string;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the current user is associated with this token',
        required: true,
        example: true
    })
    associated: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the current user\'s account is frozen for this token',
        required: true,
        example: false
    })
    frozen: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the current user has passed KYC for this token',
        required: true,
        example: true
    })
    kyc: boolean;

    @ApiProperty({
        type: String,
        description: 'Current token balance for the user',
        required: true,
        example: '1000.50'
    })
    balance: string;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the token has an Admin key',
        required: true,
        example: true
    })
    enableAdmin?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the token has a Freeze key',
        required: true,
        example: false
    })
    enableFreeze?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the token has a KYC key',
        required: true,
        example: true
    })
    enableKYC?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the token has a Wipe key',
        required: true,
        example: true
    })
    enableWipe?: boolean;
}

export class TransferTokenDTO {
    @ApiProperty({ type: String, description: 'Target Hedera account ID', example: '0.0.12345' })
    @IsString()
    @IsNotEmpty()
    targetAccount: string;

    @ApiProperty({ type: Number, description: 'Amount (FT) or serial count to pick (NFT); must be > 0', required: false, example: 10 })
    @ValidateIf(o => !o.serialNumbers?.length)
    @IsNumber()
    @IsPositive()
    amount?: number;

    @ApiProperty({ type: [Number], description: 'Specific NFT serial numbers to transfer; positive integers', required: false, example: [1, 2, 3] })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    @ArrayMinSize(1)
    serialNumbers?: number[];

    @ApiProperty({ type: String, description: 'Optional transaction memo', required: false })
    @IsOptional()
    @IsString()
    memo?: string;
}

import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { DidDocumentDTO } from './profiles.js';

export class MockUpBlockConfigDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    enable?: boolean;
}

@ApiExtraModels(MockUpBlockConfigDTO)
export class MockUpConfigDTO {
    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    enable?: boolean;

    @ApiProperty({
        type: () => MockUpBlockConfigDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    blocks?: MockUpBlockConfigDTO[];
}

export class MockUpIpfsDataDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    cid?: string;

    @ApiProperty({
        type: 'string',
        required: false,
    })
    @IsOptional()
    @IsString()
    content?: string;
}

export class MockUpTopicTransactionDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'memo'
    })
    @IsOptional()
    @IsString()
    memo?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    // tslint:disable-next-line:variable-name
    payer_account_id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    // tslint:disable-next-line:variable-name
    topic_id?: string;
}

export class MockUpMessageTransactionDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    // tslint:disable-next-line:variable-name
    consensus_timestamp?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'base64'
    })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    // tslint:disable-next-line:variable-name
    payer_account_id?: string;

    @ApiProperty({
        type: 'number',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsNumber()
    // tslint:disable-next-line:variable-name
    sequence_number?: number;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    // tslint:disable-next-line:variable-name
    topic_id?: string;
}

@ApiExtraModels(MockUpTopicTransactionDTO, MockUpMessageTransactionDTO)
export class MockUpTopicDataDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: () => MockUpTopicTransactionDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    topic?: MockUpTopicTransactionDTO;

    @ApiProperty({
        type: () => MockUpMessageTransactionDTO,
        required: false,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    messages?: MockUpMessageTransactionDTO[];
}

export class MockUpTokenDataDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    // tslint:disable-next-line:variable-name
    token_id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    // tslint:disable-next-line:variable-name
    treasury_account_id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Symbol'
    })
    @IsOptional()
    @IsString()
    symbol?: string;

    @ApiProperty({
        type: 'number',
        required: false,
        example: 1
    })
    @IsOptional()
    @IsString()
    decimals?: number;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'FUNGIBLE_COMMON'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    // tslint:disable-next-line:variable-name
    admin_key?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    // tslint:disable-next-line:variable-name
    freeze_key?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    // tslint:disable-next-line:variable-name
    kyc_key?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    // tslint:disable-next-line:variable-name
    supply_key?: boolean;

    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    // tslint:disable-next-line:variable-name
    wipe_key?: boolean;
}

export class MockUpRequestConfigDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: 'GET'
    })
    @IsOptional()
    @IsString()
    method?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'JSON'
    })
    @IsOptional()
    @IsString()
    responseType?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'http://localhost:4200/'
    })
    @IsOptional()
    @IsString()
    url?: string;
}

@ApiExtraModels(MockUpRequestConfigDTO)
export class MockUpApiDataDTO {
    @ApiProperty({
        type: () => MockUpRequestConfigDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    request?: MockUpRequestConfigDTO;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'JSON'
    })
    @IsOptional()
    @IsString()
    response?: string;
}

export class MockUpUserDataDTO {
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
    did?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    hederaAccountId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
    })
    @IsOptional()
    @IsString()
    hederaAccountKey?: string;

    @ApiProperty({
        type: () => DidDocumentDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    document?: DidDocumentDTO;
}

@ApiExtraModels(
    MockUpIpfsDataDTO,
    MockUpTopicDataDTO,
    MockUpTokenDataDTO,
    MockUpApiDataDTO,
    MockUpUserDataDTO
)
export class MockUpDataDTO {
    @ApiProperty({
        type: () => MockUpIpfsDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    ipfs?: MockUpIpfsDataDTO[];

    @ApiProperty({
        type: () => MockUpTopicDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    topics?: MockUpTopicDataDTO[];

    @ApiProperty({
        type: () => MockUpTokenDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    tokens?: MockUpTokenDataDTO[];

    @ApiProperty({
        type: () => MockUpApiDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    api?: MockUpApiDataDTO[];

    @ApiProperty({
        type: () => MockUpUserDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    users?: MockUpUserDataDTO[];
}

export class MockUpApiRequestDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: 'GET'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'http://localhost/'
    })
    @IsOptional()
    @IsString()
    url?: string;

    @ApiProperty({
        type: Object,
        required: false,
    })
    body: any;

    @ApiProperty({
        type: Object,
        required: false,
    })
    headers: any;
}

export class MockUpIpfsRequestDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    cid?: string;
}

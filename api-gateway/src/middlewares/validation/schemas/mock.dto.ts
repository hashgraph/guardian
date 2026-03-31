import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { DidDocumentDTO } from './profiles.js';

export class MockBlockConfigDTO {
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
    enabled?: boolean;
}

@ApiExtraModels(MockBlockConfigDTO)
export class MockConfigDTO {
    @ApiProperty({
        type: Boolean,
        required: false,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiProperty({
        type: () => MockBlockConfigDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    blocks?: MockBlockConfigDTO[];
}

export class MockIpfsDataDTO {
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

export class MockTopicTransactionDTO {
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

export class MockMessageTransactionDTO {
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

@ApiExtraModels(MockTopicTransactionDTO, MockMessageTransactionDTO)
export class MockTopicDataDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: () => MockTopicTransactionDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    topic?: MockTopicTransactionDTO;

    @ApiProperty({
        type: () => MockMessageTransactionDTO,
        required: false,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    messages?: MockMessageTransactionDTO[];
}

export class MockTokenDataDTO {
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

export class MockRequestConfigDTO {
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

@ApiExtraModels(MockRequestConfigDTO)
export class MockApiDataDTO {
    @ApiProperty({
        type: () => MockRequestConfigDTO,
        required: false,
    })
    @IsOptional()
    @IsObject()
    request?: MockRequestConfigDTO;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'JSON'
    })
    @IsOptional()
    @IsString()
    response?: string;
}

export class MockUserDataDTO {
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
    MockIpfsDataDTO,
    MockTopicDataDTO,
    MockTokenDataDTO,
    MockApiDataDTO,
    MockUserDataDTO
)
export class MockDataDTO {
    @ApiProperty({
        type: () => MockIpfsDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    ipfs?: MockIpfsDataDTO[];

    @ApiProperty({
        type: () => MockTopicDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    topics?: MockTopicDataDTO[];

    @ApiProperty({
        type: () => MockTokenDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    tokens?: MockTokenDataDTO[];

    @ApiProperty({
        type: () => MockApiDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    api?: MockApiDataDTO[];

    @ApiProperty({
        type: () => MockUserDataDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    users?: MockUserDataDTO[];
}

export class MockApiRequestDTO {
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

export class MockIpfsRequestDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    cid?: string;
}

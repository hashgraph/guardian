import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ExternalPolicyStatus, PolicyActionStatus, PolicyActionType, RemoteJoinStatus, RemoteParticipantStatus } from '@guardian/interfaces';
import { Examples } from '../examples.js';

export class ExternalPolicyDTO {
    @ApiProperty({
        type: 'string',
        description: 'Policy UUID',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy name',
        example: 'Policy Name'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy description',
        example: 'Policy Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy version',
        example: '1.0.0'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy topic id',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy instance topic id',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    instanceTopicId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy message id',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy tag',
        example: 'Tag'
    })
    @IsOptional()
    @IsString()
    policyTag?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy owner',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        enum: ExternalPolicyStatus,
        example: ExternalPolicyStatus.NEW
    })
    @IsOptional()
    @IsString()
    status?: ExternalPolicyStatus;

    @ApiProperty({
        type: 'string',
        description: 'Username',
        example: 'Username'
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({
        type: 'string',
        description: 'Status of the join request sent to the Main instance',
        enum: RemoteJoinStatus,
        required: false,
        example: RemoteJoinStatus.SENT
    })
    @IsOptional()
    @IsString()
    joinStatus?: RemoteJoinStatus;

    @ApiProperty({
        type: 'string',
        description: 'Why the join request could not be sent',
        required: false
    })
    @IsOptional()
    @IsString()
    joinError?: string;
}

export class RemoteParticipantDTO {
    @ApiProperty({
        type: 'string',
        description: 'Participant ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy message ID',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    policyMessageId?: string;

    @ApiProperty({
        type: 'string',
        description: 'User DID',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiProperty({
        type: 'string',
        description: 'User Hedera account, the payer of the join request',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    hederaAccountId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Join request message ID',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    joinMessageId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Issue time of the join proof',
        example: '2026-01-01T00:00:00.000Z'
    })
    @IsOptional()
    @IsString()
    issued?: string;

    @ApiProperty({
        type: 'string',
        enum: RemoteParticipantStatus,
        example: RemoteParticipantStatus.PENDING
    })
    @IsOptional()
    @IsString()
    status?: RemoteParticipantStatus;
}

export class PolicyRequestDTO {
    @ApiProperty({
        type: 'string',
        description: 'Action UUID',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: 'string',
        description: 'Action type',
        enum: PolicyActionType,
        example: PolicyActionType.ACTION
    })
    @IsOptional()
    @IsString()
    type?: PolicyActionType;

    @ApiProperty({
        type: 'string',
        description: 'Action message id',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Action start message id',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    startMessageId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Action status',
        enum: PolicyActionStatus,
        example: PolicyActionStatus.NEW
    })
    @IsOptional()
    @IsString()
    status?: PolicyActionStatus;

    @ApiProperty({
        type: 'string',
        description: 'Action last status',
        enum: PolicyActionStatus,
        example: PolicyActionStatus.NEW
    })
    @IsOptional()
    @IsString()
    lastStatus?: PolicyActionStatus;

    @ApiProperty({
        type: 'string',
        description: 'Action owner',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    accountId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Message sender',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    sender?: string;

    @ApiProperty({
        type: 'string',
        description: 'Action owner',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        description: 'Action topic id',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'object',
        description: 'Action data',
        additionalProperties: true,
    })
    @IsOptional()
    @IsObject()
    document?: any;

    @ApiProperty({
        type: 'string',
        description: 'Policy UU',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Block tag',
        example: 'Tag'
    })
    @IsOptional()
    @IsString()
    blockTag?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy message id',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    policyMessageId?: string;

    @ApiProperty({
        type: 'boolean',
        description: 'File is loaded',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    loaded?: boolean;
}

export class PolicyRequestCountDTO {
    @ApiProperty({
        type: 'number',
        description: 'Number of requests waiting for the user (per thread)',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    requestsCount?: number;

    @ApiProperty({
        type: 'number',
        description: 'Number of actions waiting for the remote policy (per thread)',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    actionsCount?: number;

    @ApiProperty({
        type: 'number',
        description: 'Number of failed threads',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    failedCount?: number;

    @ApiProperty({
        type: 'number',
        description: 'Number of threads, as the grid lists them',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    threadsCount?: number;

    @ApiProperty({
        type: 'number',
        description: 'Number of recent actions',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    delayCount?: number;

    @ApiProperty({
        type: 'number',
        description: 'Total',
        example: 0
    })
    @IsOptional()
    @IsNumber()
    total?: number;
}
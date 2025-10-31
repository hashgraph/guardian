import {
    MessageAction,
    MessageType,
    Policy,
    PolicyActivity,
    PolicyAnalytics,
    PolicyDetails,
    PolicyOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class PolicyOptionsDTO implements PolicyOptions {
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
        description: 'Topic description',
        example: 'Verra REDD Policy Topic',
    })
    topicDescription: string;
    @ApiProperty({
        description: 'Version',
        example: '1.0.0',
    })
    version: string;
    @ApiProperty({
        description: 'Policy tag',
        example: 'Verra_REDD',
    })
    policyTag: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Policy topic identifier',
        example: '0.0.4481265',
    })
    policyTopicId: string;
    @ApiProperty({
        description: 'Policy instance topic identifier',
        example: '0.0.4481265',
    })
    instanceTopicId: string;
    @ApiProperty({
        description: 'Synchronization topic identifier',
        example: '0.0.4481265',
    })
    synchronizationTopicId: string;
    @ApiProperty({
        description: 'Comments topic identifier',
        example: '0.0.4481265',
    })
    commentsTopicId: string;
    @ApiProperty({
        description: 'Discontinued date',
        example: '2024-02-27T16:32:08.513Z',
    })
    discontinuedDate?: string;
}

export class PolicyAnalyticsDTO implements PolicyAnalytics {
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Tokens',
        example: ['0.0.4481265'],
    })
    tokens: string[];
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
        description: 'Tokens count',
        example: 10,
    })
    tokensCount: number;
    @ApiProperty({
        description: 'Tags',
        example: ['iRec'],
    })
    tags: string[];
    @ApiProperty({
        description: 'Hash',
        example: 'DdQweGpEqbWgQUZcQjySQn2qYPd3yACGnSoRXiuLt5or',
    })
    hash: string;
    @ApiProperty({
        description: 'Hash map',
        type: 'object',
        additionalProperties: true,
    })
    hashMap: any;
    @ApiProperty({
        description: 'Tools',
        example: ['1706823227.586179534'],
    })
    tools: string[];
    @ApiProperty({
        description: 'Registry identifier',
        example: '1706823227.586179534',
    })
    registryId: string;
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class PolicyActivityDTO implements PolicyActivity {
    @ApiProperty({
        description: 'Schemas',
        example: 10,
    })
    schemas: number;
    @ApiProperty({
        description: 'Schemas Packages',
        example: 10,
    })
    schemaPackages: number;
    @ApiProperty({
        description: 'VCs',
        example: 10,
    })
    vcs: number;
    @ApiProperty({
        description: 'VPs',
        example: 10,
    })
    vps: number;
    @ApiProperty({
        description: 'Roles',
        example: 10,
    })
    roles: number;
    @ApiProperty({
        description: 'Formulas',
        example: 10,
    })
    formulas: number;
}

export class PolicyDTO
    extends MessageDTO<PolicyOptionsDTO, PolicyAnalyticsDTO>
    implements Policy
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.POLICY
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.PublishPolicy
    })
    declare action: MessageAction;
    @ApiProperty({
        type: PolicyOptionsDTO,
    })
    declare options: PolicyOptionsDTO;
    @ApiProperty({
        type: PolicyAnalyticsDTO,
    })
    declare analytics?: PolicyAnalyticsDTO;
}

export class PolicyDetailsDTO
    extends DetailsActivityDTO<PolicyDTO, PolicyActivityDTO>
    implements PolicyDetails
{
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;
    @ApiProperty({
        type: PolicyDTO,
    })
    declare item?: PolicyDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: PolicyActivityDTO,
    })
    declare activity?: PolicyActivityDTO;
}

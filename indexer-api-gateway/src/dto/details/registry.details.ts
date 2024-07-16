import {
    MessageAction,
    MessageType,
    Registry,
    RegistryActivity,
    RegistryAnalytics,
    RegistryDetails,
    RegistryOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class RegistryOptionsDTO implements RegistryOptions {
    @ApiProperty({
        description: 'DID',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    did: string;
    @ApiProperty({
        description: 'Registrant topic id',
    })
    registrantTopicId: string;
    @ApiProperty({
        description: 'Lang',
    })
    lang: string;
    @ApiProperty({
        description: 'Attributes',
    })
    attributes: any;
}

export class RegistryAnalyticsDTO implements RegistryAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class RegistryActivityDTO implements RegistryActivity {
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
        description: 'Policies',
        example: 10,
    })
    policies: number;
    @ApiProperty({
        description: 'Roles',
        example: 10,
    })
    roles: number;
    @ApiProperty({
        description: 'Tools',
        example: 10,
    })
    tools: number;
    @ApiProperty({
        description: 'Modules',
        example: 10,
    })
    modules: number;
    @ApiProperty({
        description: 'Tokens',
        example: 10,
    })
    tokens: number;
    @ApiProperty({
        description: 'Registry users',
        example: 10,
    })
    users: number;
}

export class RegistryDTO
    extends MessageDTO<RegistryOptionsDTO, RegistryAnalyticsDTO>
    implements Registry
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.STANDARD_REGISTRY
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.Init
    })
    declare action: MessageAction;
    @ApiProperty({
        type: RegistryOptionsDTO,
    })
    declare options: RegistryOptionsDTO;
    @ApiProperty({
        type: RegistryAnalyticsDTO,
    })
    declare analytics?: RegistryAnalyticsDTO;
}

export class RegistryDetailsDTO
    extends DetailsActivityDTO<RegistryDTO, RegistryActivityDTO>
    implements RegistryDetails
{
    @ApiProperty({
        type: RegistryDTO,
    })
    declare item?: RegistryDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
    @ApiProperty({
        type: RegistryActivityDTO,
    })
    declare activity?: RegistryActivityDTO;
}

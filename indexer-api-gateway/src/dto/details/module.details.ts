import {
    ModuleAnalytics,
    ModuleOptions,
    Module,
    ModuleDetails,
    MessageAction,
    MessageType,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class ModuleOptionsDTO implements ModuleOptions {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Name',
        example: 'Grid module',
    })
    name: string;
    @ApiProperty({
        description: 'Description',
        example: 'Grid module',
    })
    description: string;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
    @ApiProperty({
        description: 'Module topic identifier',
        example: '0.0.4481265',
    })
    moduleTopicId: string;
}

export class ModuleAnalyticsDTO implements ModuleAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;
}

export class ModuleDTO
    extends MessageDTO<ModuleOptionsDTO, ModuleAnalyticsDTO>
    implements Module
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.MODULE
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.PublishModule
    })
    declare action: MessageAction;
    @ApiProperty({
        type: ModuleOptionsDTO,
    })
    declare options: ModuleOptionsDTO;
    @ApiProperty({
        type: ModuleAnalyticsDTO,
    })
    declare analytics?: ModuleAnalyticsDTO;
}

export class ModuleDetailsDTO
    extends DetailsDTO<ModuleDTO>
    implements ModuleDetails
{
    @ApiProperty({
        type: ModuleDTO,
    })
    declare item?: ModuleDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
}

import {
    ContractAnalytics,
    ContractOptions,
    Contract,
    ContractType,
    ContractDetails,
    MessageType,
    MessageAction,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class ContractOptionsDTO implements ContractOptions {
    @ApiProperty({
        description: 'Contract identifier',
        example: '0.0.4481265',
    })
    contractId: string;
    @ApiProperty({
        description: 'Description',
        example: 'Wipe contract',
    })
    description: string;
    @ApiProperty({
        description: 'Contract type',
        enum: ContractType,
    })
    contractType: ContractType;
    @ApiProperty({
        description: 'Owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner: string;
}

export class ContractAnalyticsDTO implements ContractAnalytics {}

export class ContractDTO
    extends MessageDTO<ContractOptionsDTO, ContractAnalyticsDTO>
    implements Contract
{
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.CONTRACT
    })
    declare type: MessageType;
    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.CreateContract
    })
    declare action: MessageAction;
    @ApiProperty({
        type: ContractOptionsDTO,
    })
    declare options: ContractOptionsDTO;
    @ApiProperty({
        type: ContractAnalyticsDTO,
    })
    declare analytics?: ContractAnalyticsDTO;
}

export class ContractDetailsDTO
    extends DetailsDTO<ContractDTO>
    implements ContractDetails
{
    @ApiProperty({
        type: ContractDTO,
    })
    declare item?: ContractDTO;
    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;
}

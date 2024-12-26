import {
    MessageAction,
    MessageType,
    Statistic,
    StatisticActivity,
    StatisticAnalytics,
    StatisticDetails,
    StatisticOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class StatisticOptionsDTO implements StatisticOptions {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;

    @ApiProperty({
        description: 'Name',
        example: 'Label Name',
    })
    name: string;

    @ApiProperty({
        description: 'Description',
        example: 'Label Description',
    })
    description: string;

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
    policyInstanceTopicId: string;
}

export class StatisticAnalyticsDTO implements StatisticAnalytics {
}

export class StatisticActivityDTO implements StatisticActivity {
    @ApiProperty({
        description: 'Schemas',
        example: 10,
    })
    schemas: number;

    @ApiProperty({
        description: 'VCs',
        example: 10,
    })
    vcs: number;
}

export class StatisticDTO
    extends MessageDTO<StatisticOptionsDTO, StatisticAnalyticsDTO>
    implements Statistic {
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.POLICY_LABEL
    })
    declare type: MessageType;

    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.PublishPolicyLabel
    })
    declare action: MessageAction;

    @ApiProperty({
        type: StatisticOptionsDTO,
    })
    declare options: StatisticOptionsDTO;

    @ApiProperty({
        type: StatisticAnalyticsDTO,
    })
    declare analytics?: StatisticAnalyticsDTO;
}

export class StatisticDetailsDTO
    extends DetailsActivityDTO<StatisticDTO, StatisticActivityDTO>
    implements StatisticDetails {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;

    @ApiProperty({
        type: StatisticDTO,
    })
    declare item?: StatisticDTO;

    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;

    @ApiProperty({
        type: StatisticActivityDTO,
    })
    declare activity?: StatisticActivityDTO;
}

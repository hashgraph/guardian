import {
    MessageAction,
    MessageType,
    Formula,
    FormulaActivity,
    FormulaAnalytics,
    FormulaDetails,
    FormulaOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class FormulaOptionsDTO implements FormulaOptions {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;

    @ApiProperty({
        description: 'Name',
        example: 'Formula Name',
    })
    name: string;

    @ApiProperty({
        description: 'Description',
        example: 'Formula Description',
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

export class FormulaAnalyticsDTO implements FormulaAnalytics {
    @ApiProperty({
        description: 'Text search',
    })
    textSearch: string;

    @ApiProperty({
        description: 'Owner',
        example: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    owner?: string;

    @ApiProperty({
        description: 'Formula Config',
        type: 'object',
    })
    config?: any;
}

export class FormulaActivityDTO implements FormulaActivity {
    @ApiProperty({
        description: 'Schemas',
        example: 10,
    })
    schemas: number;

    @ApiProperty({
        description: 'VPs',
        example: 10,
    })
    vps: number;
}

export class FormulaDTO
    extends MessageDTO<FormulaOptionsDTO, FormulaAnalyticsDTO>
    implements Formula {
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
        example: MessageType.FORMULA
    })
    declare type: MessageType;

    @ApiProperty({
        description: 'Action',
        enum: MessageAction,
        example: MessageAction.PublishFormula
    })
    declare action: MessageAction;

    @ApiProperty({
        type: FormulaOptionsDTO,
    })
    declare options: FormulaOptionsDTO;

    @ApiProperty({
        type: FormulaAnalyticsDTO,
    })
    declare analytics?: FormulaAnalyticsDTO;
}

export class FormulaDetailsDTO
    extends DetailsActivityDTO<FormulaDTO, FormulaActivityDTO>
    implements FormulaDetails {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;

    @ApiProperty({
        type: FormulaDTO,
    })
    declare item?: FormulaDTO;

    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;

    @ApiProperty({
        type: FormulaActivityDTO,
    })
    declare activity?: FormulaActivityDTO;
}
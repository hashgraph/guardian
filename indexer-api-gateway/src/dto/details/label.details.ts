import {
    MessageAction,
    MessageType,
    Label,
    LabelActivity,
    LabelAnalytics,
    LabelDetails,
    LabelOptions,
    VPDetails,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO, DetailsHistoryDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';
import { VPDetailsItemDTO } from './vp.details.js';

export class LabelOptionsDTO implements LabelOptions {
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

export class LabelAnalyticsDTO implements LabelAnalytics {
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
        description: 'Label Config',
        type: 'object',
    })
    config?: any;
}

export class LabelActivityDTO implements LabelActivity {
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

export class LabelDTO
    extends MessageDTO<LabelOptionsDTO, LabelAnalyticsDTO>
    implements Label {
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
        type: LabelOptionsDTO,
    })
    declare options: LabelOptionsDTO;

    @ApiProperty({
        type: LabelAnalyticsDTO,
    })
    declare analytics?: LabelAnalyticsDTO;
}

export class LabelDetailsDTO
    extends DetailsActivityDTO<LabelDTO, LabelActivityDTO>
    implements LabelDetails {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;

    @ApiProperty({
        type: LabelDTO,
    })
    declare item?: LabelDTO;

    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;

    @ApiProperty({
        type: LabelActivityDTO,
    })
    declare activity?: LabelActivityDTO;
}

export class LabelDocumentDetailsDTO
    extends DetailsHistoryDTO<VPDetailsItemDTO>
    implements VPDetails {
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    declare uuid?: string;

    @ApiProperty({
        type: VPDetailsItemDTO,
    })
    declare item?: VPDetailsItemDTO;

    @ApiProperty({
        type: RawMessageDTO,
    })
    declare row?: RawMessageDTO;

    @ApiProperty({
        type: [VPDetailsItemDTO],
    })
    declare history?: VPDetailsItemDTO[];

    @ApiProperty({
        type: [VPDetailsItemDTO],
    })
    declare label?: VPDetailsItemDTO;
}
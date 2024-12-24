import {
    MessageAction,
    MessageType,
    Label,
    LabelActivity,
    LabelAnalytics,
    LabelDetails,
    LabelOptions,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from '../message.dto.js';
import { DetailsActivityDTO } from './details.interface.js';
import { RawMessageDTO } from '../raw-message.dto.js';

export class LabelOptionsDTO implements LabelOptions {
}

export class LabelAnalyticsDTO implements LabelAnalytics {
}

export class LabelActivityDTO implements LabelActivity {
}

export class LabelDTO
    extends MessageDTO<LabelOptionsDTO, LabelAnalyticsDTO>
    implements Label
{
}

export class LabelDetailsDTO
    extends DetailsActivityDTO<LabelDTO, LabelActivityDTO>
    implements LabelDetails
{

}

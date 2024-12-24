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
}

export class StatisticAnalyticsDTO implements StatisticAnalytics {
}

export class StatisticActivityDTO implements StatisticActivity {
}

export class StatisticDTO
    extends MessageDTO<StatisticOptionsDTO, StatisticAnalyticsDTO>
    implements Statistic
{
}

export class StatisticDetailsDTO
    extends DetailsActivityDTO<StatisticDTO, StatisticActivityDTO>
    implements StatisticDetails
{

}

import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListQuickFiltersQueryDto {
    @ApiProperty({ enum: ['mainnet', 'testnet'] })
    @IsIn(['mainnet', 'testnet'])
    network: string;

    @ApiProperty({ enum: ['projects', 'methodologies', 'issuances'] })
    @IsIn(['projects', 'methodologies', 'issuances'])
    section: 'projects' | 'methodologies' | 'issuances';
}

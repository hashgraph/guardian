import { IsIn, IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { QuickFilterCriteria } from './quick-filter-criteria.type';

export class CreateQuickFilterDto {
    @ApiProperty({ enum: ['mainnet', 'testnet'] })
    @IsIn(['mainnet', 'testnet'])
    network: string;

    @ApiProperty({ enum: ['projects', 'methodologies', 'issuances'] })
    @IsIn(['projects', 'methodologies', 'issuances'])
    section: 'projects' | 'methodologies' | 'issuances';

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    name: string;

    @IsObject()
    @IsNotEmpty()
    criteria: QuickFilterCriteria;
}

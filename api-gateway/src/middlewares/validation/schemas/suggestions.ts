import { ConfigType } from '@guardian/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SuggestionsInputDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    blockType: string;

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    children?: SuggestionsInputDTO[];
}

export class SuggestionsOutputDTO {
    @ApiProperty()
    @IsString()
    next: string;

    @ApiProperty()
    @IsString()
    nested: string;
}

export class SuggestionsConfigItemDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ enum: ConfigType })
    @IsEnum(ConfigType)
    @IsNotEmpty()
    type: ConfigType;

    @ApiProperty()
    @IsInt()
    index: number;
}

export class SuggestionsConfigDTO {
    @ApiProperty({ type: () => SuggestionsConfigItemDTO })
    @IsArray()
    @Type(() => SuggestionsConfigItemDTO)
    items: SuggestionsConfigItemDTO[];
}

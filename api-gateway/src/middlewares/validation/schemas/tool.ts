import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class ToolDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty()
    @IsString()
    uuid: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsObject()
    config: any;

    @ApiProperty()
    @IsString()
    status: string;

    @ApiProperty()
    @IsString()
    creator: string;

    @ApiProperty()
    @IsString()
    owner: string;

    @ApiProperty()
    @IsString()
    topicId: string;

    @ApiProperty()
    @IsString()
    messageId: string;

    @ApiProperty()
    @IsString()
    codeVersion: string;

    @ApiProperty()
    @IsString()
    createDate: string;
}

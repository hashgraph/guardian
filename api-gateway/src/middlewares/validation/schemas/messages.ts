import { ApiProperty } from '@nestjs/swagger';

export class ExportMessageDTO {
    @ApiProperty({ type: 'string' })
    uuid: string;

    @ApiProperty({ type: 'string' })
    name: string;

    @ApiProperty({ type: 'string' })
    description: string;

    @ApiProperty({ type: 'string' })
    messageId: string;

    @ApiProperty({ type: 'string' })
    owner: string;
}

export class ImportMessageDTO {
    @ApiProperty({ type: 'string' })
    messageId: string;

    @ApiProperty({ type: 'object', nullable: true })
    metadata?: any
}